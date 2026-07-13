import { AmbientLayout } from '@/components/ui';

export function PageLoadingSpinner() {
  return (
    <AmbientLayout>
      <div className="flex-1 h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 animate-pulse">Memuat halaman...</p>
        </div>
      </div>
    </AmbientLayout>
  );
}
