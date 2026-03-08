/**
 * Tests for lib/export-utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, getAnonId, logExportEvent, ANON_ID_KEY } from '@/lib/export-utils';

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000,
      'Should not timeout'
    );
    expect(result).toBe('success');
  });

  it('rejects with timeout error when promise exceeds duration', async () => {
    const slowPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve('too late'), 200)
    );
    await expect(withTimeout(slowPromise, 50, 'Timed out')).rejects.toThrow('Timed out');
  });

  it('rejects with original error when promise rejects before timeout', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('original error')), 1000, 'Timeout')
    ).rejects.toThrow('original error');
  });
});

describe('getAnonId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates a new ID on first call', () => {
    const id = getAnonId();
    expect(id).toMatch(/^anon_\d+_[a-z0-9]+$/);
  });

  it('returns the same ID on subsequent calls', () => {
    const first = getAnonId();
    const second = getAnonId();
    expect(first).toBe(second);
  });

  it('stores the ID in localStorage', () => {
    const id = getAnonId();
    expect(localStorage.getItem(ANON_ID_KEY)).toBe(id);
  });

  it('returns empty string in SSR (no window)', () => {
    const originalWindow = global.window;
    // @ts-expect-error - testing SSR environment
    delete global.window;
    const id = getAnonId();
    expect(id).toBe('');
    global.window = originalWindow;
  });
});

describe('logExportEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires a fetch request to the analytics endpoint', () => {
    logExportEvent('png', '4:5', false);
    expect(fetch).toHaveBeenCalledWith(
      '/api/exports/log',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('includes anon_id for anonymous users', () => {
    localStorage.clear();
    logExportEvent('gif', '1:1', true);
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toHaveProperty('anon_id');
    expect(body.export_format).toBe('gif');
    expect(body.aspect_ratio).toBe('1:1');
  });

  it('does not include anon_id for authenticated users', () => {
    logExportEvent('png', '9:16', false);
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).not.toHaveProperty('anon_id');
  });

  it('does not throw when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    expect(() => logExportEvent('png', '4:5', false)).not.toThrow();
    // Allow the promise to settle
    await new Promise((r) => setTimeout(r, 10));
  });
});
