'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openPdf: () => ipcRenderer.invoke('open-pdf'),
  openPdfs: () => ipcRenderer.invoke('open-pdfs'),
  openImage: () => ipcRenderer.invoke('open-image'),
  savePdf: (pdfBytes) => ipcRenderer.invoke('save-pdf', pdfBytes),
  applyWatermark: (config) => ipcRenderer.invoke('apply-watermark', config),
  generatePreview: (config) => ipcRenderer.invoke('generate-preview', config),
  batchProcess: (config) => ipcRenderer.invoke('batch-process', config),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  saveTemplate: (template) => ipcRenderer.invoke('save-template', template),
  loadTemplate: () => ipcRenderer.invoke('load-template'),

  // Listen for batch progress updates
  onBatchProgress: (callback) => {
    ipcRenderer.on('batch-progress', (_event, data) => callback(data));
  },
  removeBatchProgress: () => {
    ipcRenderer.removeAllListeners('batch-progress');
  },
});
