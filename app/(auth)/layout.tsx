import Link from 'next/link';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Minimal Header */}
      <header className="w-full py-6">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <SvoltaLogo size={32} mode="dark" showWordmark wordmarkStyle="gradient" />
          </Link>
        </div>
      </header>

      {/* Centered Card Content */}
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="card-base p-6 sm:p-8 w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Decorative Background Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -left-4 top-1/4 h-72 w-72 rounded-full bg-brand-pink/5 blur-3xl" />
        <div className="absolute -right-4 bottom-1/4 h-72 w-72 rounded-full bg-brand-purple/5 blur-3xl" />
      </div>
    </div>
  );
}
