interface Props {
  onGetStarted: () => void
}

const STEPS = [
  {
    title: 'Paste the job description',
    desc: 'Copy the JD from any job portal — LinkedIn, Naukri, company careers page. Any format works.',
  },
  {
    title: 'Upload your resume',
    desc: 'Drop your PDF or DOCX resume. Scanned files and emoji-filled resumes are handled automatically.',
  },
  {
    title: 'Get your match report',
    desc: 'Instant score, skill gap analysis, ATS keyword coverage, and personalized tips. Download as PDF.',
  },
]

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Match score',
    desc: 'Weighted score across skills, experience, and education with a full breakdown.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Skill gap analysis',
    desc: 'See exactly which required and preferred skills your resume is missing.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: 'ATS keyword coverage',
    desc: 'Recruiters use ATS bots. We show you exactly which keywords to add or mention more.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-3-3m3 3l3-3" />
      </svg>
    ),
    title: 'Smart semantic matching',
    desc: 'Node.js = NodeJS, React.js = React. Fuzzy matching catches synonyms and typos.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Personalized tips',
    desc: 'Actionable suggestions ranked by impact — fix your resume, not guess what to change.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: 'PDF report',
    desc: 'Download a clean, formatted match report you can share or keep for your records.',
  },
]

export default function Landing({ onGetStarted }: Props) {
  return (
    <div>
      {/* Hero */}
      <section className="text-center pt-16 pb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#6e7bff]/30 bg-[#6e7bff]/10 text-[#a5b0ff] text-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6e7bff] animate-pulse" />
          AI-powered resume analysis
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">
          Know your match
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6e7bff] to-[#7b5dff]">
            before the interview
          </span>
        </h1>
        <p className="text-[#91a4bd] text-lg mt-5 max-w-2xl mx-auto">
          Paste any job description, upload your resume, and get an instant
          analysis — match score, skill gaps, ATS keywords, and personalized
          advice on how to improve.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="btn-primary px-8 py-3.5 text-lg shadow-[0_8px_30px_rgba(110,123,255,0.4)]"
          >
            Analyze My Resume
          </button>
          <a
            href="#how-it-works"
            className="btn-ghost px-8 py-3.5 text-lg"
          >
            How it works
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 mt-12 text-sm text-[#91a4bd]/70">
          <span><b className="text-[#dcdcec]">3-step</b> analysis pipeline</span>
          <span className="hidden sm:inline text-[#6e7bff]/30">|</span>
          <span><b className="text-[#dcdcec]">2 formats</b> — PDF & DOCX</span>
          <span className="hidden sm:inline text-[#6e7bff]/30">|</span>
          <span><b className="text-[#dcdcec]">~15 sec</b> per analysis</span>
          <span className="hidden sm:inline text-[#6e7bff]/30">|</span>
          <span><b className="text-[#dcdcec]">Free</b> to try</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-14">
        <h2 className="text-center text-3xl font-bold text-white mb-2">How it works</h2>
        <p className="text-center text-[#91a4bd] mb-10">Three steps between you and a better resume</p>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="glass-card glass-hover rounded-2xl p-6 relative">
              <div className="w-10 h-10 rounded-xl bg-[#6e7bff]/15 text-[#a5b0ff] flex items-center justify-center font-bold text-lg mb-4 border border-[#6e7bff]/20">
                {i + 1}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-[#91a4bd] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-14">
        <h2 className="text-center text-3xl font-bold text-white mb-2">What you get</h2>
        <p className="text-center text-[#91a4bd] mb-10">A full recruiter-level evaluation of your resume</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card glass-hover rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-[#6e7bff]/10 text-[#a5b0ff] flex items-center justify-center mb-4 border border-[#6e7bff]/15">
                {f.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-[#91a4bd] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
