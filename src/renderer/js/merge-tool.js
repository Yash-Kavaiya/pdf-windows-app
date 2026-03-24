'use strict';

/**
 * Merge Tool — lets users add multiple PDFs, reorder them, and merge into one.
 */
const MergeTool = (() => {
  let filePaths = [];

  const fileList    = document.getElementById('merge-file-list');
  const summary     = document.getElementById('merge-summary');
  const btnAdd      = document.getElementById('btn-merge-add');
  const btnClear    = document.getElementById('btn-merge-clear');
  const btnRun      = document.getElementById('btn-merge-run');

  function render() {
    if (filePaths.length === 0) {
      fileList.innerHTML = '<p class="hint list-empty-hint">No files added yet</p>';
      btnClear.style.display = 'none';
      btnRun.disabled = true;
      summary.textContent = '';
      return;
    }

    fileList.innerHTML = '';
    filePaths.forEach((fp, idx) => {
      const name = fp.split(/[\\/]/).pop();
      const entry = document.createElement('div');
      entry.className = 'merge-file-entry';
      entry.innerHTML = `
        <span class="file-order">${idx + 1}.</span>
        <span class="file-name" title="${fp}">${name}</span>
        <button data-action="up"   data-idx="${idx}" title="Move up"   ${idx === 0 ? 'disabled' : ''}>&#9650;</button>
        <button data-action="down" data-idx="${idx}" title="Move down" ${idx === filePaths.length - 1 ? 'disabled' : ''}>&#9660;</button>
        <button data-action="del"  data-idx="${idx}" title="Remove">&#10005;</button>
      `;
      fileList.appendChild(entry);
    });

    btnClear.style.display = 'inline-flex';
    btnRun.disabled = filePaths.length < 2;
    summary.textContent = `${filePaths.length} file${filePaths.length === 1 ? '' : 's'} ready to merge`;
  }

  fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = parseInt(btn.dataset.idx, 10);

    if (action === 'up' && idx > 0) {
      [filePaths[idx - 1], filePaths[idx]] = [filePaths[idx], filePaths[idx - 1]];
    } else if (action === 'down' && idx < filePaths.length - 1) {
      [filePaths[idx], filePaths[idx + 1]] = [filePaths[idx + 1], filePaths[idx]];
    } else if (action === 'del') {
      filePaths.splice(idx, 1);
    }
    render();
  });

  btnAdd.addEventListener('click', async () => {
    const selected = await window.api.selectPdfsForMerge();
    if (selected && selected.length > 0) {
      // Avoid duplicates
      selected.forEach((p) => {
        if (!filePaths.includes(p)) filePaths.push(p);
      });
      render();
    }
  });

  btnClear.addEventListener('click', () => {
    filePaths = [];
    render();
  });

  async function run(setStatus, showProgress, hideProgress) {
    if (filePaths.length < 2) return;
    try {
      setStatus('Merging PDFs...');
      showProgress();
      const mergedBytes = await window.api.mergePdfs(filePaths);
      const saved = await window.api.savePdf(mergedBytes);
      if (saved) {
        setStatus(`Merged ${filePaths.length} files saved successfully!`);
        summary.textContent = `Done — ${filePaths.length} files merged.`;
      } else {
        setStatus('Save cancelled');
      }
    } catch (err) {
      setStatus('Merge error: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  btnRun.addEventListener('click', () => {
    // Delegated to app.js via the custom event
    document.dispatchEvent(new CustomEvent('tool-action', { detail: { tool: 'merge' } }));
  });

  return { run };
})();
