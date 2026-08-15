import { AmbientLayout } from '@/components/ui';

export function PageLoadingSpinner() {
  return (
    <AmbientLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="animate-pulse text-neutral-500">Memuat halaman...</p>
        </div>
      </div>
    </AmbientLayout>
  );
}
