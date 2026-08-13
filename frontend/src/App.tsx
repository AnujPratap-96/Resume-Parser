import { useState, useCallback } from 'react'
import Landing from './components/Landing'
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

  const scrollToAnalyzer = useCallback(() => {
    document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!jd.trim() || !file) return
    setPhase('loading')
    setError('')
    try {
      const data = await analyzeResume(jd, file)
      setResult(data)
      setPhase('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setPhase('input')
    }
  }, [jd, file])

  const resetAll = useCallback(() => {
    setPhase('input')
    setResult(null)
    setFile(null)
    setJd('')
    setError('')
    scrollToAnalyzer()
  }, [scrollToAnalyzer])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur bg-[#07090f]/80 border-b border-[#6e7bff]/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => { resetAll(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="flex items-center gap-2 font-bold text-white text-lg font-[Space_Grotesk]">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6e7bff] to-[#7b5dff] flex items-center justify-center text-white text-sm shadow-[0_4px_14px_rgba(110,123,255,0.4)]">R</span>
            Resume Matcher
          </button>
          <div className="flex items-center gap-4 text-sm">
            <a href="#how-it-works" className="text-[#91a4bd] hover:text-white transition hidden sm:block">How it works</a>
            <button onClick={scrollToAnalyzer}
                    className="btn-primary px-4 py-1.5 text-sm">
              Analyze
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4">
        {/* Landing sections (hidden after analysis) */}
        {phase !== 'results' && (
          <Landing onGetStarted={scrollToAnalyzer} />
        )}

        {/* Analyzer */}
        <section id="analyzer" className="scroll-mt-20 py-14">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#6e7bff]/30 bg-[#6e7bff]/10 text-[#a5b0ff] text-sm mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6e7bff] animate-pulse" />
              {phase === 'results' ? 'Analysis complete' : 'Try it now'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {phase === 'results' ? 'Your Analysis' : 'Analyze Your Resume'}
            </h2>
            <p className="text-[#91a4bd] mt-3 max-w-xl mx-auto">
              {phase === 'results'
                ? 'Here is your full match report — score, skill gaps, ATS coverage, and tips'
                : 'Paste the job description and drop your resume below. Results in about 15 seconds.'}
            </p>
          </div>

          {phase === 'input' && (
            <div className="grid md:grid-cols-2 gap-6">
              <JobDescriptionInput value={jd} onChange={setJd} />
              <ResumeUploader file={file} onChange={setFile} />
              <div className="md:col-span-2 flex justify-center mt-6">
                <button
                  disabled={!jd.trim() || !file}
                  onClick={handleSubmit}
                  className="btn-primary px-12 py-3.5 text-lg"
                >
                  {!file ? 'Upload a resume to begin' : !jd.trim() ? 'Paste a job description' : 'Analyze Match'}
                </button>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-[#6e7bff] border-t-transparent rounded-full animate-spin" />
              <p className="mt-6 text-[#91a4bd] text-lg">Analyzing resume against job description…</p>
              <p className="mt-2 text-sm text-[#91a4bd]/60">Running 3-step pipeline: JD parse · resume extract · match scoring</p>
            </div>
          )}

          {phase === 'results' && result && (
            <>
              <ResultsDashboard data={result} jobDescription={jd} resumeFile={file} />
              <div className="text-center mt-6">
                <button
                  onClick={resetAll}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Analyze Another Resume
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/40 border border-red-700/50 rounded-xl text-red-200 text-center">
              {error}
            </div>
          )}
        </section>

        {/* Footer (hidden while showing results to reduce noise) */}
        {phase !== 'results' && (
          <footer className="pt-14 pb-4 border-t border-[#6e7bff]/10 mt-4">
            <p className="text-center text-[#91a4bd]/50 text-sm">
              Built with FastAPI, React, and Groq AI
            </p>
          </footer>
        )}
      </main>
    </div>
  )
}
