import { describe, it, expect } from 'vitest';
import { generateCode128DataUrl, generateQrCodeDataUrl } from './barcode-generator';

describe('barcode-generator', () => {
  it('should generate Code 128 as a valid PNG data URL', async () => {
    const dataUrl = await generateCode128DataUrl('TRF/20261005/0001');
    expect(dataUrl).toContain('data:image/png;base64,');
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('should return empty string for empty text in Code 128', async () => {
    const dataUrl = await generateCode128DataUrl('');
    expect(dataUrl).toBe('');
  });

  it('should generate QR code as a valid PNG data URL', async () => {
    const dataUrl = await generateQrCodeDataUrl('https://example.com/warehouse/transfers?detailId=123');
    expect(dataUrl).toContain('data:image/png;base64,');
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('should return empty string for empty text in QR Code', async () => {
    const dataUrl = await generateQrCodeDataUrl('   ');
    expect(dataUrl).toBe('');
  });
});
