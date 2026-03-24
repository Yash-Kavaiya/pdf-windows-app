'use strict';

/**
 * Main application controller — ties together preview, watermark config, and batch modules.
 */
(function App() {
  // State
  let pdfLoaded = false;
  let imageLoaded = false;
  let lastPreviewBytes = null;

  // Elements
  const fileInfo = document.getElementById('file-info');
  const imageInfo = document.getElementById('image-info');
  const statusText = document.getElementById('status-text');
  const applyBtn = document.getElementById('btn-apply');
  const progressBar = document.getElementById('progress-bar');

  // Initialize UI modules
  WatermarkUI.init();

  // === File Loading ===
  document.getElementById('btn-open-pdf').addEventListener('click', async () => {
    try {
      setStatus('Opening PDF...');
      const result = await window.api.openPdf();
      if (result) {
        fileInfo.textContent = result.filePath.split(/[\\/]/).pop() + ` (${result.pageCount} pages)`;
        pdfLoaded = true;
        applyBtn.disabled = false;
        setStatus('PDF loaded successfully');

        // Generate initial preview
        await generatePreview();
      } else {
        setStatus('Ready');
      }
    } catch (err) {
      setStatus('Error loading PDF: ' + err.message);
    }
  });

  // Image selection
  document.getElementById('btn-select-image').addEventListener('click', async () => {
    try {
      const result = await window.api.openImage();
      if (result) {
        imageInfo.textContent = result.filePath.split(/[\\/]/).pop();
        imageLoaded = true;
        setStatus('Watermark image loaded');
      }
    } catch (err) {
      setStatus('Error loading image: ' + err.message);
    }
  });

  // === Preview ===
  document.getElementById('btn-preview').addEventListener('click', generatePreview);

  async function generatePreview() {
    if (!pdfLoaded) {
      setStatus('Please load a PDF first');
      return;
    }

    const config = WatermarkUI.getConfig();
    if (config.type === 'image' && !imageLoaded) {
      setStatus('Please select a watermark image first');
      return;
    }

    try {
      setStatus('Generating preview...');
      progressBar.style.display = 'block';
      progressBar.removeAttribute('value'); // Indeterminate

      const resultBytes = await window.api.generatePreview(config);
      lastPreviewBytes = resultBytes;
      await PreviewManager.loadPdf(resultBytes);

      setStatus('Preview ready');
    } catch (err) {
      setStatus('Preview error: ' + err.message);
    } finally {
      progressBar.style.display = 'none';
    }
  }

  // === Apply & Save ===
  applyBtn.addEventListener('click', async () => {
    if (!pdfLoaded) return;

    const config = WatermarkUI.getConfig();
    if (config.type === 'image' && !imageLoaded) {
      setStatus('Please select a watermark image first');
      return;
    }

    try {
      setStatus('Applying watermark...');
      progressBar.style.display = 'block';
      progressBar.removeAttribute('value');

      const resultBytes = await window.api.applyWatermark(config);
      const saved = await window.api.savePdf(resultBytes);

      if (saved) {
        setStatus('Watermarked PDF saved successfully!');
      } else {
        setStatus('Save cancelled');
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      progressBar.style.display = 'none';
    }
  });

  // === Page Navigation ===
  document.getElementById('btn-prev-page').addEventListener('click', () => PreviewManager.prevPage());
  document.getElementById('btn-next-page').addEventListener('click', () => PreviewManager.nextPage());
  document.getElementById('btn-zoom-in').addEventListener('click', () => PreviewManager.zoomIn());
  document.getElementById('btn-zoom-out').addEventListener('click', () => PreviewManager.zoomOut());
  document.getElementById('btn-zoom-fit').addEventListener('click', () => PreviewManager.zoomFit());

  // === Batch Mode ===
  document.getElementById('btn-batch-mode').addEventListener('click', () => BatchManager.show());
  document.getElementById('btn-close-batch').addEventListener('click', () => BatchManager.hide());
  document.getElementById('btn-batch-select').addEventListener('click', () => BatchManager.selectFiles());
  document.getElementById('btn-batch-start').addEventListener('click', () => {
    BatchManager.startProcessing(() => WatermarkUI.getConfig());
  });

  // === Templates ===
  document.getElementById('btn-save-template').addEventListener('click', async () => {
    const config = WatermarkUI.getConfig();
    const saved = await window.api.saveTemplate(config);
    if (saved) setStatus('Template saved');
  });

  document.getElementById('btn-load-template').addEventListener('click', async () => {
    try {
      const template = await window.api.loadTemplate();
      if (template) {
        WatermarkUI.setConfig(template);
        setStatus('Template loaded');
        if (pdfLoaded) await generatePreview();
      }
    } catch (err) {
      setStatus('Error loading template: ' + err.message);
    }
  });

  // === Theme Toggle ===
  document.getElementById('btn-theme').addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('btn-theme').textContent = isDark ? '\u263E' : '\u2600';
  });

  // === Keyboard Shortcuts ===
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      document.getElementById('btn-open-pdf').click();
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (!applyBtn.disabled) applyBtn.click();
    }
  });

  // === Drag & Drop ===
  const container = document.getElementById('preview-container');
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.outline = '2px dashed var(--accent)';
  });

  container.addEventListener('dragleave', () => {
    container.style.outline = '';
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.outline = '';
    // Drag & drop would need additional IPC for file path access in sandboxed renderer
    setStatus('Drag & drop: Please use the "Open PDF" button to load files');
  });

  // === Helpers ===
  function setStatus(msg) {
    statusText.textContent = msg;
  }

  setStatus('Ready — Open a PDF to get started');
})();
