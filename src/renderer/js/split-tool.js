'use strict';

/**
 * Split Tool — splits the currently loaded PDF by pages or custom ranges.
 */
const SplitTool = (() => {
  const btnRun          = document.getElementById('btn-split-run');
  const rangeGroup      = document.getElementById('split-range-group');
  const rangesTextarea  = document.getElementById('split-ranges');
  const progressInfo    = document.getElementById('split-progress-info');
  const progressBar     = document.getElementById('split-progress-bar');
  const progressText    = document.getElementById('split-progress-text');

  // Show/hide range textarea based on selected mode
  document.querySelectorAll('input[name="split-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      rangeGroup.style.display = radio.value === 'range' ? 'block' : 'none';
    });
  });

  /** Called by app.js when a PDF is loaded / unloaded */
  function setPdfLoaded(loaded) {
    btnRun.disabled = !loaded;
  }

  /** Parse "1-3\n5\n7-9" into [{start,end}] */
  function parseRanges(text) {
    return text.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const m = line.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
        if (!m) return null;
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : start;
        return { start, end, name: `part_${i + 1}_p${start}-${end}` };
      })
      .filter(Boolean);
  }

  async function run(setStatus) {
    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    const opts = { mode };

    if (mode === 'range') {
      opts.ranges = parseRanges(rangesTextarea.value);
      if (opts.ranges.length === 0) {
        setStatus('Please enter at least one page range');
        return;
      }
    }

    try {
      setStatus('Splitting PDF…');
      progressInfo.style.display = 'flex';
      progressBar.value = 0;
      progressText.textContent = 'Starting…';

      window.api.onSplitProgress((d) => {
        const pct = Math.round((d.current / d.total) * 100);
        progressBar.value = pct;
        progressText.textContent = `Page ${d.current} / ${d.total}`;
      });

      const result = await window.api.splitPdf(opts);
      window.api.removeSplitProgress();

      if (result) {
        setStatus(`Split complete — ${result.files.length} file(s) saved to: ${result.outputDir}`);
        progressText.textContent = `Done — ${result.files.length} files saved`;
        progressBar.value = 100;
      } else {
        setStatus('Split cancelled');
        progressInfo.style.display = 'none';
      }
    } catch (err) {
      window.api.removeSplitProgress();
      setStatus('Split error: ' + err.message);
      progressInfo.style.display = 'none';
    }
  }

  btnRun.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('tool-action', { detail: { tool: 'split' } }));
  });

  return { run, setPdfLoaded };
})();
