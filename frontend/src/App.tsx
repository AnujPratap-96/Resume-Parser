import { useState, useCallback } from 'react'
import ResumeUploader from './components/ResumeUploader'
import JobDescriptionInput from './components/JobDescriptionInput'
import ResultsDashboard from './components/ResultsDashboard'
import type { AnalysisResponse } from './api'
import { analyzeResume } from './api'

type Phase = 'input' | 'loading' | 'results'

export default function App() {
  const [phase, setPhase] = useState<Phase>('input')
  const [jd, setJd] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async () => {
    if (!jd.trim() || !file) return
    setPhase('loading')
    setError('')
    try {
      const data = await analyzeResume(jd, file)
      setResult(data)
      setPhase('results')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setPhase('input')
    }
  }, [jd, file])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Resume Matcher
        </h1>
        <p className="text-gray-400 mt-2 text-lg">
          Paste a job description, upload a resume — get an instant match analysis
        </p>
      </header>

      {phase === 'input' && (
        <div className="grid md:grid-cols-2 gap-6">
          <JobDescriptionInput value={jd} onChange={setJd} />
          <ResumeUploader file={file} onChange={setFile} />
          <div className="md:col-span-2 flex justify-center mt-4">
            <button
              disabled={!jd.trim() || !file}
              onClick={handleSubmit}
              className="px-10 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition text-lg"
            >
              Analyze Match
            </button>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-6 text-gray-400 text-lg">Analyzing resume against job description…</p>
        </div>
      )}

      {phase === 'results' && result && (
        <>
          <ResultsDashboard data={result} />
          <div className="text-center mt-6">
            <button
              onClick={() => { setPhase('input'); setResult(null); setFile(null); setJd('') }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Analyze Another
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-200 text-center">
          {error}
        </div>
      )}
    </div>
  )
}
