import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { WallpaperPicker } from './WallpaperPicker';
import { useApp } from '@/context/AppContext';
import { mockLocalStorage, renderWithProvider } from '@/test/helpers';

const remote = 'data:image/webp;base64,cmVtb3Rl';
vi.mock('@/hooks/use-wallpaper-account', () => ({ useWallpaperAccount: () => ({
  user: { id: 'u1' }, ready: true, name: 'Ann', avatar: null, loading: false, refresh: vi.fn(),
  photos: [{ path: 'u1/wallpapers/abc.webp', url: 'https://signed/abc' }],
}) }));
vi.mock('@/lib/cloud-wallpapers', () => ({
  uploadPersonalImage: vi.fn(async () => 'u1/wallpapers/local.webp'),
  downloadWallpaper: vi.fn(async () => remote),
}));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

function Selection() { const { state } = useApp(); return <output data-testid="sel">{state.wallpaper}</output>; }

describe('cloud wallpapers', () => {
  beforeEach(() => mockLocalStorage());
  it('shows a photo uploaded from another device and keeps it on this device when chosen', async () => {
    renderWithProvider(<><WallpaperPicker /><Selection /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper 1' }));
    await waitFor(() => expect(screen.getByTestId('sel')).toHaveTextContent(remote));
    expect(JSON.parse(localStorage.getItem('taskly-state')!).customWallpapers).toEqual([remote]);
  });
});
