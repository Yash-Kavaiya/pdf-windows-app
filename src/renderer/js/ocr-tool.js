'use strict';

/**
 * OCR Tool
 * 1. Fetches the current PDF bytes from the main process
 * 2. Renders each page to an offscreen canvas using pdf.js
 * 3. Sends each page image (base64) to the main process for Tesseract OCR
 * 4. Displays the accumulated text in the output textarea
 */
const OcrTool = (() => {
  const btnRun      = document.getElementById('btn-ocr-run');
  const btnSaveTxt  = document.getElementById('btn-ocr-save-txt');
  const langSelect  = document.getElementById('ocr-lang');
  const textOutput  = document.getElementById('ocr-text-output');
  const progressInfo = document.getElementById('ocr-progress-info');
  const progressBar  = document.getElementById('ocr-progress-bar');
  const progressText = document.getElementById('ocr-progress-text');

  let extractedText = '';

  function setPdfLoaded(loaded) {
    btnRun.disabled = !loaded;
    if (!loaded) {
      btnSaveTxt.disabled = true;
      extractedText = '';
      textOutput.value = '';
    }
  }

  /** Lazily load pdf.js (reuse the same app:// module already cached by preview.js) */
  let pdfjsLib = null;
  async function getPdfjsLib() {
    if (pdfjsLib) return pdfjsLib;
    pdfjsLib = await import('app://localhost/node_modules/pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'app://localhost/node_modules/pdfjs-dist/build/pdf.worker.mjs';
    return pdfjsLib;
  }

  /** Render a single pdf.js page to a base64 PNG at the given scale. */
  async function renderPageToDataUrl(pdfDoc, pageNum, scale = 2.0) {
    const page     = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas  = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  async function run(setStatus) {
    const lang = langSelect.value;
    progressInfo.style.display = 'flex';
    progressBar.value = 0;
    textOutput.value = '';
    extractedText = '';
    btnSaveTxt.disabled = true;

    try {
      setStatus('Loading PDF for OCR…');
      const bytesArr = await window.api.getCurrentPdf();
      if (!bytesArr) throw new Error('No PDF loaded');

      const pdfjs = await getPdfjsLib();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytesArr) });
      const pdfDoc = await loadingTask.promise;
      const total  = pdfDoc.numPages;

      setStatus(`Running OCR on ${total} page(s)…`);

      for (let i = 1; i <= total; i++) {
        progressText.textContent = `Processing page ${i} / ${total}…`;
        progressBar.value = Math.round(((i - 1) / total) * 100);

        const dataUrl  = await renderPageToDataUrl(pdfDoc, i);
        const pageText = await window.api.ocrPage(dataUrl, lang);

        extractedText += `--- Page ${i} ---\n${pageText.trim()}\n\n`;
        textOutput.value = extractedText;
        textOutput.scrollTop = textOutput.scrollHeight;
      }

      progressBar.value = 100;
      progressText.textContent = `Done — ${total} page(s) processed`;
      btnSaveTxt.disabled = false;
      setStatus(`OCR complete — ${total} page(s) extracted`);
    } catch (err) {
      setStatus('OCR error: ' + err.message);
      progressInfo.style.display = 'none';
    }
  }

  btnRun.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('tool-action', { detail: { tool: 'ocr' } }));
  });

  btnSaveTxt.addEventListener('click', async () => {
    if (!extractedText) return;
    // Use a data URL to trigger a save-as dialog via IPC
    document.dispatchEvent(new CustomEvent('tool-action', { detail: { tool: 'ocr-save' } }));
  });

  function getText() { return extractedText; }

  return { run, setPdfLoaded, getText };
})();
