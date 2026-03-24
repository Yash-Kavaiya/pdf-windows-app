'use strict';

const { PDFDocument } = require('pdf-lib');

/**
 * Compress a PDF by re-saving with object streams enabled.
 * This reduces file size by compressing the cross-reference table
 * and removing unused/duplicate objects during serialisation.
 *
 * @param {Uint8Array} pdfBytes
 * @returns {{ bytes: Uint8Array, originalSize: number, compressedSize: number }}
 */
async function compressPdf(pdfBytes) {
  const originalSize = pdfBytes.byteLength;

  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // useObjectStreams compresses the XRef table significantly
  const compressed = await doc.save({ useObjectStreams: true });

  return {
    bytes: compressed,
    originalSize,
    compressedSize: compressed.byteLength,
  };
}

module.exports = { compressPdf };
