import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Svolta',
  description: 'How Svolta collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight text-text mb-4">Privacy Policy</h1>
      <p className="text-text-secondary mb-2">Last updated: 15 March 2025</p>
      <p className="text-text-secondary text-lg mb-12">
        This Privacy Policy explains how Palma Wilson Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your
        personal data when you use Svolta (svolta.app).
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-text-secondary">

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">1. Who We Are</h2>
          <p>Svolta is operated by <strong>Palma Wilson Ltd</strong>, a company registered in England and Wales.</p>
          <p className="mt-2">Data Controller contact: <a href="mailto:ciao@svolta.app" className="text-brand-pink hover:underline">ciao@svolta.app</a></p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">2. Your Photos Are Private</h2>
          <p>
            <strong>Svolta processes all photos entirely within your browser.</strong> Your photos are never uploaded
            to our servers, never stored in the cloud, and never shared with third parties. AI pose detection runs
            locally using MediaPipe. We have no access to the images you work with.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">3. Information We Collect</h2>
          <p>We collect the following data when you create an account or use Svolta:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Account data:</strong> Email address and authentication tokens (via Supabase Auth). If you sign in with Google or Apple, we receive your email and display name from those providers.</li>
            <li><strong>Usage data:</strong> Number of exports per month (used to enforce free plan limits). We do not record what you export or which photos you use.</li>
            <li><strong>Technical data:</strong> IP address, browser type, and device type — collected automatically by our hosting provider (Vercel) for security and performance purposes.</li>
            <li><strong>Payment data:</strong> Billing is handled entirely by Stripe. We never see or store your card details. Stripe may store payment data in accordance with their own privacy policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">4. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and maintain your Svolta account</li>
            <li>To track your monthly export usage and enforce plan limits</li>
            <li>To process subscription payments via Stripe</li>
            <li>To respond to support enquiries</li>
            <li>To improve the service (aggregated, anonymised analytics only)</li>
            <li>To send transactional emails (e.g. magic link sign-in, receipt emails)</li>
          </ul>
          <p className="mt-3">We do not sell your data. We do not use your data for advertising.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">5. Cookies</h2>
          <p>
            We use essential cookies to keep you signed in and maintain your session. We may use analytics cookies to
            understand how Svolta is used in aggregate. See our{' '}
            <a href="/cookie-policy" className="text-brand-pink hover:underline">Cookie Policy</a> for full details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">6. Third-Party Services</h2>
          <p>We use the following third-party services, each with their own privacy policies:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Supabase</strong> — authentication and database (EU data region)</li>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Vercel</strong> — hosting and CDN</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">7. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. If you delete your account, all personal
            data is permanently deleted within 30 days. Export usage records are reset monthly and are not retained
            beyond the current billing period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">8. Your Rights (GDPR)</h2>
          <p>If you are in the UK or EEA, you have the following rights:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Right of access</strong> — request a copy of the data we hold about you</li>
            <li><strong>Right to rectification</strong> — ask us to correct inaccurate data</li>
            <li><strong>Right to erasure</strong> — request deletion of your account and data</li>
            <li><strong>Right to data portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, email <a href="mailto:ciao@svolta.app" className="text-brand-pink hover:underline">ciao@svolta.app</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">9. Children&apos;s Privacy</h2>
          <p>
            Svolta is not intended for children under 13. We do not knowingly collect personal data from children.
            If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes by email or by a
            prominent notice in the app. Continued use of Svolta after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">11. Contact</h2>
          <p>For any privacy-related questions or requests:</p>
          <p className="mt-2">
            <strong>Palma Wilson Ltd</strong><br />
            Email: <a href="mailto:ciao@svolta.app" className="text-brand-pink hover:underline">ciao@svolta.app</a>
          </p>
        </section>

      </div>
    </div>
  );
}
