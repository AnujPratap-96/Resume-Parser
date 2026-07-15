import { useRef, useState } from 'react'

interface Props {
  file: File | null
  onChange: (f: File | null) => void
}

export default function ResumeUploader({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.pdf') || f.name.endsWith('.docx'))) {
      onChange(f)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Resume (PDF or DOCX)
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          dragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : file
              ? 'border-emerald-600 bg-emerald-600/10'
              : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        {file ? (
          <div className="text-emerald-400 font-medium">{file.name}</div>
        ) : (
          <div className="text-gray-400">
            <p className="text-lg mb-1">Drop your resume here</p>
            <p className="text-sm">or click to browse</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <button
          onClick={() => onChange(null)}
          className="mt-2 text-sm text-gray-500 hover:text-red-400 transition"
        >
          Remove
        </button>
      )}
    </div>
  )
}
