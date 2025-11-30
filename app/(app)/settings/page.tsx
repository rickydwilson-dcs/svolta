export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-12">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Settings
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-white">
            Account
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value="user@example.com"
                disabled
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                type="text"
                value="User Name"
                disabled
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Usage Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-white">
            Usage
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  Exports this month
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Free plan: 5 exports per month
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  0/5
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-white">
            Subscription
          </h2>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                Current Plan
              </p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-white">
                Free
              </p>
            </div>
            <button
              disabled
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white opacity-50 dark:bg-white dark:text-zinc-900"
            >
              Upgrade to Pro (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
