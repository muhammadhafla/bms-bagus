'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  IconX,
  IconCamera,
  IconCameraRotate,
  IconBolt,
  IconBoltOff,
  IconAlertCircle,
  IconScan,
} from '@tabler/icons-react';
import { Button } from '@/components/ui';

interface SuratJalanCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function SuratJalanCameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: SuratJalanCameraScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const scannerRef = useRef<any>(null);
  const html5QrCodeModuleRef = useRef<any>(null);
  const isStoppingRef = useRef(false);

  // Stop scanner safely
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      }
    } catch (err) {
      console.debug('Error stopping scanner:', err);
    } finally {
      isStoppingRef.current = false;
      setIsTorchOn(false);
      setHasTorch(false);
    }
  }, []);

  // Initialize and start scanning
  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (!isOpen) return;
      setIsInitializing(true);
      setCameraError(null);

      try {
        await stopScanner();

        // Dynamically import html5-qrcode (100% Lazy Loaded)
        if (!html5QrCodeModuleRef.current) {
          const mod = await import('html5-qrcode');
          html5QrCodeModuleRef.current = mod.Html5Qrcode;
        }

        const Html5Qrcode = html5QrCodeModuleRef.current;
        if (!Html5Qrcode) {
          throw new Error('Gagal memuat pustaka scanner kamera.');
        }

        const scanner = new Html5Qrcode('surat-jalan-reader');
        scannerRef.current = scanner;

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.65), // rectangular for both 1D and 2D
            };
          },
          aspectRatio: 1.0,
        };

        const onScan = (decodedText: string) => {
          stopScanner().then(() => {
            onScanSuccess(decodedText.trim());
          });
        };

        // Jika cameraId spesifik sudah ditentukan (misal user switch camera)
        if (cameraId) {
          await scanner.start(cameraId, scanConfig, onScan, () => {});
          setSelectedCameraId(cameraId);
        } else {
          // Default: Mulai dengan facingMode environment (otomatis memicu prompt izin di PWA/mobile)
          try {
            await scanner.start({ facingMode: 'environment' }, scanConfig, onScan, () => {});
          } catch (envErr) {
            console.warn('Start with environment facingMode failed, fallback to available device:', envErr);
            // Fallback jika facingMode environment tidak tersedia (misal di laptop webcam)
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) {
              throw new Error('Tidak ada perangkat kamera yang terdeteksi.');
            }
            await scanner.start(devices[0].id, scanConfig, onScan, () => {});
            setSelectedCameraId(devices[0].id);
          }
        }

        // Ambil daftar perangkat kamera setelah izin berhasil diberikan untuk tombol switch kamera
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch (camErr) {
          console.debug('Failed to list secondary cameras:', camErr);
        }

        // Check torch capabilities
        try {
          const capabilities = scanner.getRunningTrackCapabilities?.();
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error('Camera scanner init failed:', err);
        setCameraError(
          err.message || 'Izin kamera ditolak atau kamera sedang digunakan aplikasi lain.',
        );
      } finally {
        setIsInitializing(false);
      }
    },
    [isOpen, onScanSuccess, stopScanner],
  );

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch Camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startScanner(nextCamera.id);
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20 text-brand-400">
              <IconScan size={20} />
            </div>
            <div>
              <h2 id="scanner-modal-title" className="text-sm font-bold text-white">
                Pindai Barcode Surat Jalan
              </h2>
              <p className="text-[11px] text-neutral-400">Arahkan ke Barcode atau QR Code</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner().then(onClose);
            }}
            className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            aria-label="Tutup pemindai kamera"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Viewport Camera Section */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[320px] overflow-hidden">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <IconAlertCircle size={28} />
              </div>
              <p className="text-sm font-semibold text-rose-200 mb-1">Gagal Mengakses Kamera</p>
              <p className="text-xs text-neutral-400 max-w-xs mb-4">{cameraError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => startScanner(selectedCameraId)}
                leftIcon={<IconCamera size={14} />}
              >
                Coba Akses Lagi
              </Button>
            </div>
          ) : (
            <>
              {/* HTML5 QrCode Target Div */}
              <div id="surat-jalan-reader" className="w-full h-full min-h-[300px]" />

              {/* Viewfinder Reticle Overlay */}
              {!isInitializing && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-44 rounded-2xl border-2 border-brand-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Animated Scanning Line */}
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-brand-400 shadow-[0_0_8px_#38bdf8] animate-pulse transition-all" />

                    {/* Corner Guides */}
                    <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-white rounded-tl" />
                    <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-white rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-white rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-white rounded-br" />
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  <span className="mt-3 text-xs text-neutral-300 font-medium">
                    Menyiapkan kamera...
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-3.5 bg-neutral-900/90">
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={switchCamera}
                leftIcon={<IconCameraRotate size={15} />}
                className="text-xs bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700"
              >
                Ganti Kamera
              </Button>
            )}

            {hasTorch && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleTorch}
                leftIcon={isTorchOn ? <IconBoltOff size={15} /> : <IconBolt size={15} />}
                className={`text-xs ${
                  isTorchOn
                    ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                    : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopScanner().then(onClose);
            }}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SuratJalanCameraScannerModal;
