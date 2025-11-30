'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to prevent MediaPipe from loading on server
const EditorContent = dynamic(() => import('./_components/EditorContent'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-border-default rounded-full" />
          <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-text-secondary">Loading editor...</p>
      </div>
    </div>
  ),
});

export default function EditorPage() {
  return <EditorContent />;
}
