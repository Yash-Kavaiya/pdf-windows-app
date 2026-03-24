'use strict';

/**
 * Compress Tool — compresses the currently loaded PDF and shows size reduction stats.
 */
const CompressTool = (() => {
  const btnRun      = document.getElementById('btn-compress-run');
  const statsBox    = document.getElementById('compress-stats');
  const origSizeEl  = document.getElementById('compress-orig-size');
  const newSizeEl   = document.getElementById('compress-new-size');
  const savingEl    = document.getElementById('compress-saving');
  const resultMsg   = document.getElementById('compress-result-msg');

  function setPdfLoaded(loaded) {
    btnRun.disabled = !loaded;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  async function run(setStatus, showProgress, hideProgress) {
    try {
      setStatus('Compressing PDF…');
      showProgress();
      statsBox.style.display = 'none';

      const result = await window.api.compressPdf();

      const saved = result.originalSize - result.compressedSize;
      const pct   = ((saved / result.originalSize) * 100).toFixed(1);

      origSizeEl.textContent = formatBytes(result.originalSize);
      newSizeEl.textContent  = formatBytes(result.compressedSize);
      savingEl.textContent   = saved > 0
        ? `${formatBytes(saved)} (${pct}%)`
        : 'Already optimal';
      statsBox.style.display = 'block';

      if (saved <= 0) {
        setStatus('PDF is already optimally compressed');
        resultMsg.textContent = 'No further compression possible.';
        hideProgress();
        return;
      }

      const savedFile = await window.api.savePdf(result.bytes);
      if (savedFile) {
        setStatus(`Compressed PDF saved — saved ${formatBytes(saved)} (${pct}%)`);
        resultMsg.textContent = `Saved ${formatBytes(saved)} (${pct}% smaller)`;
      } else {
        setStatus('Save cancelled');
        resultMsg.textContent = '';
      }
    } catch (err) {
      setStatus('Compress error: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  btnRun.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('tool-action', { detail: { tool: 'compress' } }));
  });

  return { run, setPdfLoaded };
})();
