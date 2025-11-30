'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useUserStore } from '@/stores/user-store';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type ExportFormat = '1:1' | '4:5' | '9:16';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // User store
  const user = useUserStore((state) => state.user);
  const profile = useUserStore((state) => state.profile);
  const usage = useUserStore((state) => state.usage);
  const isPro = useUserStore((state) => state.isPro);
  const exportsRemaining = useUserStore((state) => state.exportsRemaining);
  const exportLimit = useUserStore((state) => state.exportLimit);
  const signOut = useUserStore((state) => state.signOut);
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo upload state
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Preferences state
  const [defaultFormat, setDefaultFormat] = useState<ExportFormat>('1:1');

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const userIsPro = isPro();
  const usageCount = usage?.exports_count ?? 0;
  const limit = exportLimit();
  const remaining = exportsRemaining();
  const usagePercentage = limit === Infinity ? 100 : (usageCount / limit) * 100;

  // Initialize state from profile
  useEffect(() => {
    setMounted(true);
    if (profile) {
      setDisplayName(profile.full_name || '');
      // Note: logo_url and default_export_format would need to be added to profile schema
      // For now, these are placeholders
    }
  }, [profile]);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });

      // Clear message after 3 seconds
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle logo file selection
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLogoMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setLogoMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    setLogoFile(file);
    setLogoMessage(null);

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload logo to Supabase Storage
  const handleUploadLogo = async () => {
    if (!logoFile || !user) return;

    setIsUploadingLogo(true);
    setLogoMessage(null);

    try {
      // Upload to Supabase Storage
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Update profile with logo URL
      // Note: logo_url field would need to be added to profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          // logo_url: publicUrl, // Uncomment when field is added to schema
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();
      setLogoMessage({ type: 'success', text: 'Logo uploaded successfully' });
      setLogoFile(null);

      // Clear message after 3 seconds
      setTimeout(() => setLogoMessage(null), 3000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setLogoMessage({ type: 'error', text: 'Failed to upload logo' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoFile(null);
    setLogoMessage(null);
  };

  // Drag and drop handlers
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = () => {
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLogoMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setLogoMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    setLogoFile(file);
    setLogoMessage(null);

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully - redirect to home
      router.push('/');
    } catch (error) {
      console.error('Delete account error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  // Open Stripe customer portal
  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open subscription portal');
      }

      // Redirect to Stripe portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert(error instanceof Error ? error.message : 'Failed to open subscription portal');
    }
  };

  // Prevent hydration mismatch for theme
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Editor
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
            Settings
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Manage your account, subscription, and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Display Name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                />

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Email
                  </label>
                  <div className="text-base text-[var(--text-secondary)] py-2.5 px-4 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl border border-[var(--border-default)]">
                    {user?.email || 'Not available'}
                  </div>
                </div>

                {profileMessage && (
                  <div
                    className={cn(
                      'p-3 rounded-xl text-sm',
                      profileMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    )}
                  >
                    {profileMessage.text}
                  </div>
                )}

                <Button
                  onClick={handleSaveProfile}
                  loading={isSavingProfile}
                  disabled={!displayName || displayName === profile?.full_name}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Section */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current Plan Badge */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Current Plan
                  </label>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--gray-100)] dark:bg-[var(--gray-800)] border border-[var(--border-default)]">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-2 h-2 rounded-full',
                        userIsPro ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    />
                    <span className="text-base font-semibold text-[var(--text-primary)]">
                      {userIsPro ? 'Pro' : 'Free'}
                    </span>
                  </div>
                </div>

                {/* Usage Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      {userIsPro ? 'Exports this month' : 'Usage this month'}
                    </label>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {userIsPro ? `${usageCount} exports` : `${usageCount} of ${limit}`}
                    </span>
                  </div>

                  {!userIsPro && (
                    <>
                      <div className="w-full h-2 bg-[var(--gray-200)] dark:bg-[var(--gray-700)] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            remaining === 0 ? 'bg-red-500' : remaining <= 2 ? 'bg-orange-500' : 'bg-green-500'
                          )}
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {remaining} {remaining === 1 ? 'export' : 'exports'} remaining
                      </p>
                    </>
                  )}

                  {userIsPro && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Unlimited exports with Pro plan
                    </p>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  {!userIsPro ? (
                    <Button onClick={() => router.push('/upgrade')}>
                      Upgrade to Pro
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={handleManageSubscription}>
                      Manage Subscription
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Logo Section (Pro Only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Logo</CardTitle>
                  <CardDescription>
                    Add your logo to all exports
                  </CardDescription>
                </div>
                {!userIsPro && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Pro Only
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {userIsPro ? (
                <div className="space-y-4">
                  {/* Logo Upload Dropzone */}
                  <div
                    onDragOver={handleLogoDragOver}
                    onDragLeave={handleLogoDragLeave}
                    onDrop={handleLogoDrop}
                    className={cn(
                      'relative border-2 border-dashed rounded-xl p-8 transition-all duration-200',
                      isDraggingLogo
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                        : 'border-[var(--border-default)] hover:border-[var(--border-focus)]',
                      'cursor-pointer'
                    )}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />

                    {logo ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-[var(--gray-100)] dark:bg-[var(--gray-800)] border border-[var(--border-default)]">
                          <img
                            src={logo}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {logoFile?.name || 'Logo preview'}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLogo();
                          }}
                        >
                          Remove Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-xl bg-[var(--gray-100)] dark:bg-[var(--gray-800)] flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-[var(--text-secondary)]"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            PNG or JPG (max 2MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {logoMessage && (
                    <div
                      className={cn(
                        'p-3 rounded-xl text-sm',
                        logoMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      )}
                    >
                      {logoMessage.text}
                    </div>
                  )}

                  {logoFile && (
                    <Button
                      onClick={handleUploadLogo}
                      loading={isUploadingLogo}
                      className="w-full"
                    >
                      Upload Logo
                    </Button>
                  )}

                  <p className="text-xs text-[var(--text-secondary)]">
                    Your logo will appear on all your exported comparisons. For best results, use a square PNG with transparent background.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gray-100)] dark:bg-[var(--gray-800)] mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--text-secondary)]"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-[var(--text-primary)] mb-2">
                    Upgrade to add your logo
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Brand your exports with a custom logo and create professional before/after comparisons.
                  </p>
                  <Button onClick={() => router.push('/upgrade')}>
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Theme Toggle */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                    Theme
                  </label>
                  <div className="inline-flex items-center gap-1 p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl border border-[var(--border-default)]">
                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                        theme === 'system'
                          ? 'bg-[var(--surface-primary)] shadow-sm text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      System
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                        theme === 'light'
                          ? 'bg-[var(--surface-primary)] shadow-sm text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                        theme === 'dark'
                          ? 'bg-[var(--surface-primary)] shadow-sm text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Default Export Format */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                    Default Export Format
                  </label>
                  <select
                    value={defaultFormat}
                    onChange={(e) => setDefaultFormat(e.target.value as ExportFormat)}
                    className="w-full h-11 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-base text-[var(--text-primary)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <option value="1:1">Square (1:1) - Instagram Post</option>
                    <option value="4:5">Portrait (4:5) - Instagram Feed</option>
                    <option value="9:16">Story (9:16) - Instagram Stories</option>
                  </select>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Choose your preferred aspect ratio for exports
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleSignOut}
                    className="sm:w-auto"
                  >
                    Sign Out
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteModal(true)}
                    className="sm:w-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Delete Account
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Deleting your account is permanent and cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Account"
        description="This action cannot be undone. All your data will be permanently deleted."
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>Warning:</strong> This will permanently delete your account, subscription, and all associated data.
            </p>
          </div>

          <Input
            label='Type "DELETE" to confirm'
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETE"
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || isDeleting}
              loading={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
