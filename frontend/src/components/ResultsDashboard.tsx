import type { AnalysisResponse } from '../api'
import ScoreGauge from './ScoreGauge'

interface Props {
  data: AnalysisResponse
}

export default function ResultsDashboard({ data }: Props) {
  const { match, job, resume } = data

  const links: { label: string; url: string }[] = []
  if (resume.github) links.push({ label: 'GitHub', url: resume.github })
  if (resume.linkedin) links.push({ label: 'LinkedIn', url: resume.linkedin })

  return (
    <div className="space-y-6">
      {/* Score + Candidate */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <ScoreGauge score={match.overall_score} />
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-white">
            {match.candidate_name || resume.name || 'Candidate'}
          </h2>
          <p className="text-gray-400 mt-1">{resume.email} {resume.phone ? `· ${resume.phone}` : ''}</p>
          {links.length > 0 && (
            <div className="flex justify-center md:justify-start gap-3 mt-2">
              {links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-gray-500 hover:text-emerald-400 transition underline underline-offset-2">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-emerald-400 font-semibold mt-3 text-lg">{match.verdict}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="grid md:grid-cols-3 gap-4">
        <SkillCard title="Matched Skills" items={match.skills.matched} color="emerald" />
        <SkillCard title="Missing Skills" items={match.skills.missing} color="red" />
        <SkillCard title="Extra Skills" items={match.skills.extra} color="blue" />
      </div>

      {/* Score Breakdown */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          <ScoreBar label="Skills" score={match.score_breakdown.skills} color="bg-blue-500" />
          <ScoreBar label="Experience" score={match.score_breakdown.experience} color="bg-emerald-500" />
          <ScoreBar label="Education" score={match.score_breakdown.education} color="bg-purple-500" />
        </div>
      </div>

      {/* Experience + Education */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-3">Experience Check</h3>
          <div className="space-y-2 text-sm">
            <Row label="Required" value={match.experience.required_years ? `${match.experience.required_years}+ years` : 'Not specified'} />
            <Row label="Candidate has" value={match.experience.candidate_years ? `${match.experience.candidate_years} years` : 'Unknown'} />
            <Row label="Requirement met" value={match.experience.met ? 'Yes' : 'No'} valueClass={match.experience.met ? 'text-emerald-400' : 'text-red-400'} />
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-3">Education Match</h3>
          {match.education_match.length > 0 ? (
            <ul className="space-y-1">
              {match.education_match.map((e, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span> {e}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No matching education found</p>
          )}
        </div>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        <BulletCard title="Strengths" items={match.strengths} color="emerald" />
        <BulletCard title="Areas to Improve" items={match.weaknesses} color="red" />
      </div>

      {/* Improvement Tips */}
      {match.improvement_tips.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">How to Improve Your Match</h3>
          <div className="space-y-3">
            {match.improvement_tips.map((tip, i) => {
              const impactColor = tip.impact === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : tip.impact === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <div className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${impactColor}`}>
                    {tip.impact}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{tip.area}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{tip.suggestion}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Parsed resume details */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Parsed Resume Details</h3>
          <span className="text-xs text-gray-500">Extracted by AI</span>
        </div>

        {/* Experience Timeline */}
        {resume.experiences.length > 0 && (
          <div className="p-4 border-b border-gray-800">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Experience</h4>
            <div className="space-y-5">
              {resume.experiences.map((exp, i) => (
                <div key={i} className="relative pl-5 border-l-2 border-gray-700">
                  <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <p className="text-white font-medium">{exp.role || 'Role'}</p>
                  <p className="text-gray-400 text-sm">{exp.company}{exp.duration ? ` · ${exp.duration}` : ''}</p>
                  {exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="text-sm text-gray-400 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-1 shrink-0">▸</span> {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.skills_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.skills_used.map((s, j) => (
                        <span key={j} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs">{s}</span>
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
          <div className="p-4 border-b border-gray-800">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Projects</h4>
            <div className="flex flex-wrap gap-2">
              {resume.projects.map((p, i) => (
                <span key={i} className="px-3 py-1.5 bg-gray-800 text-gray-200 rounded-lg text-sm">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <div className="p-4 border-b border-gray-800">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Education</h4>
            <ul className="space-y-1.5">
              {resume.education.map((e, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span> {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Certifications */}
        {resume.certifications.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Certifications</h4>
            <ul className="space-y-1.5">
              {resume.certifications.map((c, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
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

function SkillCard({ title, items, color }: { title: string; items: string[]; color: 'emerald' | 'red' | 'blue' }) {
  const dot = { emerald: 'bg-emerald-500', red: 'bg-red-500', blue: 'bg-blue-500' }[color]
  if (items.length === 0) return null
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-200">
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
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200 font-medium">{Math.round(score)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
             style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={valueClass || 'text-gray-200'}>{value}</span>
    </div>
  )
}

function BulletCard({ title, items, color }: { title: string; items: string[]; color: 'emerald' | 'red' }) {
  const dot = { emerald: 'text-emerald-400', red: 'text-red-400' }[color]
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((s, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className={`${dot} mt-0.5`}>•</span> {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">None identified</p>
      )}
    </div>
  )
}
