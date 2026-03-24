'use strict';

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

/**
 * Merge multiple PDF files into a single PDF.
 * @param {string[]} filePaths - Ordered list of PDF file paths
 * @returns {Uint8Array} Merged PDF bytes
 */
async function mergePdfs(filePaths) {
  if (!filePaths || filePaths.length === 0) {
    throw new Error('No files provided for merging');
  }

  const merged = await PDFDocument.create();

  for (const filePath of filePaths) {
    const bytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageIndices = doc.getPageIndices();
    const copiedPages = await merged.copyPages(doc, pageIndices);
    copiedPages.forEach((page) => merged.addPage(page));
  }

  return merged.save({ useObjectStreams: true });
}

module.exports = { mergePdfs };
