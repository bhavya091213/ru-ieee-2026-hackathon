interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-in w-full max-w-lg text-center">
        <div className="mb-8">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600">
            PanelForge
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          AI Focus Groups,
          <br />
          <span className="text-blue-600">Instantly.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-gray-500">
          Enter a product. Get synthetic consumer personas, evidence-grounded
          reactions, and an actionable dashboard in minutes.
        </p>

        <button
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
          onClick={onStart}
          type="button"
        >
          Start New Study
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mx-auto mt-12 grid max-w-sm grid-cols-3 gap-6 text-center text-sm text-gray-400">
          <div>
            <p className="text-2xl font-bold text-gray-900">5+</p>
            <p className="mt-1">Personas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">50+</p>
            <p className="mt-1">Evidence</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">2</p>
            <p className="mt-1">Rounds</p>
          </div>
        </div>
      </div>
    </main>
  );
}
