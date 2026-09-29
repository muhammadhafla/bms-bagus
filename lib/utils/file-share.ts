import { toast } from 'sonner';

/**
 * Downloads a file silently or triggers the native OS Share Sheet if supported.
 * @param fetchUrl The API endpoint to fetch the file from (e.g. '/api/export/...')
 * @param filename The desired filename including extension
 * @param shareTitle Title for the OS Share Sheet
 * @param mimeType Optional MIME type (defaults to 'application/pdf')
 */
export const downloadOrShareFile = async (
  fetchUrl: string, 
  filename: string, 
  shareTitle: string, 
  mimeType: string = 'application/pdf'
) => {
  const toastId = toast.loading('Mempersiapkan dokumen...');
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'Gagal memuat file');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let shared = false;

    // Attempt Web Share API (mostly on mobile)
    if (isMobile && navigator.canShare) {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [file],
          title: shareTitle,
        });
        shared = true;
      }
    }

    // Fallback: Silent download via <a> tag
    if (!shared) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Dokumen berhasil diunduh', { id: toastId });
    }

    // Cleanup blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return true;
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing/downloading PDF:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses dokumen.', { id: toastId });
    } else {
      toast.dismiss(toastId); // User canceled share
    }
    return false;
  }
};
