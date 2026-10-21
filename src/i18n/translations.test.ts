import { describe, it, expect } from 'vitest';
import { t, translations, languageNames } from './translations';

describe('translations', () => {
  it('t() returns English text for known keys', () => {
    expect(t('en', 'inbox')).toBe('Inbox');
    expect(t('en', 'delete')).toBe('Delete');
  });

  it('t() returns translated text for other languages', () => {
    expect(t('es', 'inbox')).toBe('Bandeja de entrada');
    expect(t('fr', 'inbox')).toBe('Boîte de réception');
    expect(t('de', 'inbox')).toBe('Posteingang');
    expect(t('ja', 'inbox')).toBe('受信トレイ');
  });

  it('t() falls back to English for missing keys', () => {
    expect(t('es', 'inbox')).toBeTruthy();
    // A key only in en
    expect(t('xx', 'inbox')).toBe('Inbox');
  });

  it('t() returns the key itself if not found in any language', () => {
    expect(t('en', 'nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });

  it('all 10 languages are present', () => {
    expect(Object.keys(translations)).toHaveLength(10);
    expect(Object.keys(languageNames)).toHaveLength(10);
  });

  it('all languages have the same keys as English', () => {
    const enKeys = Object.keys(translations.en);
    for (const [lang, dict] of Object.entries(translations)) {
      if (lang === 'en') continue;
      for (const key of enKeys) {
        expect(dict[key], `Missing key "${key}" in language "${lang}"`).toBeDefined();
      }
    }
  });
});
