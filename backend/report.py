from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from models import AnalysisResponse

EMERALD = colors.HexColor("#10b981")
DARK = colors.HexColor("#111827")
GRAY = colors.HexColor("#4b5563")
LIGHT = colors.HexColor("#f3f4f6")

# Helvetica (built-in) is Latin-1 only — replace glyphs it cannot render
# so emoji, symbols and currency marks never produce broken boxes.
_REPLACEMENTS = {
    "—": "-", "–": "-", "·": ".", "•": "-", "≈": "~", "≈": "~",
    "₹": "Rs. ", "✓": "yes", "✗": "no", "→": "->", "▸": "-",
    "●": "-", "—": "-", "½": "1/2", "¼": "1/4", "¾": "3/4",
}


def _pdf_safe(text) -> str:
    if text is None:
        return ""
    s = str(text)
    for bad, good in _REPLACEMENTS.items():
        s = s.replace(bad, good)
    return s.encode("latin-1", "replace").decode("latin-1")


def _score_color(score: float) -> str:
    if score >= 80:
        return "#10b981"
    if score >= 60:
        return "#f59e0b"
    if score >= 40:
        return "#f97316"
    return "#ef4444"


def build_report_pdf(response: AnalysisResponse) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleX", parent=styles["Title"], fontSize=22, textColor=DARK, spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "SubX", parent=styles["Normal"], fontSize=10, textColor=GRAY, spaceAfter=10
    )
    h2_style = ParagraphStyle(
        "H2X", parent=styles["Heading2"], fontSize=13, textColor=DARK, spaceBefore=12, spaceAfter=6
    )
    body = styles["BodyText"]
    body.fontSize = 9.5
    body.textColor = DARK

    story: list = []
    m, r, j = response.match, response.resume, response.job

    # Header
    story.append(Paragraph(f"Match Report - {_pdf_safe(m.candidate_name or r.name or 'Candidate')}", title_style))
    story.append(Paragraph(
        f"Target role: {_pdf_safe(j.role)} | Generated {__import__('datetime').date.today().isoformat()}",
        subtitle_style,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=EMERALD))

    # Overall score
    big = ParagraphStyle(
        "Big", parent=styles["Heading1"],
        fontSize=34, textColor=_score_color(m.overall_score),
        alignment=TA_CENTER, spaceBefore=10, spaceAfter=2,
    )
    story.append(Paragraph(f"{round(m.overall_score)}%", big))
    story.append(Paragraph(
        f"<b>Overall match score</b> - {_pdf_safe(m.verdict)}",
        ParagraphStyle("Verdict", parent=styles["Normal"], alignment=TA_CENTER, fontSize=11, spaceAfter=8),
    ))

    # Score breakdown
    story.append(Paragraph("Score Breakdown", h2_style))
    breakdown = Table(
        [
            ["Criteria", "Score"],
            [f"Skills  ({m.score_breakdown.skills:.0f}%)", ""],
            [f"Experience  ({m.score_breakdown.experience:.0f}%)", ""],
            [f"Education  ({m.score_breakdown.education:.0f}%)", ""],
        ],
        colWidths=[110 * mm, 20 * mm],
    )
    breakdown.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(breakdown)
    story.append(Spacer(1, 4))

    # Skills
    story.append(Paragraph("Skills Match", h2_style))
    if m.skills.matched:
        story.append(Paragraph(f"<b>Matched:</b> {_pdf_safe(', '.join(m.skills.matched))}", body))
    if m.skills.missing:
        story.append(Paragraph(f"<font color='#dc2626'><b>Missing:</b></font> {_pdf_safe(', '.join(m.skills.missing))}", body))
    if m.skills.extra:
        story.append(Paragraph(f"<b>Extra:</b> {_pdf_safe(', '.join(m.skills.extra))}", body))

    # ATS
    story.append(Paragraph(f"ATS Keyword Coverage - {round(response.ats.ats_score)}%", h2_style))
    if response.ats.advice:
        for line in response.ats.advice:
            story.append(Paragraph(f"- {_pdf_safe(line)}", body))
    else:
        story.append(Paragraph("No ATS keyword gaps detected.", body))

    # Semantic
    if response.semantic.pairs:
        story.append(Paragraph("Semantic Skill Matches", h2_style))
        for pair in response.semantic.pairs:
            story.append(Paragraph(
                f"- <b>{_pdf_safe(pair.jd_skill)}</b> ~ {_pdf_safe(pair.matched_skill)} ({pair.similarity:.0f}% similarity)",
                body,
            ))

    # Experience
    story.append(Paragraph("Experience Check", h2_style))
    story.append(Paragraph(
        f"Required: {m.experience.required_years or 'N/A'} yrs | "
        f"Candidate: {m.experience.candidate_years or 'N/A'} yrs | "
        f"<b>{'Met' if m.experience.met else 'Not met'}</b>",
        body,
    ))

    # Strengths / weaknesses
    story.append(Paragraph("Strengths", h2_style))
    for s in m.strengths:
        story.append(Paragraph(f"- {_pdf_safe(s)}", body))
    story.append(Paragraph("Areas to Improve", h2_style))
    for s in m.weaknesses:
        story.append(Paragraph(f"- {_pdf_safe(s)}", body))

    # Improvement tips
    if m.improvement_tips:
        story.append(Paragraph("Actionable Tips", h2_style))
        for tip in m.improvement_tips:
            story.append(Paragraph(
                f"- <b>[{_pdf_safe(tip.impact)}]</b> {_pdf_safe(tip.area)}: {_pdf_safe(tip.suggestion)}", body,
            ))

    doc.build(story)
    return buffer.getvalue()