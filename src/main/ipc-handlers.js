'use strict';

const { ipcMain, BrowserWindow } = require('electron');
const {
  openPdfDialog,
  openMultiplePdfsDialog,
  openImageDialog,
  savePdfDialog,
  selectOutputDirDialog,
  saveTemplateDialog,
  loadTemplateDialog,
  saveTxtDialog,
} = require('./file-utils');
const { applyWatermarkToBytes, batchProcess } = require('../services/pdf-watermark');
const { mergePdfs } = require('../services/pdf-merge');
const { splitPdfToPages, splitPdfByRange } = require('../services/pdf-split');
const { compressPdf } = require('../services/pdf-compress');
const { recognisePage, terminateWorker } = require('../services/pdf-ocr');
const { app } = require('electron');

// In-memory state
let currentPdfBytes = null;
let currentImageBytes = null;
let batchFilePaths = [];

function registerIpcHandlers() {

  // ─── PDF File I/O ──────────────────────────────────────────────────────────

  ipcMain.handle('open-pdf', async () => {
    const result = await openPdfDialog();
    if (result) {
      currentPdfBytes = new Uint8Array(result.bytes);
      return { filePath: result.filePath, pageCount: await getPageCount(currentPdfBytes) };
    }
    return null;
  });

  ipcMain.handle('open-pdfs', async () => {
    const paths = await openMultiplePdfsDialog();
    if (paths) {
      batchFilePaths = paths;
      return paths;
    }
    return null;
  });

  ipcMain.handle('open-image', async () => {
    const result = await openImageDialog();
    if (result) {
      currentImageBytes = new Uint8Array(result.bytes);
      return { filePath: result.filePath };
    }
    return null;
  });

  ipcMain.handle('save-pdf', async (_event, pdfBytesArray) => {
    return savePdfDialog(pdfBytesArray);
  });

  /** Return the currently loaded PDF bytes so the renderer can render pages for OCR. */
  ipcMain.handle('get-current-pdf', async () => {
    if (!currentPdfBytes) return null;
    return Array.from(currentPdfBytes);
  });

  // ─── Watermark ────────────────────────────────────────────────────────────

  ipcMain.handle('apply-watermark', async (_event, config) => {
    if (!currentPdfBytes) throw new Error('No PDF loaded');
    const resultBytes = await applyWatermarkToBytes(currentPdfBytes, config, currentImageBytes);
    return Array.from(resultBytes);
  });

  ipcMain.handle('generate-preview', async (_event, config) => {
    if (!currentPdfBytes) throw new Error('No PDF loaded');
    const resultBytes = await applyWatermarkToBytes(currentPdfBytes, config, currentImageBytes);
    return Array.from(resultBytes);
  });

  ipcMain.handle('batch-process', async (event, config) => {
    if (batchFilePaths.length === 0) throw new Error('No files selected for batch processing');
    const outputDir = await selectOutputDirDialog();
    if (!outputDir) return null;
    const win = BrowserWindow.fromWebContents(event.sender);
    const onProgress = (index, total, filename) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('batch-progress', { index, total, filename });
      }
    };
    return batchProcess(batchFilePaths, outputDir, config, onProgress);
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  ipcMain.handle('select-output-dir', async () => selectOutputDirDialog());
  ipcMain.handle('save-template', async (_event, template) => saveTemplateDialog(template));
  ipcMain.handle('load-template', async () => loadTemplateDialog());

  // ─── Merge ────────────────────────────────────────────────────────────────

  /**
   * Open file-picker and return an array of file paths the user chose.
   * (Does NOT set currentPdfBytes — merge operates on files directly.)
   */
  ipcMain.handle('select-pdfs-for-merge', async () => {
    return openMultiplePdfsDialog();
  });

  /** Merge the given file paths in order and return the merged bytes. */
  ipcMain.handle('merge-pdfs', async (_event, filePaths) => {
    if (!filePaths || filePaths.length < 2) throw new Error('Select at least 2 PDF files to merge');
    const bytes = await mergePdfs(filePaths);
    return Array.from(bytes);
  });

  // ─── Split ────────────────────────────────────────────────────────────────

  /**
   * Split the current PDF.
   * mode: 'pages' | 'range'
   * ranges (for 'range' mode): [{start, end, name?}]
   */
  ipcMain.handle('split-pdf', async (event, { mode, ranges }) => {
    if (!currentPdfBytes) throw new Error('No PDF loaded');
    const outputDir = await selectOutputDirDialog();
    if (!outputDir) return null;

    const win = BrowserWindow.fromWebContents(event.sender);
    const onProgress = (current, total) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('split-progress', { current, total });
      }
    };

    let results;
    if (mode === 'pages') {
      results = await splitPdfToPages(currentPdfBytes, outputDir, onProgress);
    } else {
      results = await splitPdfByRange(currentPdfBytes, ranges, outputDir);
    }
    return { outputDir, files: results };
  });

  // ─── Compress ─────────────────────────────────────────────────────────────

  ipcMain.handle('compress-pdf', async () => {
    if (!currentPdfBytes) throw new Error('No PDF loaded');
    const result = await compressPdf(currentPdfBytes);
    return {
      bytes: Array.from(result.bytes),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
    };
  });

  // ─── OCR ──────────────────────────────────────────────────────────────────

  /**
   * Run OCR on a single rendered page image (base64 data URL).
   * lang: tesseract language code, e.g. 'eng'
   */
  ipcMain.handle('ocr-page', async (_event, imageDataUrl, lang = 'eng') => {
    return recognisePage(imageDataUrl, lang);
  });

  /** Save OCR-extracted text to a .txt file */
  ipcMain.handle('save-txt', async (_event, text) => saveTxtDialog(text));

  // Clean up tesseract worker on quit
  app.on('before-quit', () => terminateWorker());
}

async function getPageCount(pdfBytes) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

module.exports = { registerIpcHandlers };
