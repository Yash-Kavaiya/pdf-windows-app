'use strict';

const { PDFDocument, degrees } = require('pdf-lib');
const { parsePageRange } = require('./page-range');

/**
 * Calculate position for image watermark on a page.
 */
function calculateImagePosition(pageWidth, pageHeight, position, imgWidth, imgHeight) {
  const margin = 40;
  const presets = {
    'top-left':      { x: margin, y: pageHeight - margin - imgHeight },
    'top-center':    { x: (pageWidth - imgWidth) / 2, y: pageHeight - margin - imgHeight },
    'top-right':     { x: pageWidth - margin - imgWidth, y: pageHeight - margin - imgHeight },
    'center-left':   { x: margin, y: (pageHeight - imgHeight) / 2 },
    'center':        { x: (pageWidth - imgWidth) / 2, y: (pageHeight - imgHeight) / 2 },
    'center-right':  { x: pageWidth - margin - imgWidth, y: (pageHeight - imgHeight) / 2 },
    'bottom-left':   { x: margin, y: margin },
    'bottom-center': { x: (pageWidth - imgWidth) / 2, y: margin },
    'bottom-right':  { x: pageWidth - margin - imgWidth, y: margin },
  };

  if (typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
    return {
      x: (position.x / 100) * pageWidth,
      y: (position.y / 100) * pageHeight,
    };
  }

  return presets[position] || presets['center'];
}

/**
 * Generate tiling positions for image watermark.
 */
function getImageTilingPositions(pageWidth, pageHeight, imgWidth, imgHeight) {
  const positions = [];
  const spacingX = imgWidth + 80;
  const spacingY = imgHeight + 80;
  const cols = Math.ceil(pageWidth / spacingX) + 1;
  const rows = Math.ceil(pageHeight / spacingY) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: col * spacingX,
        y: row * spacingY,
      });
    }
  }
  return positions;
}

/**
 * Detect image type from the first bytes.
 */
function detectImageType(imageBytes) {
  const arr = new Uint8Array(imageBytes);
  // PNG starts with 0x89504E47
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
    return 'png';
  }
  // JPEG starts with 0xFFD8FF
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
    return 'jpg';
  }
  throw new Error('Unsupported image format. Please use PNG or JPG.');
}

/**
 * Add image watermark to PDF bytes.
 *
 * @param {Uint8Array|ArrayBuffer} pdfBytes - Input PDF
 * @param {Uint8Array|ArrayBuffer} imageBytes - Watermark image (PNG or JPG)
 * @param {object} config - Watermark configuration
 * @param {number} [config.scale=50] - Image scale percentage (10-300)
 * @param {number} [config.opacity=30] - Opacity percentage (0-100)
 * @param {number} [config.rotation=0] - Rotation in degrees
 * @param {string|{x:number,y:number}} [config.position='center'] - Position preset or custom
 * @param {boolean} [config.tiling=false] - Enable tiling/repeat
 * @param {string} [config.pageRange='all'] - Page range string
 * @returns {Promise<Uint8Array>} Watermarked PDF bytes
 */
async function addImageWatermark(pdfBytes, imageBytes, config) {
  const {
    scale = 50,
    opacity = 30,
    rotation = 0,
    position = 'center',
    tiling = false,
    pageRange = 'all',
  } = config;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const imageType = detectImageType(imageBytes);

  let image;
  if (imageType === 'png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  const scaleFactor = scale / 100;
  const imgWidth = image.width * scaleFactor;
  const imgHeight = image.height * scaleFactor;

  const pages = pdfDoc.getPages();
  const selectedIndices = parsePageRange(pageRange, pages.length);

  for (const idx of selectedIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();

    if (tiling) {
      const positions = getImageTilingPositions(width, height, imgWidth, imgHeight);
      for (const pos of positions) {
        page.drawImage(image, {
          x: pos.x,
          y: pos.y,
          width: imgWidth,
          height: imgHeight,
          opacity: opacity / 100,
          rotate: degrees(rotation),
        });
      }
    } else {
      const pos = calculateImagePosition(width, height, position, imgWidth, imgHeight);
      page.drawImage(image, {
        x: pos.x,
        y: pos.y,
        width: imgWidth,
        height: imgHeight,
        opacity: opacity / 100,
        rotate: degrees(rotation),
      });
    }
  }

  return pdfDoc.save();
}

module.exports = { addImageWatermark, detectImageType };
