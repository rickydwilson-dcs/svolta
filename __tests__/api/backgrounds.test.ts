/**
 * Integration tests for /api/backgrounds/upload
 *
 * Tests upload and deletion of custom background images for Pro users.
 *
 * Prerequisites:
 * - Supabase migrations applied
 * - Test user with Pro subscription
 * - Test image files available
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@/lib/supabase/server';

describe('POST /api/backgrounds/upload', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create test user or get existing one
    // Note: In real tests, use a test database or test user
    // This is a template - adjust to your test setup
  });

  afterAll(async () => {
    // Cleanup: Remove test files and reset profile
  });

  it('should reject unauthenticated requests', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/jpeg' }));

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should reject non-Pro users', async () => {
    // Test with Free tier user
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/jpeg' }));

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Free user
      },
      body: formData,
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Pro subscription required');
  });

  it('should reject files over 2MB', async () => {
    // Create 3MB file
    const largeFile = new Blob([new ArrayBuffer(3 * 1024 * 1024)], {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', largeFile);

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Pro user
      },
      body: formData,
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('File too large');
  });

  it('should reject invalid file types', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'application/pdf' }));

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Pro user
      },
      body: formData,
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid file type');
  });

  it('should successfully upload JPG image for Pro user', async () => {
    // Create valid 1MB JPG file
    const file = new File([new ArrayBuffer(1024 * 1024)], 'background.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Pro user
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.url).toBeDefined();
    expect(json.url).toContain('backgrounds');
    expect(json.url).toContain('custom-background.jpg');
  });

  it('should successfully upload PNG image for Pro user', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'background.png', {
      type: 'image/png',
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Pro user
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.url).toContain('custom-background.png');
  });

  it('should successfully upload WebP image for Pro user', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'background.webp', {
      type: 'image/webp',
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers for Pro user
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.url).toContain('custom-background.webp');
  });

  it('should overwrite existing background on re-upload', async () => {
    const file1 = new File([new ArrayBuffer(512 * 1024)], 'background1.jpg', {
      type: 'image/jpeg',
    });

    const formData1 = new FormData();
    formData1.append('file', file1);

    // First upload
    const response1 = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData1,
    });

    const json1 = await response1.json();
    const firstUrl = json1.url;

    // Second upload (should overwrite)
    const file2 = new File([new ArrayBuffer(512 * 1024)], 'background2.jpg', {
      type: 'image/jpeg',
    });

    const formData2 = new FormData();
    formData2.append('file', file2);

    const response2 = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData2,
    });

    const json2 = await response2.json();
    const secondUrl = json2.url;

    // URLs should be the same (upsert behavior)
    expect(secondUrl).toBe(firstUrl);
  });

  it('should update profile.custom_background_url after upload', async () => {
    const file = new File([new ArrayBuffer(512 * 1024)], 'background.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData,
    });

    const json = await response.json();
    const uploadedUrl = json.url;

    // Verify profile was updated
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_background_url')
      .eq('id', testUserId)
      .single();

    expect(profile?.custom_background_url).toBe(uploadedUrl);
  });
});

describe('DELETE /api/backgrounds/upload', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'DELETE',
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should handle deleting when no background exists', async () => {
    const response = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'DELETE',
      headers: {
        // Add auth headers for user without background
      },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('No custom background');
  });

  it('should successfully delete existing background', async () => {
    // First, upload a background
    const file = new File([new ArrayBuffer(512 * 1024)], 'background.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);

    await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData,
    });

    // Then delete it
    const deleteResponse = await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'DELETE',
      headers: {
        // Add auth headers
      },
    });

    expect(deleteResponse.status).toBe(200);
    const json = await deleteResponse.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('removed successfully');
  });

  it('should set profile.custom_background_url to null after deletion', async () => {
    // Upload then delete
    const file = new File([new ArrayBuffer(512 * 1024)], 'background.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);

    await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData,
    });

    await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'DELETE',
      headers: {
        // Add auth headers
      },
    });

    // Verify profile was updated
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_background_url')
      .eq('id', 'test-user-id')
      .single();

    expect(profile?.custom_background_url).toBeNull();
  });

  it('should remove file from storage after deletion', async () => {
    // Upload, delete, then verify file is gone
    const file = new File([new ArrayBuffer(512 * 1024)], 'background.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);

    await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'POST',
      headers: {
        // Add auth headers
      },
      body: formData,
    });

    await fetch('http://localhost:3000/api/backgrounds/upload', {
      method: 'DELETE',
      headers: {
        // Add auth headers
      },
    });

    // Verify file is deleted from storage
    const supabase = await createClient();
    const { data: files } = await supabase.storage
      .from('backgrounds')
      .list('test-user-id');

    const backgroundFiles = files?.filter((f) =>
      f.name.startsWith('custom-background')
    );

    expect(backgroundFiles?.length).toBe(0);
  });
});

describe('Storage bucket security', () => {
  it('should allow users to only access their own backgrounds', async () => {
    // Test RLS policy enforcement
    // Attempt to access another user's background
    // Should be blocked by RLS
  });

  it('should allow public read access to backgrounds', async () => {
    // Upload a background
    // Then access the public URL without auth
    // Should succeed
  });
});
