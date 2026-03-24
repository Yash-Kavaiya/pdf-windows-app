'use strict';

/**
 * Batch processing module — manages batch modal and file processing.
 */
const BatchManager = (() => {
  const modal = document.getElementById('batch-modal');
  const fileList = document.getElementById('batch-file-list');
  const startBtn = document.getElementById('btn-batch-start');
  const progressInfo = document.getElementById('batch-progress-info');
  const progressBar = document.getElementById('batch-progress-bar');
  const progressText = document.getElementById('batch-progress-text');
  const resultsDiv = document.getElementById('batch-results');

  let selectedFiles = [];

  function show() {
    modal.style.display = 'flex';
    resetState();
  }

  function hide() {
    modal.style.display = 'none';
    resetState();
  }

  function resetState() {
    selectedFiles = [];
    fileList.innerHTML = '<p class="hint">No files selected</p>';
    startBtn.disabled = true;
    progressInfo.style.display = 'none';
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
  }

  async function selectFiles() {
    const paths = await window.api.openPdfs();
    if (!paths || paths.length === 0) return;

    selectedFiles = paths;
    startBtn.disabled = false;

    fileList.innerHTML = '';
    paths.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'file-entry';
      div.textContent = p.split(/[\\/]/).pop(); // Get filename
      fileList.appendChild(div);
    });
  }

  async function startProcessing(getConfigFn) {
    if (selectedFiles.length === 0) return;

    const config = getConfigFn();
    startBtn.disabled = true;
    progressInfo.style.display = 'flex';
    progressBar.value = 0;
    resultsDiv.style.display = 'none';

    // Listen for progress updates
    window.api.onBatchProgress(({ index, total, filename }) => {
      const percent = Math.round((index / total) * 100);
      progressBar.value = percent;
      progressText.textContent = `Processing: ${filename} (${index + 1}/${total})`;
    });

    try {
      const result = await window.api.batchProcess(config);
      if (!result) {
        progressInfo.style.display = 'none';
        startBtn.disabled = false;
        return;
      }

      progressBar.value = 100;
      progressText.textContent = 'Complete!';

      // Show results
      resultsDiv.style.display = 'block';
      let html = `<strong>Results:</strong><br>`;
      html += `Successful: ${result.success.length}<br>`;
      if (result.errors.length > 0) {
        html += `<span style="color: var(--danger);">Errors: ${result.errors.length}</span><br>`;
        result.errors.forEach((e) => {
          html += `<br>- ${e.file.split(/[\\/]/).pop()}: ${e.error}`;
        });
      }
      resultsDiv.innerHTML = html;
    } catch (err) {
      progressText.textContent = 'Error: ' + err.message;
    } finally {
      window.api.removeBatchProgress();
      startBtn.disabled = false;
    }
  }

  return {
    show,
    hide,
    selectFiles,
    startProcessing,
  };
})();
