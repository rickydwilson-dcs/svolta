import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help | Svolta',
  description: 'Get help using Svolta — the fitness photo alignment tool.',
};

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight text-text mb-4">Help</h1>
      <p className="text-text-secondary text-lg mb-12">Everything you need to get the most out of Svolta.</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-text mb-4">Getting Started</h2>
          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="font-medium text-text">What photos can I upload?</h3>
              <p>Svolta supports JPEG, PNG, HEIC, and WebP formats. Photos are processed entirely in your browser — nothing is ever uploaded to our servers.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How do I create a before/after comparison?</h3>
              <p>Tap &quot;Create New Comparison&quot; on the home screen or go to the Editor. Upload your before photo on the left and your after photo on the right. Svolta&apos;s AI will automatically detect body poses and suggest alignment.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">What devices are supported?</h3>
              <p>Svolta works in any modern browser on iOS, Android, Mac, and Windows. For the best experience, install it as a PWA from your browser&apos;s share/install menu.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-4">Using the Editor</h2>
          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="font-medium text-text">How does AI alignment work?</h3>
              <p>Svolta uses MediaPipe Pose to detect 33 body landmarks in each photo. It then calculates the optimal scale, position, and rotation to align the two poses — you can fine-tune the result manually using the alignment controls.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Can I adjust the alignment manually?</h3>
              <p>Yes. Use the alignment controls panel to adjust position, scale, and rotation for each photo independently. Pinch-to-zoom and drag gestures are also supported on touch devices.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">What if pose detection doesn&apos;t work?</h3>
              <p>Ensure the full body is visible in the frame, with good lighting and a contrasting background. For best results, use photos taken from the front, back, or side at a consistent distance.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-4">Exporting</h2>
          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="font-medium text-text">What export formats are available?</h3>
              <p>You can export as a side-by-side JPEG or PNG image, or as an animated GIF (with three animation styles: fade, slide, and flash). Animated GIF export is a Pro feature.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">Why does my export have a watermark?</h3>
              <p>Free accounts include a small Svolta watermark on exports and are limited to 5 exports per month. Upgrade to Pro to remove the watermark and unlock unlimited exports.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How many exports do I get on the free plan?</h3>
              <p>Free accounts get 5 exports per calendar month. Your usage resets on the 1st of each month. Your remaining exports are shown on the home screen.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-4">Account &amp; Billing</h2>
          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="font-medium text-text">How do I upgrade to Pro?</h3>
              <p>Go to Settings and tap &quot;Upgrade to Pro&quot;, or look for the upgrade prompt when you reach your export limit. Payment is handled securely by Stripe.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How do I cancel my subscription?</h3>
              <p>Go to Settings → Subscription and tap &quot;Cancel Subscription&quot;. You&apos;ll keep Pro access until the end of your current billing period.</p>
            </div>
            <div>
              <h3 className="font-medium text-text">How do I delete my account?</h3>
              <p>Go to Settings → Account and tap &quot;Delete Account&quot;. This is irreversible and will immediately cancel any active subscription.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text mb-4">Privacy</h2>
          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="font-medium text-text">Are my photos stored anywhere?</h3>
              <p>No. All photo processing — including pose detection and alignment — happens entirely in your browser. Your photos are never sent to our servers. Read our <a href="/privacy" className="text-brand-pink hover:underline">Privacy Policy</a> for full details.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <p className="text-text-secondary">Still need help? <a href="mailto:ciao@svolta.app" className="text-brand-pink hover:underline">Email us at ciao@svolta.app</a> and we&apos;ll get back to you.</p>
        </section>
      </div>
    </div>
  );
}
