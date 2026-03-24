'use strict';

/**
 * Watermark UI configuration module — manages tabs and collects config values.
 */
const WatermarkUI = (() => {
  let currentTab = 'text';
  let onChangeCallback = null;

  // Tab switching
  function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;

        document.getElementById('panel-text').classList.toggle('active', currentTab === 'text');
        document.getElementById('panel-image').classList.toggle('active', currentTab === 'image');

        fireChange();
      });
    });
  }

  // Slider value display updates
  function initSliders() {
    const sliders = [
      { id: 'wm-font-size', display: 'wm-font-size-val' },
      { id: 'wm-opacity', display: 'wm-opacity-val' },
      { id: 'wm-rotation', display: 'wm-rotation-val' },
      { id: 'wm-img-scale', display: 'wm-img-scale-val' },
      { id: 'wm-img-opacity', display: 'wm-img-opacity-val' },
      { id: 'wm-img-rotation', display: 'wm-img-rotation-val' },
    ];

    sliders.forEach(({ id, display }) => {
      const slider = document.getElementById(id);
      const displayEl = document.getElementById(display);
      slider.addEventListener('input', () => {
        displayEl.textContent = slider.value;
        fireChange();
      });
    });
  }

  // Other input change listeners
  function initInputListeners() {
    const inputs = [
      'wm-text', 'wm-font-family', 'wm-color', 'wm-position', 'wm-tiling',
      'wm-img-position', 'wm-img-tiling',
    ];

    inputs.forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener('change', fireChange);
      if (el.type === 'text') {
        el.addEventListener('input', fireChange);
      }
    });

    // X/Y number inputs
    ['wm-x', 'wm-y', 'wm-img-x', 'wm-img-y'].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener('input', fireChange);
      el.addEventListener('change', fireChange);
    });
  }

  // Show/hide X/Y inputs when position dropdown changes
  function initPositionXY() {
    const posSelect = document.getElementById('wm-position');
    const posXyGroup = document.getElementById('wm-xy-group');
    posSelect.addEventListener('change', () => {
      posXyGroup.style.display = posSelect.value === 'custom-xy' ? 'block' : 'none';
    });

    const imgPosSelect = document.getElementById('wm-img-position');
    const imgPosXyGroup = document.getElementById('wm-img-xy-group');
    imgPosSelect.addEventListener('change', () => {
      imgPosXyGroup.style.display = imgPosSelect.value === 'custom-xy' ? 'block' : 'none';
    });
  }

  // Page range controls
  function initPageRange() {
    const radios = document.querySelectorAll('input[name="page-range"]');
    const customInput = document.getElementById('page-range-custom');

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        customInput.disabled = radio.value !== 'custom';
        fireChange();
      });
    });

    customInput.addEventListener('input', fireChange);
  }

  function fireChange() {
    if (onChangeCallback) {
      onChangeCallback(getConfig());
    }
  }

  /**
   * Get current watermark configuration.
   */
  function getConfig() {
    const pageRangeRadio = document.querySelector('input[name="page-range"]:checked');
    let pageRange = pageRangeRadio ? pageRangeRadio.value : 'all';
    if (pageRange === 'custom') {
      pageRange = document.getElementById('page-range-custom').value || 'all';
    }

    if (currentTab === 'text') {
      const hexColor = document.getElementById('wm-color').value;
      const r = parseInt(hexColor.slice(1, 3), 16) / 255;
      const g = parseInt(hexColor.slice(3, 5), 16) / 255;
      const b = parseInt(hexColor.slice(5, 7), 16) / 255;

      const posVal = document.getElementById('wm-position').value;
      const position = posVal === 'custom-xy'
        ? { x: parseInt(document.getElementById('wm-x').value, 10) || 50,
            y: parseInt(document.getElementById('wm-y').value, 10) || 50 }
        : posVal;

      return {
        type: 'text',
        settings: {
          text: document.getElementById('wm-text').value || 'WATERMARK',
          fontSize: parseInt(document.getElementById('wm-font-size').value, 10),
          fontFamily: document.getElementById('wm-font-family').value,
          color: { r, g, b },
          opacity: parseInt(document.getElementById('wm-opacity').value, 10),
          rotation: parseInt(document.getElementById('wm-rotation').value, 10),
          position,
          tiling: document.getElementById('wm-tiling').checked,
          pageRange,
        },
      };
    } else {
      const imgPosVal = document.getElementById('wm-img-position').value;
      const position = imgPosVal === 'custom-xy'
        ? { x: parseInt(document.getElementById('wm-img-x').value, 10) || 50,
            y: parseInt(document.getElementById('wm-img-y').value, 10) || 50 }
        : imgPosVal;

      return {
        type: 'image',
        settings: {
          scale: parseInt(document.getElementById('wm-img-scale').value, 10),
          opacity: parseInt(document.getElementById('wm-img-opacity').value, 10),
          rotation: parseInt(document.getElementById('wm-img-rotation').value, 10),
          position,
          tiling: document.getElementById('wm-img-tiling').checked,
          pageRange,
        },
      };
    }
  }

  /**
   * Set configuration values (e.g., from a loaded template).
   */
  function setConfig(config) {
    if (config.type === 'text') {
      // Switch to text tab
      document.querySelector('.tab[data-tab="text"]').click();

      const s = config.settings;
      document.getElementById('wm-text').value = s.text || 'WATERMARK';
      document.getElementById('wm-font-size').value = s.fontSize || 48;
      document.getElementById('wm-font-size-val').textContent = s.fontSize || 48;
      document.getElementById('wm-font-family').value = s.fontFamily || 'helvetica';

      if (s.color) {
        const hex = '#' +
          Math.round(s.color.r * 255).toString(16).padStart(2, '0') +
          Math.round(s.color.g * 255).toString(16).padStart(2, '0') +
          Math.round(s.color.b * 255).toString(16).padStart(2, '0');
        document.getElementById('wm-color').value = hex;
      }

      document.getElementById('wm-opacity').value = s.opacity ?? 30;
      document.getElementById('wm-opacity-val').textContent = s.opacity ?? 30;
      document.getElementById('wm-rotation').value = s.rotation ?? 45;
      document.getElementById('wm-rotation-val').textContent = s.rotation ?? 45;

      if (s.position && typeof s.position === 'object') {
        document.getElementById('wm-position').value = 'custom-xy';
        document.getElementById('wm-xy-group').style.display = 'block';
        document.getElementById('wm-x').value = s.position.x ?? 50;
        document.getElementById('wm-y').value = s.position.y ?? 50;
      } else {
        document.getElementById('wm-position').value = s.position || 'center';
        document.getElementById('wm-xy-group').style.display = 'none';
      }

      document.getElementById('wm-tiling').checked = s.tiling || false;
    } else if (config.type === 'image') {
      document.querySelector('.tab[data-tab="image"]').click();

      const s = config.settings;
      document.getElementById('wm-img-scale').value = s.scale || 50;
      document.getElementById('wm-img-scale-val').textContent = s.scale || 50;
      document.getElementById('wm-img-opacity').value = s.opacity ?? 30;
      document.getElementById('wm-img-opacity-val').textContent = s.opacity ?? 30;
      document.getElementById('wm-img-rotation').value = s.rotation ?? 0;
      document.getElementById('wm-img-rotation-val').textContent = s.rotation ?? 0;

      if (s.position && typeof s.position === 'object') {
        document.getElementById('wm-img-position').value = 'custom-xy';
        document.getElementById('wm-img-xy-group').style.display = 'block';
        document.getElementById('wm-img-x').value = s.position.x ?? 50;
        document.getElementById('wm-img-y').value = s.position.y ?? 50;
      } else {
        document.getElementById('wm-img-position').value = s.position || 'center';
        document.getElementById('wm-img-xy-group').style.display = 'none';
      }

      document.getElementById('wm-img-tiling').checked = s.tiling || false;
    }

    // Set page range
    if (config.settings && config.settings.pageRange) {
      const pr = config.settings.pageRange;
      if (['all', 'odd', 'even'].includes(pr)) {
        const radio = document.querySelector(`input[name="page-range"][value="${pr}"]`);
        if (radio) radio.checked = true;
        document.getElementById('page-range-custom').disabled = true;
      } else {
        const customRadio = document.querySelector('input[name="page-range"][value="custom"]');
        if (customRadio) customRadio.checked = true;
        document.getElementById('page-range-custom').disabled = false;
        document.getElementById('page-range-custom').value = pr;
      }
    }
  }

  function getCurrentTab() {
    return currentTab;
  }

  function onChange(callback) {
    onChangeCallback = callback;
  }

  function init() {
    initTabs();
    initSliders();
    initInputListeners();
    initPageRange();
    initPositionXY();
  }

  return {
    init,
    getConfig,
    setConfig,
    getCurrentTab,
    onChange,
  };
})();
