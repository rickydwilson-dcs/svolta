import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Svolta',
  description: 'Get in touch with the Svolta team.',
};

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text mb-4">Get in Touch</h1>
      <p className="text-text-secondary text-lg mb-10">
        Have a question, feedback, or just want to say hello? We&apos;d love to hear from you.
      </p>
      <a
        href="mailto:ciao@svolta.app"
        className="inline-flex items-center justify-center h-12 px-8 text-base font-medium rounded-full btn-pill btn-primary transition-all"
      >
        Email Us at ciao@svolta.app
      </a>
      <p className="text-text-tertiary text-sm mt-8">We typically respond within 1–2 business days.</p>
    </div>
  );
}
