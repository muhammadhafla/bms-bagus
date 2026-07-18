// hooks/useHaptic.ts
export function useHaptic() {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(8),         // tap feedback
    medium: () => vibrate(15),       // aksi penting (submit)
    heavy: () => vibrate([10, 50, 10]), // aksi destruktif (delete)
    success: () => vibrate([8, 40, 8]),  // konfirmasi berhasil
  };
}
