'use strict';

/**
 * Main application controller — ties together all tools and handles mode switching.
 */
(function App() {
  // ─── State ────────────────────────────────────────────────────────────────
  let pdfLoaded    = false;
  let imageLoaded  = false;
  let currentMode  = 'watermark';
  let lastPreviewBytes = null;

  // ─── DOM ──────────────────────────────────────────────────────────────────
  const fileInfo   = document.getElementById('file-info');
  const imageInfo  = document.getElementById('image-info');
  const statusText = document.getElementById('status-text');
  const applyBtn   = document.getElementById('btn-apply');
  const progressBar = document.getElementById('progress-bar');

  // ─── Init modules ─────────────────────────────────────────────────────────
  WatermarkUI.init();

  // ─── Mode switching ───────────────────────────────────────────────────────
  const modeBtns    = document.querySelectorAll('.mode-btn');
  const modePanels  = document.querySelectorAll('.mode-panel');
  const contentPanels = document.querySelectorAll('.content-panel');
  const wmOnlyEls   = document.querySelectorAll('.wm-only');

  function switchMode(mode) {
    currentMode = mode;

    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    modePanels.forEach((p) => p.classList.toggle('active', p.id === `mode-panel-${mode}`));

    // Content area
    const contentId = (mode === 'watermark' || mode === 'split') ? 'content-pdf-preview'
      : mode === 'merge'    ? 'content-merge'
      : mode === 'compress' ? 'content-compress'
      : /* ocr */             'content-ocr';
    contentPanels.forEach((p) => p.classList.toggle('active', p.id === contentId));

    // Toolbar buttons — only visible in watermark mode
    wmOnlyEls.forEach((el) => {
      el.style.display = mode === 'watermark' ? '' : 'none';
    });

    // Open PDF button changes label for merge mode (merge has its own add btn)
    document.getElementById('btn-open-pdf').style.display =
      mode === 'merge' ? 'none' : '';

    setStatus(
      mode === 'watermark' ? 'Watermark mode — open a PDF to get started'
      : mode === 'merge'    ? 'Merge mode — add PDF files in the sidebar'
      : mode === 'split'    ? 'Split mode — open a PDF to split it'
      : mode === 'compress' ? 'Compress mode — open a PDF to compress it'
      :                       'OCR mode — open a PDF to extract text'
    );
  }

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // ─── Open PDF ─────────────────────────────────────────────────────────────
  document.getElementById('btn-open-pdf').addEventListener('click', async () => {
    try {
      setStatus('Opening PDF…');
      const result = await window.api.openPdf();
      if (!result) { setStatus('Ready'); return; }

      const name = result.filePath.split(/[\\/]/).pop();
      fileInfo.textContent = `${name} (${result.pageCount} pages)`;
      pdfLoaded = true;
      applyBtn.disabled = false;

      // Notify tool modules
      SplitTool.setPdfLoaded(true);
      CompressTool.setPdfLoaded(true);
      OcrTool.setPdfLoaded(true);

      if (currentMode === 'watermark') {
        await generatePreview();
      } else if (currentMode === 'split' || currentMode === 'compress' || currentMode === 'ocr') {
        setStatus(`${name} loaded — ready`);
        if (currentMode === 'split') await generatePreview(); // show original in preview
      }
    } catch (err) {
      setStatus('Error loading PDF: ' + err.message);
    }
  });

  // ─── Watermark image ──────────────────────────────────────────────────────
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

  // ─── Preview (watermark) ──────────────────────────────────────────────────
  document.getElementById('btn-preview').addEventListener('click', generatePreview);

  async function generatePreview() {
    if (!pdfLoaded) { setStatus('Please load a PDF first'); return; }

    const config = WatermarkUI.getConfig();
    if (config.type === 'image' && !imageLoaded) {
      setStatus('Please select a watermark image first');
      return;
    }

    try {
      setStatus('Generating preview…');
      showProgress();
      const resultBytes = await window.api.generatePreview(config);
      lastPreviewBytes = resultBytes;
      await PreviewManager.loadPdf(resultBytes);
      setStatus('Preview ready');
    } catch (err) {
      setStatus('Preview error: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  // Auto-preview on settings change
  WatermarkUI.onChange(() => {
    if (pdfLoaded && currentMode === 'watermark') generatePreview();
  });

  // ─── Apply & Save (watermark) ─────────────────────────────────────────────
  applyBtn.addEventListener('click', async () => {
    if (!pdfLoaded) return;
    const config = WatermarkUI.getConfig();
    if (config.type === 'image' && !imageLoaded) {
      setStatus('Please select a watermark image first');
      return;
    }
    try {
      setStatus('Applying watermark…');
      showProgress();
      const resultBytes = await window.api.applyWatermark(config);
      const saved = await window.api.savePdf(resultBytes);
      setStatus(saved ? 'Watermarked PDF saved!' : 'Save cancelled');
    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      hideProgress();
    }
  });

  // ─── Page navigation ──────────────────────────────────────────────────────
  document.getElementById('btn-prev-page').addEventListener('click', () => PreviewManager.prevPage());
  document.getElementById('btn-next-page').addEventListener('click', () => PreviewManager.nextPage());
  document.getElementById('btn-zoom-in').addEventListener('click', () => PreviewManager.zoomIn());
  document.getElementById('btn-zoom-out').addEventListener('click', () => PreviewManager.zoomOut());
  document.getElementById('btn-zoom-fit').addEventListener('click', () => PreviewManager.zoomFit());

  // ─── Templates ────────────────────────────────────────────────────────────
  document.getElementById('btn-save-template').addEventListener('click', async () => {
    const saved = await window.api.saveTemplate(WatermarkUI.getConfig());
    if (saved) setStatus('Template saved');
  });

  document.getElementById('btn-load-template').addEventListener('click', async () => {
    try {
      const tpl = await window.api.loadTemplate();
      if (tpl) {
        WatermarkUI.setConfig(tpl);
        setStatus('Template loaded');
        if (pdfLoaded) await generatePreview();
      }
    } catch (err) {
      setStatus('Error loading template: ' + err.message);
    }
  });

  // ─── Batch ────────────────────────────────────────────────────────────────
  document.getElementById('btn-batch-mode').addEventListener('click', () => BatchManager.show());
  document.getElementById('btn-close-batch').addEventListener('click', () => BatchManager.hide());
  document.getElementById('btn-batch-select').addEventListener('click', () => BatchManager.selectFiles());
  document.getElementById('btn-batch-start').addEventListener('click', () => {
    BatchManager.startProcessing(() => WatermarkUI.getConfig());
  });

  // ─── Tool-action dispatcher ───────────────────────────────────────────────
  document.addEventListener('tool-action', async (e) => {
    const { tool } = e.detail;

    if (tool === 'merge') {
      await MergeTool.run(setStatus, showProgress, hideProgress);

    } else if (tool === 'split') {
      await SplitTool.run(setStatus);

    } else if (tool === 'compress') {
      await CompressTool.run(setStatus, showProgress, hideProgress);

    } else if (tool === 'ocr') {
      await OcrTool.run(setStatus);

    } else if (tool === 'ocr-save') {
      const text = OcrTool.getText();
      if (!text) return;
      const saved = await window.api.saveTxt(text);
      setStatus(saved ? 'OCR text saved!' : 'Save cancelled');
    }
  });

  // ─── Theme ────────────────────────────────────────────────────────────────
  document.getElementById('btn-theme').addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('btn-theme').textContent = isDark ? '\u263E' : '\u2600';
  });

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); document.getElementById('btn-open-pdf').click(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); if (!applyBtn.disabled) applyBtn.click(); }
  });

  // ─── Drag & drop ──────────────────────────────────────────────────────────
  const container = document.getElementById('preview-container');
  container.addEventListener('dragover', (e) => { e.preventDefault(); container.style.outline = '2px dashed var(--accent)'; });
  container.addEventListener('dragleave', () => { container.style.outline = ''; });
  container.addEventListener('drop', (e) => {
    e.preventDefault(); container.style.outline = '';
    setStatus('Drag & drop: use "Open PDF" button to load files');
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function setStatus(msg)  { statusText.textContent = msg; }
  function showProgress()  { progressBar.style.display = 'block'; progressBar.removeAttribute('value'); }
  function hideProgress()  { progressBar.style.display = 'none'; }

  setStatus('Ready — choose a tool above or open a PDF');
})();
