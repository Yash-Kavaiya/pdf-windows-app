'use strict';

const { dialog } = require('electron');
const fs = require('fs');

async function openPdfDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Open PDF File',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const bytes = fs.readFileSync(filePath);
  return { filePath, bytes: Array.from(bytes) };
}

async function openMultiplePdfsDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Open PDF Files',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths;
}

async function openImageDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Select Watermark Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const bytes = fs.readFileSync(filePath);
  return { filePath, bytes: Array.from(bytes) };
}

async function savePdfDialog(pdfBytes) {
  const result = await dialog.showSaveDialog({
    title: 'Save Watermarked PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    defaultPath: 'watermarked.pdf',
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  fs.writeFileSync(result.filePath, Buffer.from(pdfBytes));
  return true;
}

async function selectOutputDirDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Select Output Directory',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

async function saveTemplateDialog(template) {
  const result = await dialog.showSaveDialog({
    title: 'Save Watermark Template',
    filters: [{ name: 'JSON Template', extensions: ['json'] }],
    defaultPath: 'watermark-template.json',
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  fs.writeFileSync(result.filePath, JSON.stringify(template, null, 2));
  return true;
}

async function loadTemplateDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Load Watermark Template',
    filters: [{ name: 'JSON Template', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const content = fs.readFileSync(result.filePaths[0], 'utf-8');
  return JSON.parse(content);
}

async function saveTxtDialog(text) {
  const result = await dialog.showSaveDialog({
    title: 'Save OCR Text',
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
    defaultPath: 'ocr-output.txt',
  });

  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, text, 'utf-8');
  return true;
}

module.exports = {
  openPdfDialog,
  openMultiplePdfsDialog,
  openImageDialog,
  savePdfDialog,
  selectOutputDirDialog,
  saveTemplateDialog,
  loadTemplateDialog,
  saveTxtDialog,
};
