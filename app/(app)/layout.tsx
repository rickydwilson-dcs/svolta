import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* App Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <Link href="/editor" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <span className="text-lg font-bold text-white">PP</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              PoseProof
            </span>
          </Link>

          {/* App Navigation - Placeholder */}
          <nav className="flex items-center space-x-1">
            <Link
              href="/editor"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Editor
            </Link>
            <Link
              href="/settings"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Settings
            </Link>
            <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600">
              <span className="text-xs font-semibold text-white">U</span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
