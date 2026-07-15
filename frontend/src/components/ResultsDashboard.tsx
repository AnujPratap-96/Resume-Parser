import type { AnalysisResponse } from '../api'
import ScoreGauge from './ScoreGauge'

interface Props {
  data: AnalysisResponse
}

export default function ResultsDashboard({ data }: Props) {
  const { match, job, resume } = data

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
          <p className="text-emerald-400 font-semibold mt-3 text-lg">{match.verdict}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="grid md:grid-cols-3 gap-4">
        <SkillCard title="Matched Skills" items={match.skills.matched} color="emerald" />
        <SkillCard title="Missing Skills" items={match.skills.missing} color="red" />
        <SkillCard title="Extra Skills" items={match.skills.extra} color="blue" />
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

      {/* Raw data accordion */}
      <details className="bg-gray-900 rounded-2xl border border-gray-800">
        <summary className="p-4 cursor-pointer text-gray-400 hover:text-white font-medium transition">
          View Full Analysis Data
        </summary>
        <div className="p-4 border-t border-gray-800">
          <pre className="text-xs text-gray-500 overflow-x-auto scrollbar-thin max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </details>
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
          <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-200`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {s}
          </span>
        ))}
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
            <li key={i} className={`text-sm text-gray-300 flex items-start gap-2`}>
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
