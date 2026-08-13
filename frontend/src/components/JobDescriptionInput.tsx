interface Props {
  value: string
  onChange: (v: string) => void
}

export default function JobDescriptionInput({ value, onChange }: Props) {
  return (
    <div className="glass-card glass-hover rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-[#eef2f8] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6e7bff] shadow-[0_0_8px_rgba(110,123,255,0.8)]" />
          Job Description
        </label>
        <span className="text-xs text-[#91a4bd]">
          {value.length.toLocaleString()} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here — LinkedIn, Naukri, company careers page…"
        rows={14}
        className="w-full flex-1 input-glow text-[#eef2f8] rounded-xl p-4 text-sm resize-none placeholder:text-[#91a4bd]/60"
      />
    </div>
  )
}
