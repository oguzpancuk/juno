import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {}, READ_TIMEOUT_MS: 1000 }));

const { firstSightOf } = await import('./matches');

describe('firstSightOf', () => {
  it('is true once per match id and false after', () => {
    expect(firstSightOf('a')).toBe(true);
    expect(firstSightOf('a')).toBe(false);
    expect(firstSightOf('b')).toBe(true);
    expect(firstSightOf('a')).toBe(false);
  });
});
