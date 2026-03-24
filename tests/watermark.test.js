'use strict';

const { PDFDocument } = require('pdf-lib');
const { addTextWatermark } = require('../src/services/text-watermark');
const { addImageWatermark, detectImageType } = require('../src/services/image-watermark');

/**
 * Create a simple test PDF with the given number of pages.
 */
async function createTestPdf(numPages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < numPages; i++) {
    doc.addPage([612, 792]); // US Letter
  }
  return doc.save();
}

/**
 * Create a minimal 1x1 PNG image (red pixel).
 */
function createTestPng() {
  // Minimal valid PNG: 1x1 red pixel
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // compressed data
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, // checksum
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);
  return png;
}

describe('addTextWatermark', () => {
  test('applies text watermark to a single-page PDF', async () => {
    const pdfBytes = await createTestPdf(1);
    const result = await addTextWatermark(pdfBytes, {
      text: 'TEST',
      fontSize: 48,
      color: { r: 0.5, g: 0.5, b: 0.5 },
      opacity: 30,
      rotation: 45,
      position: 'center',
      pageRange: 'all',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(pdfBytes.length);

    // Verify it's still a valid PDF
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(1);
  });

  test('applies text watermark to specific pages only', async () => {
    const pdfBytes = await createTestPdf(5);
    const result = await addTextWatermark(pdfBytes, {
      text: 'DRAFT',
      fontSize: 72,
      opacity: 50,
      rotation: 0,
      position: 'top-left',
      pageRange: '1,3,5',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(5);
  });

  test('handles tiling mode', async () => {
    const pdfBytes = await createTestPdf(1);
    const result = await addTextWatermark(pdfBytes, {
      text: 'TILED',
      fontSize: 24,
      opacity: 20,
      rotation: 30,
      position: 'center',
      tiling: true,
      pageRange: 'all',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(pdfBytes.length);
  });

  test('applies to odd pages only', async () => {
    const pdfBytes = await createTestPdf(4);
    const result = await addTextWatermark(pdfBytes, {
      text: 'ODD',
      fontSize: 36,
      opacity: 40,
      rotation: 0,
      position: 'center',
      pageRange: 'odd',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(4);
  });

  test('uses default values when config is minimal', async () => {
    const pdfBytes = await createTestPdf(1);
    const result = await addTextWatermark(pdfBytes, {});

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe('detectImageType', () => {
  test('detects PNG', () => {
    const png = createTestPng();
    expect(detectImageType(png)).toBe('png');
  });

  test('detects JPEG', () => {
    const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectImageType(jpg)).toBe('jpg');
  });

  test('throws for unsupported format', () => {
    const gif = Buffer.from([0x47, 0x49, 0x46, 0x38]);
    expect(() => detectImageType(gif)).toThrow('Unsupported image format');
  });
});

describe('addImageWatermark', () => {
  test('applies PNG watermark to a PDF', async () => {
    const pdfBytes = await createTestPdf(1);
    const pngBytes = createTestPng();

    const result = await addImageWatermark(pdfBytes, pngBytes, {
      scale: 100,
      opacity: 50,
      rotation: 0,
      position: 'center',
      pageRange: 'all',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(1);
  });

  test('applies image watermark with tiling', async () => {
    const pdfBytes = await createTestPdf(1);
    const pngBytes = createTestPng();

    const result = await addImageWatermark(pdfBytes, pngBytes, {
      scale: 50,
      opacity: 20,
      rotation: 0,
      position: 'center',
      tiling: true,
      pageRange: 'all',
    });

    expect(result).toBeInstanceOf(Uint8Array);
  });

  test('handles multi-page PDF with page range', async () => {
    const pdfBytes = await createTestPdf(3);
    const pngBytes = createTestPng();

    const result = await addImageWatermark(pdfBytes, pngBytes, {
      scale: 75,
      opacity: 30,
      rotation: 45,
      position: 'bottom-right',
      pageRange: '2-3',
    });

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(3);
  });
});
