interface Props {
  value: string
  onChange: (v: string) => void
}

export default function JobDescriptionInput({ value, onChange }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Job Description
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here…"
        rows={14}
        className="w-full bg-gray-800 text-gray-100 rounded-xl p-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
      />
    </div>
  )
}
