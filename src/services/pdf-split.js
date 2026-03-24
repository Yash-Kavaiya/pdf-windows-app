'use strict';

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Split a PDF into one file per page.
 * @param {Uint8Array} pdfBytes
 * @param {string} outputDir
 * @param {function} onProgress(current, total)
 * @returns {string[]} Paths of the output files
 */
async function splitPdfToPages(pdfBytes, outputDir, onProgress) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const results = [];

  for (let i = 0; i < total; i++) {
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(doc, [i]);
    newDoc.addPage(page);
    const bytes = await newDoc.save({ useObjectStreams: true });
    const filePath = path.join(outputDir, `page_${String(i + 1).padStart(4, '0')}.pdf`);
    fs.writeFileSync(filePath, bytes);
    results.push(filePath);
    if (onProgress) onProgress(i + 1, total);
  }

  return results;
}

/**
 * Split a PDF using custom page ranges.
 * @param {Uint8Array} pdfBytes
 * @param {Array<{start:number, end:number, name?:string}>} ranges  1-based, inclusive
 * @param {string} outputDir
 * @returns {string[]} Paths of the output files
 */
async function splitPdfByRange(pdfBytes, ranges, outputDir) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const results = [];

  for (let ri = 0; ri < ranges.length; ri++) {
    const { start, end, name } = ranges[ri];
    const s = Math.max(1, start);
    const e = Math.min(total, end);
    if (s > e) continue;

    const newDoc = await PDFDocument.create();
    const indices = [];
    for (let i = s - 1; i < e; i++) indices.push(i);
    const pages = await newDoc.copyPages(doc, indices);
    pages.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save({ useObjectStreams: true });
    const label = name || `part_${ri + 1}_pages_${s}-${e}`;
    const filePath = path.join(outputDir, `${label}.pdf`);
    fs.writeFileSync(filePath, bytes);
    results.push(filePath);
  }

  return results;
}

module.exports = { splitPdfToPages, splitPdfByRange };
