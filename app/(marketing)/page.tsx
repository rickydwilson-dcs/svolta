import type { Metadata } from 'next';
import { MarketingPageContent } from '@/components/home/MarketingPageContent';

export const metadata: Metadata = {
  title: 'svolta — Perfect Before & After Photos for Fitness Coaches',
  description:
    'AI-powered photo alignment for fitness coaches. Create professional before and after comparisons in seconds. Privacy first — photos never leave your device.',
  alternates: {
    canonical: 'https://www.svolta.app',
  },
  openGraph: {
    title: 'svolta — Perfect Before & After Photos for Fitness Coaches',
    description:
      'AI-powered photo alignment for fitness coaches. Create professional before and after comparisons in seconds.',
    url: 'https://www.svolta.app',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'svolta',
            url: 'https://www.svolta.app',
            description: 'Professional before/after fitness photo alignment using AI pose detection.',
            applicationCategory: 'PhotographyApplication',
            operatingSystem: 'Web',
            offers: [
              { '@type': 'Offer', price: '0', priceCurrency: 'GBP', name: 'Free', description: '5 exports per month with watermark' },
              { '@type': 'Offer', price: '7.99', priceCurrency: 'GBP', name: 'Pro', description: 'Unlimited exports, no watermarks, all formats' },
            ],
          }),
        }}
      />
      <MarketingPageContent />
    </>
  );
}
