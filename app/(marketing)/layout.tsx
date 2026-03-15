import Link from 'next/link';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';
import { MarketingLayoutShell } from '@/components/layout/MarketingLayoutShell';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const footer = (
    <>
      <footer className="py-10 px-4 sm:px-6 bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <SvoltaLogo size={24} mode="dark" showWordmark wordmarkStyle="gradient" />
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/help" className="text-text-secondary hover:text-text transition-colors">Help</Link>
            <Link href="/privacy" className="text-text-secondary hover:text-text transition-colors">Privacy Policy</Link>
            <Link href="/cookie-policy" className="text-text-secondary hover:text-text transition-colors">Cookie Policy</Link>
            <a href="mailto:ciao@svolta.app" className="text-text-secondary hover:text-text transition-colors">Contact</a>
          </nav>
          <p className="text-center text-xs text-text-tertiary">
            © 2025 Palma Wilson Ltd. All rights reserved.{' '}
            | Built by{' '}
            <a
              href="https://www.digitalconsultingservices.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors underline-offset-2 hover:underline"
            >
              Digital Consulting Services
            </a>
          </p>
        </div>
      </footer>
      {/* Spacer so footer content clears the fixed bottom tab bar on mobile */}
      <div className="h-[calc(var(--tab-bar-height,64px)+env(safe-area-inset-bottom,0px))] lg:hidden" />
    </>
  );

  return (
    <MarketingLayoutShell footer={footer}>
      {children}
    </MarketingLayoutShell>
  );
}
