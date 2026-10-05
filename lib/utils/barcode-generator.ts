import bwipjs from 'bwip-js';

/**
 * Generate a Code 128 (1D linear barcode) as a PNG data URL (base64)
 * Compatible with @react-pdf/renderer Image component
 */
export async function generateCode128DataUrl(
  text: string,
  options?: {
    height?: number;
    scale?: number;
    includeText?: boolean;
  },
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: cleanText,
      scale: options?.scale || 3,
      height: options?.height || 10,
      includetext: options?.includeText !== false,
      textxalign: 'center',
      textsize: 9,
    });

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Failed to generate Code 128 barcode:', err);
    return '';
  }
}

/**
 * Generate a QR Code (2D matrix barcode) as a PNG data URL (base64)
 * Compatible with @react-pdf/renderer Image component
 */
export async function generateQrCodeDataUrl(
  text: string,
  options?: {
    scale?: number;
    padding?: number;
  },
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: cleanText,
      scale: options?.scale || 3,
      paddingwidth: options?.padding ?? 1,
      paddingheight: options?.padding ?? 1,
    });

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}
