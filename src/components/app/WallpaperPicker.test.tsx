import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, act } from '@testing-library/react';
import { WallpaperPicker } from './WallpaperPicker';
import { useApp } from '@/context/AppContext';
import { mockLocalStorage, renderWithProvider } from '@/test/helpers';
import { prepareDeviceWallpaper } from '@/lib/device-wallpaper';
import { defaultWallpaper } from '@/data/wallpapers';
import { toast } from 'sonner';

vi.mock('@/lib/device-wallpaper', () => ({ prepareDeviceWallpaper: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const photo = 'data:image/webp;base64,ZGV2aWNlLXBob3Rv';
function Selection() {
  const { state } = useApp();
  return <output data-testid="selection">{state.wallpaper}</output>;
}

describe('device wallpapers', () => {
  beforeEach(() => { mockLocalStorage(); vi.clearAllMocks(); });

  async function upload() {
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper', exact: true }));
    fireEvent.change(screen.getByLabelText('Add from device', { selector: 'input' }), {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });
  }

  it('adds a device photo, selects it, and retains it after remount', async () => {
    vi.mocked(prepareDeviceWallpaper).mockResolvedValue(photo);
    const view = renderWithProvider(<><WallpaperPicker /><Selection /></>);
    await upload();
    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent(photo));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    const saved = JSON.parse(localStorage.getItem('taskly-state') ?? '{}');
    expect(saved.customWallpapers).toEqual([photo]);
    expect(saved.wallpaper).toBe(photo);
    view.unmount();
    renderWithProvider(<><WallpaperPicker /><Selection /></>);
    expect(screen.getByTestId('selection')).toHaveTextContent(photo);
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper 2', exact: true }));
    expect(screen.getByTestId('selection')).toHaveTextContent(defaultWallpaper);
    fireEvent.click(screen.getByRole('button', { name: 'Wallpaper 1', exact: true }));
    expect(screen.getByTestId('selection')).toHaveTextContent(photo);
  });

  it('keeps the old selection when a photo cannot be opened', async () => {
    vi.mocked(prepareDeviceWallpaper).mockRejectedValue(new Error('invalid-image'));
    renderWithProvider(<><WallpaperPicker /><Selection /></>);
    await upload();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByTestId('selection')).toHaveTextContent(defaultWallpaper);
  });

  it('does not select or retain a photo when device storage is full', async () => {
    vi.mocked(prepareDeviceWallpaper).mockResolvedValue(photo);
    const storage = mockLocalStorage();
    storage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });
    renderWithProvider(<><WallpaperPicker /><Selection /></>);
    await upload();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByTestId('selection')).toHaveTextContent(defaultWallpaper);
    expect(localStorage.getItem('taskly-state')).toBeNull();
  });
});