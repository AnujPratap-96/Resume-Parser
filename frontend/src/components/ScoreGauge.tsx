interface Props {
  score: number
}

export default function ScoreGauge({ score }: Props) {
  const r = 60
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' :
    '#ef4444'

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="150" height="150" className="transform -rotate-90">
        <circle cx="75" cy="75" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="75" cy="75" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-3xl font-bold -mt-24" style={{ color }}>
        {Math.round(score)}%
      </span>
      <span className="text-sm text-gray-400 mt-1">Match Score</span>
    </div>
  )
}
