'use strict';

const fs = require('fs');
const path = require('path');
const { addTextWatermark } = require('./text-watermark');
const { addImageWatermark } = require('./image-watermark');

/**
 * Apply watermark to a single PDF file.
 *
 * @param {string} inputPath - Path to input PDF
 * @param {string} outputPath - Path to save watermarked PDF
 * @param {object} config - Watermark configuration
 * @param {string} config.type - 'text' or 'image'
 * @param {object} config.settings - Type-specific settings
 * @param {string} [config.imagePath] - Path to watermark image (for image type)
 * @returns {Promise<void>}
 */
async function applyWatermark(inputPath, outputPath, config) {
  const pdfBytes = fs.readFileSync(inputPath);

  let resultBytes;
  if (config.type === 'text') {
    resultBytes = await addTextWatermark(pdfBytes, config.settings);
  } else if (config.type === 'image') {
    if (!config.imagePath) {
      throw new Error('Image path is required for image watermarks');
    }
    const imageBytes = fs.readFileSync(config.imagePath);
    resultBytes = await addImageWatermark(pdfBytes, imageBytes, config.settings);
  } else {
    throw new Error(`Unknown watermark type: ${config.type}`);
  }

  fs.writeFileSync(outputPath, resultBytes);
}

/**
 * Apply watermark to a PDF from bytes (for preview).
 *
 * @param {Uint8Array} pdfBytes - PDF file bytes
 * @param {object} config - Watermark configuration
 * @param {Uint8Array} [imageBytes] - Image bytes (for image watermarks)
 * @returns {Promise<Uint8Array>} Watermarked PDF bytes
 */
async function applyWatermarkToBytes(pdfBytes, config, imageBytes) {
  if (config.type === 'text') {
    return addTextWatermark(pdfBytes, config.settings);
  } else if (config.type === 'image') {
    if (!imageBytes) {
      throw new Error('Image bytes are required for image watermarks');
    }
    return addImageWatermark(pdfBytes, imageBytes, config.settings);
  }
  throw new Error(`Unknown watermark type: ${config.type}`);
}

/**
 * Batch process multiple PDF files.
 *
 * @param {string[]} inputPaths - Array of input PDF paths
 * @param {string} outputDir - Directory to save watermarked PDFs
 * @param {object} config - Watermark configuration
 * @param {function} [onProgress] - Progress callback (index, total, filename)
 * @returns {Promise<{success: string[], errors: {file: string, error: string}[]}>}
 */
async function batchProcess(inputPaths, outputDir, config, onProgress) {
  const success = [];
  const errors = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    const filename = path.basename(inputPath, '.pdf') + '_watermarked.pdf';
    const outputPath = path.join(outputDir, filename);

    if (onProgress) {
      onProgress(i, inputPaths.length, path.basename(inputPath));
    }

    try {
      await applyWatermark(inputPath, outputPath, config);
      success.push(outputPath);
    } catch (err) {
      errors.push({ file: inputPath, error: err.message });
    }
  }

  if (onProgress) {
    onProgress(inputPaths.length, inputPaths.length, 'Done');
  }

  return { success, errors };
}

module.exports = { applyWatermark, applyWatermarkToBytes, batchProcess };
