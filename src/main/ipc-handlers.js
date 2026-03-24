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
} = require('./file-utils');
const { applyWatermarkToBytes, batchProcess } = require('../services/pdf-watermark');

// In-memory state
let currentPdfBytes = null;
let currentImageBytes = null;
let batchFilePaths = [];

function registerIpcHandlers() {
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

  ipcMain.handle('apply-watermark', async (_event, config) => {
    if (!currentPdfBytes) {
      throw new Error('No PDF loaded');
    }
    const resultBytes = await applyWatermarkToBytes(
      currentPdfBytes,
      config,
      currentImageBytes
    );
    return Array.from(resultBytes);
  });

  ipcMain.handle('generate-preview', async (_event, config) => {
    if (!currentPdfBytes) {
      throw new Error('No PDF loaded');
    }
    // Apply watermark and return the result for preview
    const resultBytes = await applyWatermarkToBytes(
      currentPdfBytes,
      config,
      currentImageBytes
    );
    return Array.from(resultBytes);
  });

  ipcMain.handle('batch-process', async (event, config) => {
    if (batchFilePaths.length === 0) {
      throw new Error('No files selected for batch processing');
    }

    const outputDir = await selectOutputDirDialog();
    if (!outputDir) return null;

    const win = BrowserWindow.fromWebContents(event.sender);
    const onProgress = (index, total, filename) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('batch-progress', { index, total, filename });
      }
    };

    const result = await batchProcess(batchFilePaths, outputDir, config, onProgress);
    return result;
  });

  ipcMain.handle('select-output-dir', async () => {
    return selectOutputDirDialog();
  });

  ipcMain.handle('save-template', async (_event, template) => {
    return saveTemplateDialog(template);
  });

  ipcMain.handle('load-template', async () => {
    return loadTemplateDialog();
  });
}

async function getPageCount(pdfBytes) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

module.exports = { registerIpcHandlers };
