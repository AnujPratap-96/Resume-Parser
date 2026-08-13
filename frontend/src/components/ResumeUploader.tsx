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

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="glass-card glass-hover rounded-2xl p-5 flex flex-col">
      <label className="text-sm font-semibold text-[#eef2f8] mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7b5dff] shadow-[0_0_8px_rgba(123,93,255,0.8)]" />
        Resume (PDF or DOCX)
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition min-h-[200px] ${
          dragging
            ? 'border-[#6e7bff] bg-[#6e7bff]/10 shadow-[0_0_28px_rgba(110,123,255,0.25)]'
            : file
              ? 'border-[#6e7bff]/60 bg-[#6e7bff]/5'
              : 'border-[#91a4bd]/25 hover:border-[#6e7bff]/50 hover:bg-[#6e7bff]/5'
        }`}
      >
        {file ? (
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#6e7bff]/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#6e7bff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#eef2f8] font-medium break-all">{file.name}</p>
            <p className="text-xs text-[#6e7bff] mt-1">{fmtSize(file.size)} · click to replace</p>
          </div>
        ) : (
          <div className="text-[#91a4bd]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#6e7bff]/10 border border-[#6e7bff]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#6e7bff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="font-medium text-[#dcdcec]">Drop your resume here</p>
            <p className="text-sm mt-1">or click to browse · PDF / DOCX · max 5 MB</p>
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
          className="mt-2 text-sm text-[#91a4bd] hover:text-[#f87171] transition self-start"
        >
          Remove
        </button>
      )}
    </div>
  )
}
