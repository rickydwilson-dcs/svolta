import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-hero-glow overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 animate-fade-in">
            <span className="status-dot w-4 h-4" />
            <span className="text-sm font-medium text-text-secondary">
              10,000+ coaches trust us
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4 animate-slide-up">
            Perfect{' '}
            <span className="text-instagram-gradient">Before & After</span>
            {' '}Photos
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-text-secondary mb-8 animate-slide-up delay-100">
            AI-powered alignment for fitness coaches.{' '}
            <span className="text-text font-medium">Privacy first</span> — your photos never leave your device.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-slide-up delay-200">
            <Link
              href="/editor"
              className="btn-pill btn-primary w-full sm:w-auto animate-pulse-glow"
            >
              Start Free
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="#how-it-works"
              className="btn-pill btn-ghost w-full sm:w-auto"
            >
              How It Works
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-3 animate-fade-in delay-300">
            <div className="avatar-stack">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink flex items-center justify-center text-xs text-white font-medium"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-brand-orange"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text">4.9</span> from 500+ reviews
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
              Why coaches love PoseProof
            </h2>
            <p className="text-text-secondary">
              Professional results in seconds, not hours. No design skills needed.
            </p>
          </div>

          {/* Responsive Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Feature Card 1 */}
            <div className="card-base p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-orange/20 to-brand-pink/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">AI Alignment</h3>
              <p className="text-sm text-text-secondary">
                Our AI detects body landmarks and automatically aligns photos for perfect side-by-side comparisons.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="card-base p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-purple/20 to-brand-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Privacy First</h3>
              <p className="text-sm text-text-secondary">
                All processing happens in your browser. Photos never leave your device. We can&apos;t see them.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="card-base p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Lightning Fast</h3>
              <p className="text-sm text-text-secondary">
                Create stunning comparisons in under 30 seconds. No signup required to try.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="card-base p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-pink/20 to-brand-orange/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Pro Formats</h3>
              <p className="text-sm text-text-secondary">
                Export in square, portrait, or story format. Perfect for Instagram, TikTok, and client reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-canvas">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
              Three simple steps
            </h2>
            <p className="text-text-secondary">
              From upload to export in under a minute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-instagram-gradient flex items-center justify-center text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Upload Photos</h3>
              <p className="text-sm text-text-secondary">
                Drag & drop or tap to upload your before and after photos. We support all formats.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-instagram-gradient flex items-center justify-center text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Auto Align</h3>
              <p className="text-sm text-text-secondary">
                Our AI detects poses and aligns them automatically. Fine-tune with one-tap adjustments.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-instagram-gradient flex items-center justify-center text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Export & Share</h3>
              <p className="text-sm text-text-secondary">
                Download in your preferred format. Share directly to social media or save to camera roll.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-surface">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
            Start free, upgrade when ready
          </h2>
          <p className="text-text-secondary mb-8">
            Try PoseProof with 5 free exports. Upgrade to Pro for unlimited exports and no watermarks.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan Card */}
            <div className="pricing-card">
              <h3 className="text-xl font-semibold text-text mb-1">Free</h3>
              <div className="price-display mb-4">£0</div>
              <ul className="feature-list text-left mb-6">
                <li>
                  <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>5 exports per month</span>
                </li>
                <li>
                  <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AI alignment</span>
                </li>
                <li>
                  <svg className="x-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-text-tertiary">Watermark on exports</span>
                </li>
              </ul>
              <Link href="/editor" className="btn-pill btn-secondary w-full">
                Try Free
              </Link>
            </div>

            {/* Pro Plan Card */}
            <div className="pricing-card-pro">
              <div className="badge-popular">Most Popular</div>
              <div className="pricing-card-pro-inner">
                <h3 className="text-xl font-semibold text-text mb-1">Pro</h3>
                <div className="flex items-baseline justify-center gap-1 mb-4">
                  <span className="price-display">£7.99</span>
                  <span className="price-period">/month</span>
                </div>
                <ul className="feature-list text-left mb-6">
                  <li>
                    <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited exports</span>
                  </li>
                  <li>
                    <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>No watermarks</span>
                  </li>
                  <li>
                    <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All export formats</span>
                  </li>
                  <li>
                    <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/upgrade" className="btn-pill btn-primary w-full">
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-canvas">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-4">
            Ready to show your clients&apos; progress?
          </h2>
          <p className="text-text-secondary mb-8">
            Join 10,000+ fitness coaches creating professional before/after comparisons.
          </p>
          <Link
            href="/editor"
            className="btn-pill btn-primary px-8 animate-pulse-glow"
          >
            Start Creating — It&apos;s Free
          </Link>
        </div>
      </section>
    </>
  );
}
