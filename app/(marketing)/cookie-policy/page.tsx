import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Svolta',
  description: 'How Svolta uses cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight text-text mb-4">Cookie Policy</h1>
      <p className="text-text-secondary mb-2">Last updated: 15 March 2025</p>
      <p className="text-text-secondary text-lg mb-12">
        This Cookie Policy explains what cookies are, how Svolta (svolta.app) uses them, and how you can manage your
        cookie preferences.
      </p>

      <div className="space-y-10 text-text-secondary">

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They are widely used to make
            websites work correctly, remember your preferences, and provide analytics to site owners.
          </p>
          <p className="mt-2">
            Svolta also uses <strong>localStorage</strong> and <strong>sessionStorage</strong> — browser storage
            mechanisms that work similarly to cookies but are stored locally on your device only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">2. Your Photos</h2>
          <p>
            <strong>Your photos are never stored in cookies or on our servers.</strong> All photo processing happens
            entirely within your browser. Svolta uses your browser&apos;s memory (RAM) temporarily while you work —
            nothing is persisted to disk, cookies, or cloud storage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">3. Cookies We Use</h2>

          <h3 className="font-semibold text-text mt-4 mb-2">Essential Cookies</h3>
          <p>These are required for Svolta to function. They cannot be disabled.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-text">Cookie / Storage key</th>
                  <th className="text-left py-2 pr-4 font-medium text-text">Purpose</th>
                  <th className="text-left py-2 font-medium text-text">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">sb-*</td>
                  <td className="py-2 pr-4">Supabase authentication session (keeps you signed in)</td>
                  <td className="py-2">Session / 1 week</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">theme</td>
                  <td className="py-2 pr-4">Remembers your light/dark mode preference</td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold text-text mt-6 mb-2">Analytics Cookies</h3>
          <p>
            We may use privacy-friendly, aggregated analytics to understand how Svolta is used. If we do, no
            personally identifiable information is collected, and data is not shared with advertising networks.
            We will update this policy if analytics tools are added or changed.
          </p>

          <h3 className="font-semibold text-text mt-6 mb-2">Advertising Cookies</h3>
          <p>
            <strong>We do not use advertising cookies.</strong> Svolta does not serve ads and does not participate
            in ad networks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">4. Third-Party Cookies</h2>
          <p>Some third-party services used by Svolta may set their own cookies:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Stripe</strong> — may set cookies during the payment flow to prevent fraud. These are only active when you visit a checkout page.</li>
            <li><strong>Vercel</strong> — our hosting provider may set performance/security cookies at the network edge.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">5. Managing Cookies</h2>
          <p>You can control and delete cookies through your browser settings:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
            <li><strong>Safari (iOS):</strong> Settings → Safari → Privacy &amp; Security</li>
            <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies</li>
            <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
          </ul>
          <p className="mt-3">
            Note: disabling essential cookies will prevent you from staying signed in to Svolta.
            You can still use the editor without an account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">6. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy as we add or change technologies. The &quot;last updated&quot; date at the top of
            this page will reflect any changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-3">7. Contact</h2>
          <p>
            Questions about cookies? Email{' '}
            <a href="mailto:ciao@svolta.app" className="text-brand-pink hover:underline">ciao@svolta.app</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
