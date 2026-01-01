/**
 * Tests for background presets and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  GRADIENT_PRESETS,
  SOLID_COLOR_PRESETS,
  getDefaultBackgroundSettings,
  createGradientBackground,
  createSolidBackground,
  createCustomBackground,
  getGradientPresetIds,
  getGradientPreset,
  validateBackgroundSettings,
  type BackgroundSettings,
} from '../backgrounds';

describe('Background Presets', () => {
  it('should have gradient presets', () => {
    expect(Object.keys(GRADIENT_PRESETS).length).toBeGreaterThan(0);
  });

  it('should have valid gradient preset structure', () => {
    Object.values(GRADIENT_PRESETS).forEach((preset) => {
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('type');
      expect(preset).toHaveProperty('colors');
      expect(preset.colors.length).toBeGreaterThanOrEqual(2);
      expect(['linear', 'radial']).toContain(preset.type);
    });
  });

  it('should have solid color presets', () => {
    expect(SOLID_COLOR_PRESETS.length).toBeGreaterThan(0);
  });

  it('should have valid solid color preset structure', () => {
    SOLID_COLOR_PRESETS.forEach((preset) => {
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('color');
      expect(preset.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Background Settings Creation', () => {
  it('should create default background settings', () => {
    const settings = getDefaultBackgroundSettings();
    expect(settings.type).toBe('transparent');
  });

  it('should create gradient background settings', () => {
    const settings = createGradientBackground('clean-studio');
    expect(settings).not.toBeNull();
    expect(settings?.type).toBe('gradient');
    expect(settings?.gradient).toBeDefined();
    expect(settings?.gradient?.id).toBe('clean-studio');
  });

  it('should return null for invalid gradient preset', () => {
    const settings = createGradientBackground('invalid-preset');
    expect(settings).toBeNull();
  });

  it('should create solid background settings', () => {
    const settings = createSolidBackground('#ff0000');
    expect(settings.type).toBe('solid');
    expect(settings.color).toBe('#ff0000');
  });

  it('should create custom background settings', () => {
    const url = 'https://example.com/bg.jpg';
    const settings = createCustomBackground(url);
    expect(settings.type).toBe('custom');
    expect(settings.customUrl).toBe(url);
  });
});

describe('Gradient Preset Utilities', () => {
  it('should get all gradient preset IDs', () => {
    const ids = getGradientPresetIds();
    expect(ids).toContain('clean-studio');
    expect(ids).toContain('gym-vibes');
    expect(ids).toContain('sunset-glow');
  });

  it('should get gradient preset by ID', () => {
    const preset = getGradientPreset('clean-studio');
    expect(preset).not.toBeNull();
    expect(preset?.id).toBe('clean-studio');
    expect(preset?.name).toBe('Clean Studio');
  });

  it('should return null for invalid preset ID', () => {
    const preset = getGradientPreset('invalid-id');
    expect(preset).toBeNull();
  });
});

describe('Background Settings Validation', () => {
  it('should validate transparent background', () => {
    const settings: BackgroundSettings = { type: 'transparent' };
    expect(validateBackgroundSettings(settings)).toBe(true);
  });

  it('should validate original background', () => {
    const settings: BackgroundSettings = { type: 'original' };
    expect(validateBackgroundSettings(settings)).toBe(true);
  });

  it('should validate solid background with valid color', () => {
    const settings: BackgroundSettings = {
      type: 'solid',
      color: '#ff0000',
    };
    expect(validateBackgroundSettings(settings)).toBe(true);
  });

  it('should invalidate solid background without color', () => {
    const settings: BackgroundSettings = { type: 'solid' };
    expect(validateBackgroundSettings(settings)).toBe(false);
  });

  it('should invalidate solid background with invalid color', () => {
    const settings: BackgroundSettings = {
      type: 'solid',
      color: 'red',
    };
    expect(validateBackgroundSettings(settings)).toBe(false);
  });

  it('should validate gradient background', () => {
    const gradient = GRADIENT_PRESETS['clean-studio'];
    const settings: BackgroundSettings = {
      type: 'gradient',
      gradient,
    };
    expect(validateBackgroundSettings(settings)).toBe(true);
  });

  it('should invalidate gradient background without gradient', () => {
    const settings: BackgroundSettings = { type: 'gradient' };
    expect(validateBackgroundSettings(settings)).toBe(false);
  });

  it('should validate custom background', () => {
    const settings: BackgroundSettings = {
      type: 'custom',
      customUrl: 'https://example.com/bg.jpg',
    };
    expect(validateBackgroundSettings(settings)).toBe(true);
  });

  it('should invalidate custom background without URL', () => {
    const settings: BackgroundSettings = { type: 'custom' };
    expect(validateBackgroundSettings(settings)).toBe(false);
  });
});

describe('Color Formats', () => {
  it('should have all solid colors in valid hex format', () => {
    SOLID_COLOR_PRESETS.forEach((preset) => {
      expect(preset.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('should have all gradient colors in valid format', () => {
    Object.values(GRADIENT_PRESETS).forEach((preset) => {
      preset.colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});

describe('Gradient Preset Angles', () => {
  it('should have angle for linear gradients', () => {
    Object.values(GRADIENT_PRESETS)
      .filter((preset) => preset.type === 'linear')
      .forEach((preset) => {
        expect(preset.angle).toBeDefined();
        expect(preset.angle).toBeGreaterThanOrEqual(0);
        expect(preset.angle).toBeLessThanOrEqual(360);
      });
  });

  it('should not have angle for radial gradients', () => {
    Object.values(GRADIENT_PRESETS)
      .filter((preset) => preset.type === 'radial')
      .forEach((preset) => {
        expect(preset.angle).toBeUndefined();
      });
  });
});
