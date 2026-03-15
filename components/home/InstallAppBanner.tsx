'use client';

import { useIsStandalone } from '@/lib/hooks/useStandaloneDetect';

export function InstallAppBanner() {
  const isStandalone = useIsStandalone();

  if (isStandalone) return null;

  return (
    <section className="hidden lg:block py-12 px-4 sm:px-6 bg-canvas">
      <div className="max-w-3xl mx-auto">
        <div className="card-base p-8 text-center relative overflow-hidden">
          {/* Subtle gradient accent at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-orange via-brand-pink to-brand-purple" />

          {/* Phone icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-pink/20 to-brand-purple/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-text mb-2">
            Get svolta on your phone
          </h3>
          <p className="text-text-secondary mb-4 max-w-md mx-auto">
            Visit <span className="font-medium text-text">svolta.app</span> on your iPhone and tap
            Share → <span className="font-medium text-text">Add to Home Screen</span> for the full app experience.
          </p>
        </div>
      </div>
    </section>
  );
}
