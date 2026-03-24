'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ─── PDF File I/O ────────────────────────────────────────────────────────
  openPdf:         ()             => ipcRenderer.invoke('open-pdf'),
  openPdfs:        ()             => ipcRenderer.invoke('open-pdfs'),
  openImage:       ()             => ipcRenderer.invoke('open-image'),
  savePdf:         (bytes)        => ipcRenderer.invoke('save-pdf', bytes),
  getCurrentPdf:   ()             => ipcRenderer.invoke('get-current-pdf'),

  // ─── Watermark ───────────────────────────────────────────────────────────
  applyWatermark:  (config)       => ipcRenderer.invoke('apply-watermark', config),
  generatePreview: (config)       => ipcRenderer.invoke('generate-preview', config),
  batchProcess:    (config)       => ipcRenderer.invoke('batch-process', config),
  selectOutputDir: ()             => ipcRenderer.invoke('select-output-dir'),
  saveTemplate:    (tpl)          => ipcRenderer.invoke('save-template', tpl),
  loadTemplate:    ()             => ipcRenderer.invoke('load-template'),

  onBatchProgress: (cb) => ipcRenderer.on('batch-progress', (_e, d) => cb(d)),
  removeBatchProgress: () => ipcRenderer.removeAllListeners('batch-progress'),

  // ─── Merge ───────────────────────────────────────────────────────────────
  selectPdfsForMerge: ()          => ipcRenderer.invoke('select-pdfs-for-merge'),
  mergePdfs:       (paths)        => ipcRenderer.invoke('merge-pdfs', paths),

  // ─── Split ───────────────────────────────────────────────────────────────
  splitPdf:        (opts)         => ipcRenderer.invoke('split-pdf', opts),
  onSplitProgress: (cb) => ipcRenderer.on('split-progress', (_e, d) => cb(d)),
  removeSplitProgress: () => ipcRenderer.removeAllListeners('split-progress'),

  // ─── Compress ────────────────────────────────────────────────────────────
  compressPdf:     ()             => ipcRenderer.invoke('compress-pdf'),

  // ─── OCR ─────────────────────────────────────────────────────────────────
  ocrPage:         (dataUrl, lang) => ipcRenderer.invoke('ocr-page', dataUrl, lang),
  saveTxt:         (text)         => ipcRenderer.invoke('save-txt', text),
});
