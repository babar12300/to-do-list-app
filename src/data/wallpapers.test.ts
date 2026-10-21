import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { wallpapers, defaultWallpaper, wallpaperThumb } from './wallpapers';

const PUBLIC = join(__dirname, '..', '..', 'public');
const local = wallpapers.filter(url => url.startsWith('/wallpapers/'));

describe('wallpapers', () => {
  it('has 20 wallpapers', () => {
    expect(wallpapers).toHaveLength(20);
  });

  it('every entry is the Unsplash default or a shipped file', () => {
    wallpapers.forEach(url => {
      expect(url).toMatch(/^(https:\/\/images\.unsplash\.com\/|\/wallpapers\/[\w-]+\.webp$)/);
    });
  });

  it('every shipped wallpaper and its thumbnail exist in public/', () => {
    expect(local.length).toBeGreaterThan(0);
    local.forEach(url => {
      expect(existsSync(join(PUBLIC, url)), url).toBe(true);
      expect(existsSync(join(PUBLIC, wallpaperThumb(url))), wallpaperThumb(url)).toBe(true);
    });
  });

  it('defaultWallpaper is the first wallpaper', () => {
    expect(defaultWallpaper).toBe(wallpapers[0]);
  });

  it('no duplicate wallpapers', () => {
    expect(new Set(wallpapers).size).toBe(wallpapers.length);
  });
});
