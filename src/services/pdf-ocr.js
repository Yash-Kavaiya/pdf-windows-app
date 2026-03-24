'use strict';

/**
 * OCR service — wraps tesseract.js for use in the Electron main process.
 * The renderer renders each PDF page to a canvas image and sends the
 * base64 data URL here; we run OCR and return the extracted text.
 */

let _worker = null;
let _workerLang = null;

async function getWorker(lang) {
  if (_worker && _workerLang === lang) return _worker;
  if (_worker) {
    await _worker.terminate();
    _worker = null;
  }
  const { createWorker } = require('tesseract.js');
  _worker = await createWorker(lang, 1, {
    // logger: (m) => console.log('[OCR]', m.status, m.progress),
  });
  _workerLang = lang;
  return _worker;
}

/**
 * Recognise text in a single page image.
 * @param {string} imageDataUrl  base64 PNG data URL from canvas.toDataURL()
 * @param {string} lang  tesseract language code, e.g. 'eng'
 * @returns {string} extracted text
 */
async function recognisePage(imageDataUrl, lang = 'eng') {
  const base64 = imageDataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  const worker = await getWorker(lang);
  const { data: { text } } = await worker.recognize(buffer);
  return text;
}

/**
 * Release the tesseract worker (call on app quit or when no longer needed).
 */
async function terminateWorker() {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
    _workerLang = null;
  }
}

module.exports = { recognisePage, terminateWorker };
