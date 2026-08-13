import { useState } from 'react'
import type { AnalysisResponse } from '../api'
import { downloadReport } from '../api'
import ScoreGauge from './ScoreGauge'

interface Props {
  data: AnalysisResponse
  jobDescription: string
  resumeFile: File | null
}

export default function ResultsDashboard({ data, jobDescription, resumeFile }: Props) {
  const { match, job, resume } = data
  const [downloading, setDownloading] = useState(false)

  const links: { label: string; url: string }[] = []
  if (resume.github) links.push({ label: 'GitHub', url: resume.github })
  if (resume.linkedin) links.push({ label: 'LinkedIn', url: resume.linkedin })

  return (
    <div className="space-y-6">
      {/* Score + Candidate */}
      <div className="flex flex-col md:flex-row items-center gap-6 glass-card rounded-2xl p-6">
        <ScoreGauge score={match.overall_score} />
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-white">
            {match.candidate_name || resume.name || 'Candidate'}
          </h2>
          <p className="text-[#91a4bd] mt-1">{resume.email} {resume.phone ? `· ${resume.phone}` : ''}</p>
          {links.length > 0 && (
            <div className="flex justify-center md:justify-start gap-3 mt-2">
              {links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-[#91a4bd]/70 hover:text-[#a5b0ff] transition underline underline-offset-2">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-[#a5b0ff] font-semibold mt-3 text-lg">{match.verdict}</p>
          {resumeFile && (
            <button
              disabled={downloading}
              onClick={async () => {
                setDownloading(true)
                try {
                  const blob = await downloadReport(jobDescription, resumeFile)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'resume-match-report.pdf'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e: any) {
                  alert(e.message || 'Failed to download report')
                } finally {
                  setDownloading(false)
                }
              }}
              className="btn-primary px-5 py-2 text-sm mt-3"
            >
              {downloading ? 'Generating PDF…' : '⬇ Download PDF Report'}
            </button>
          )}
        </div>
      </div>

      {/* Skills */}
      <div className="grid md:grid-cols-3 gap-4">
        <SkillCard title="Matched Skills" items={match.skills.matched} color="indigo" />
        <SkillCard title="Missing Skills" items={match.skills.missing} color="red" />
        <SkillCard title="Extra Skills" items={match.skills.extra} color="blue" />
      </div>

      {/* Score Breakdown */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          <ScoreBar label="Skills" score={match.score_breakdown.skills} color="bg-[#6e7bff]" />
          <ScoreBar label="Experience" score={match.score_breakdown.experience} color="bg-[#7b5dff]" />
          <ScoreBar label="Education" score={match.score_breakdown.education} color="bg-[#4dd8ff]" />
        </div>
      </div>

      {/* ATS Keyword Coverage */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">ATS Keyword Coverage</h3>
          <span className={`text-xl font-bold ${data.ats.ats_score >= 70 ? 'text-[#a5b0ff]' : data.ats.ats_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {Math.round(data.ats.ats_score)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.ats.keywords.map((k, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
              k.matched
                ? 'bg-[#6e7bff]/10 border-[#6e7bff]/30 text-[#a5b0ff]'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${k.matched ? 'bg-[#6e7bff]' : 'bg-red-400'}`} />
              {k.keyword}
              <span className="text-xs opacity-60">JD {k.jd_count}× / You {k.resume_count}×</span>
            </span>
          ))}
        </div>
        {data.ats.advice.length > 0 && (
          <ul className="space-y-1.5">
            {data.ats.advice.map((a, i) => (
              <li key={i} className="text-sm text-[#91a4bd] flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">→</span> {a}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Semantic matches */}
      {data.semantic.pairs.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-3">Semantic Skill Matches</h3>
          <p className="text-xs text-[#91a4bd]/70 mb-3">Fuzzy-matched skills the strict keyword check may miss</p>
          <div className="flex flex-wrap gap-2">
            {data.semantic.pairs.map((p, i) => (
              <span key={i} className="px-3 py-1.5 bg-[#6e7bff]/10 rounded-lg text-sm text-[#dcdcec]">
                {p.jd_skill} <span className="text-[#a5b0ff]">≈</span> {p.matched_skill}
                <span className="text-[#91a4bd]/70 text-xs ml-1">({Math.round(p.similarity)}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience + Education */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-3">Experience Check</h3>
          <div className="space-y-2 text-sm">
            <Row label="Required" value={match.experience.required_years ? `${match.experience.required_years}+ years` : 'Not specified'} />
            <Row label="Candidate has" value={match.experience.candidate_years ? `${match.experience.candidate_years} years` : 'Unknown'} />
            <Row label="Requirement met" value={match.experience.met ? 'Yes' : 'No'} valueClass={match.experience.met ? 'text-[#a5b0ff]' : 'text-red-400'} />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-3">Education Match</h3>
          {match.education_match.length > 0 ? (
            <ul className="space-y-1">
              {match.education_match.map((e, i) => (
                <li key={i} className="text-sm text-[#c3cde8] flex items-start gap-2">
                  <span className="text-[#6e7bff] mt-0.5">•</span> {e}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#91a4bd]/70 text-sm">No matching education found</p>
          )}
        </div>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        <BulletCard title="Strengths" items={match.strengths} color="indigo" />
        <BulletCard title="Areas to Improve" items={match.weaknesses} color="red" />
      </div>

      {/* Improvement Tips */}
      {match.improvement_tips.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">How to Improve Your Match</h3>
          <div className="space-y-3">
            {match.improvement_tips.map((tip, i) => {
              const impactColor = tip.impact === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : tip.impact === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#6e7bff]/5 rounded-xl">
                  <div className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${impactColor}`}>
                    {tip.impact}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#dcdcec]">{tip.area}</p>
                    <p className="text-sm text-[#91a4bd] mt-0.5">{tip.suggestion}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Parsed resume details */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#6e7bff]/15 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Parsed Resume Details</h3>
          <span className="text-xs text-[#91a4bd]/70">Extracted by AI</span>
        </div>

        {/* Experience Timeline */}
        {resume.experiences.length > 0 && (
          <div className="p-4 border-b border-[#6e7bff]/15">
            <h4 className="text-sm font-semibold text-[#91a4bd] uppercase tracking-wider mb-4">Experience</h4>
            <div className="space-y-5">
              {resume.experiences.map((exp, i) => (
                <div key={i} className="relative pl-5 border-l-2 border-[#6e7bff]/15">
                  <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-[#6e7bff]" />
                  <p className="text-white font-medium">{exp.role || 'Role'}</p>
                  <p className="text-[#91a4bd] text-sm">{exp.company}{exp.duration ? ` · ${exp.duration}` : ''}</p>
                  {exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="text-sm text-[#91a4bd] flex items-start gap-1.5">
                          <span className="text-[#6e7bff] mt-1 shrink-0">▸</span> {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.skills_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.skills_used.map((s, j) => (
                        <span key={j} className="px-2 py-0.5 bg-[#6e7bff]/10 text-[#c3cde8] rounded text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {resume.projects.length > 0 && (
          <div className="p-4 border-b border-[#6e7bff]/15">
            <h4 className="text-sm font-semibold text-[#91a4bd] uppercase tracking-wider mb-3">Projects</h4>
            <div className="flex flex-wrap gap-2">
              {resume.projects.map((p, i) => (
                <span key={i} className="px-3 py-1.5 bg-[#6e7bff]/10 text-[#dcdcec] rounded-lg text-sm">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <div className="p-4 border-b border-[#6e7bff]/15">
            <h4 className="text-sm font-semibold text-[#91a4bd] uppercase tracking-wider mb-3">Education</h4>
            <ul className="space-y-1.5">
              {resume.education.map((e, i) => (
                <li key={i} className="text-sm text-[#c3cde8] flex items-start gap-2">
              <span className="text-[#6e7bff] mt-0.5">•</span> {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Certifications */}
        {resume.certifications.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-semibold text-[#91a4bd] uppercase tracking-wider mb-3">Certifications</h4>
            <ul className="space-y-1.5">
              {resume.certifications.map((c, i) => (
                <li key={i} className="text-sm text-[#c3cde8] flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">⊛</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function SkillCard({ title, items, color }: { title: string; items: string[]; color: 'indigo' | 'red' | 'blue' }) {
  const dot = { indigo: 'bg-[#6e7bff]', red: 'bg-red-500', blue: 'bg-[#4dd8ff]' }[color]
  if (items.length === 0) return null
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-[#91a4bd] mb-3 uppercase tracking-wider">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-[#6e7bff]/10 text-[#dcdcec]">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#91a4bd]">{label}</span>
        <span className="text-[#dcdcec] font-medium">{Math.round(score)}%</span>
      </div>
      <div className="h-2 bg-[#6e7bff]/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
             style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#91a4bd]">{label}</span>
      <span className={valueClass || 'text-[#dcdcec]'}>{value}</span>
    </div>
  )
}

function BulletCard({ title, items, color }: { title: string; items: string[]; color: 'indigo' | 'red' }) {
  const dot = { indigo: 'text-[#6e7bff]', red: 'text-red-400' }[color]
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((s, i) => (
            <li key={i} className="text-sm text-[#c3cde8] flex items-start gap-2">
              <span className={`${dot} mt-0.5`}>•</span> {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#91a4bd]/70 text-sm">None identified</p>
      )}
    </div>
  )
}

