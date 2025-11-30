import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center py-20">
      <div className="text-center">
        <h1 className="mb-6 text-7xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Proof of Progress
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl text-zinc-600 dark:text-zinc-400">
          Create professional before/after fitness photo comparisons with perfect
          alignment using AI pose detection. Your photos never leave your device.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/editor"
            className="rounded-xl bg-zinc-900 px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Try Free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 px-8 py-4 text-lg font-semibold text-zinc-900 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-white dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-32 grid gap-8 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
            Perfect Alignment
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            AI-powered pose detection automatically aligns your before and after
            photos for professional comparisons.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
            Privacy First
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            All processing happens in your browser. Your photos never leave your
            device.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
            Fast & Easy
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            Create stunning comparisons in seconds. No signup required to try.
          </p>
        </div>
      </div>
    </div>
  );
}
