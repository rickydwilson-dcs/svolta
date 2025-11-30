import { Suspense } from 'react';
import LoginForm from './LoginForm';

function LoginFormFallback() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 text-center">
        <div className="h-9 bg-zinc-200 dark:bg-zinc-700 rounded w-48 mx-auto mb-2" />
        <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-64 mx-auto" />
      </div>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="h-11 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          <div className="h-11 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        </div>
        <div className="h-11 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
