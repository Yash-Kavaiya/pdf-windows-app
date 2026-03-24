'use strict';

/**
 * PDF Preview module — renders PDF pages to canvas using pdf.js via a worker-free setup.
 */
const PreviewManager = (() => {
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let zoomLevel = 1.0;
  let rendering = false;

  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('preview-container');
  const placeholder = container.querySelector('.preview-placeholder');
  const pageIndicator = document.getElementById('page-indicator');
  const zoomDisplay = document.getElementById('zoom-level');

  /**
   * Load a PDF from bytes and render the first page.
   */
  async function loadPdf(pdfBytes) {
    const pdfjsLib = await getPdfjsLib();
    const typedArray = new Uint8Array(pdfBytes);
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    placeholder.style.display = 'none';
    canvas.style.display = 'block';
    updatePageControls();
    await renderPage(currentPage);
  }

  /**
   * Render a specific page.
   */
  async function renderPage(pageNum) {
    if (!pdfDoc || rendering) return;
    rendering = true;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoomLevel * 1.5 }); // 1.5x for sharpness

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    } finally {
      rendering = false;
    }
  }

  function updatePageControls() {
    pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
    document.getElementById('btn-prev-page').disabled = currentPage <= 1;
    document.getElementById('btn-next-page').disabled = currentPage >= totalPages;
    zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      updatePageControls();
      renderPage(currentPage);
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      updatePageControls();
      renderPage(currentPage);
    }
  }

  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.25, 3.0);
    updatePageControls();
    renderPage(currentPage);
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.25, 0.25);
    updatePageControls();
    renderPage(currentPage);
  }

  function zoomFit() {
    zoomLevel = 1.0;
    updatePageControls();
    renderPage(currentPage);
  }

  function getPageCount() {
    return totalPages;
  }

  /**
   * Dynamically load pdf.js library.
   */
  let pdfjsLibCached = null;
  async function getPdfjsLib() {
    if (pdfjsLibCached) return pdfjsLibCached;

    // pdf.js is loaded via the node_modules path in Electron
    const pdfjsLib = require('pdfjs-dist');
    // Disable worker for simplicity in Electron
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    pdfjsLibCached = pdfjsLib;
    return pdfjsLib;
  }

  return {
    loadPdf,
    renderPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    zoomFit,
    getPageCount,
    getCurrentPage: () => currentPage,
  };
})();
