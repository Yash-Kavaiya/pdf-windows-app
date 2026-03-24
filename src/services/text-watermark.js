'use strict';

const { PDFDocument, rgb, degrees, StandardFonts, pushGraphicsState, popGraphicsState } = require('pdf-lib');
const { parsePageRange } = require('./page-range');

/**
 * Position presets — returns {x, y} in PDF points relative to page dimensions.
 */
function calculatePosition(pageWidth, pageHeight, position, textWidth, textHeight) {
  const margin = 40;
  const presets = {
    'top-left':      { x: margin, y: pageHeight - margin - textHeight },
    'top-center':    { x: (pageWidth - textWidth) / 2, y: pageHeight - margin - textHeight },
    'top-right':     { x: pageWidth - margin - textWidth, y: pageHeight - margin - textHeight },
    'center-left':   { x: margin, y: (pageHeight - textHeight) / 2 },
    'center':        { x: (pageWidth - textWidth) / 2, y: (pageHeight - textHeight) / 2 },
    'center-right':  { x: pageWidth - margin - textWidth, y: (pageHeight - textHeight) / 2 },
    'bottom-left':   { x: margin, y: margin },
    'bottom-center': { x: (pageWidth - textWidth) / 2, y: margin },
    'bottom-right':  { x: pageWidth - margin - textWidth, y: margin },
  };

  if (typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
    // Custom position as percentage of page dimensions
    return {
      x: (position.x / 100) * pageWidth,
      y: (position.y / 100) * pageHeight,
    };
  }

  return presets[position] || presets['center'];
}

/**
 * Generate tiling positions across the page.
 */
function getTilingPositions(pageWidth, pageHeight, textWidth, textHeight, spacingX, spacingY) {
  const positions = [];
  const cols = Math.ceil(pageWidth / spacingX) + 1;
  const rows = Math.ceil(pageHeight / spacingY) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: col * spacingX - textWidth / 2,
        y: row * spacingY - textHeight / 2,
      });
    }
  }
  return positions;
}

/**
 * Map font name strings to StandardFonts enum values.
 */
function resolveFont(fontName) {
  const fontMap = {
    'helvetica': StandardFonts.Helvetica,
    'helvetica-bold': StandardFonts.HelveticaBold,
    'times-roman': StandardFonts.TimesRoman,
    'times-bold': StandardFonts.TimesRomanBold,
    'courier': StandardFonts.Courier,
    'courier-bold': StandardFonts.CourierBold,
  };
  return fontMap[(fontName || 'helvetica').toLowerCase()] || StandardFonts.Helvetica;
}

/**
 * Add text watermark to PDF bytes.
 *
 * @param {Uint8Array|ArrayBuffer} pdfBytes - Input PDF
 * @param {object} config - Watermark configuration
 * @param {string} config.text - Watermark text
 * @param {number} [config.fontSize=48] - Font size in points
 * @param {string} [config.fontFamily='helvetica'] - Font family
 * @param {{r:number, g:number, b:number}} [config.color] - RGB color (0-1 range)
 * @param {number} [config.opacity=30] - Opacity percentage (0-100)
 * @param {number} [config.rotation=45] - Rotation in degrees
 * @param {string|{x:number,y:number}} [config.position='center'] - Position preset or custom
 * @param {boolean} [config.tiling=false] - Enable tiling/repeat
 * @param {string} [config.pageRange='all'] - Page range string
 * @returns {Promise<Uint8Array>} Watermarked PDF bytes
 */
async function addTextWatermark(pdfBytes, config) {
  const {
    text = 'WATERMARK',
    fontSize = 48,
    fontFamily = 'helvetica',
    color = { r: 0.5, g: 0.5, b: 0.5 },
    opacity = 30,
    rotation = 45,
    position = 'center',
    tiling = false,
    pageRange = 'all',
  } = config;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(resolveFont(fontFamily));
  const pages = pdfDoc.getPages();
  const selectedIndices = parsePageRange(pageRange, pages.length);

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  for (const idx of selectedIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();

    if (tiling) {
      const spacingX = textWidth + 100;
      const spacingY = textHeight + 100;
      const positions = getTilingPositions(width, height, textWidth, textHeight, spacingX, spacingY);

      for (const pos of positions) {
        page.drawText(text, {
          x: pos.x,
          y: pos.y,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity: opacity / 100,
          rotate: degrees(rotation),
        });
      }
    } else {
      const pos = calculatePosition(width, height, position, textWidth, textHeight);
      page.drawText(text, {
        x: pos.x,
        y: pos.y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: opacity / 100,
        rotate: degrees(rotation),
      });
    }
  }

  return pdfDoc.save();
}

module.exports = { addTextWatermark, calculatePosition, resolveFont };
