'use strict';

/**
 * Parse a page range string into an array of zero-based page indices.
 *
 * Supported formats:
 *   "all"       — all pages
 *   "odd"       — odd-numbered pages (1, 3, 5, ...)
 *   "even"      — even-numbered pages (2, 4, 6, ...)
 *   "1-5,8,10-15" — specific pages and ranges (1-based input)
 *
 * @param {string} rangeStr - The page range string
 * @param {number} totalPages - Total number of pages in the PDF
 * @returns {number[]} Array of zero-based page indices
 */
function parsePageRange(rangeStr, totalPages) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return getAllPages(totalPages);
  }

  const trimmed = rangeStr.trim().toLowerCase();

  if (trimmed === 'all' || trimmed === '') {
    return getAllPages(totalPages);
  }

  if (trimmed === 'odd') {
    return getAllPages(totalPages).filter((i) => i % 2 === 0); // 0-based: page 1 is index 0
  }

  if (trimmed === 'even') {
    return getAllPages(totalPages).filter((i) => i % 2 === 1); // 0-based: page 2 is index 1
  }

  return parseCustomRange(trimmed, totalPages);
}

function getAllPages(totalPages) {
  return Array.from({ length: totalPages }, (_, i) => i);
}

function parseCustomRange(rangeStr, totalPages) {
  const indices = new Set();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-', 2);
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        continue;
      }

      for (let i = start; i <= Math.min(end, totalPages); i++) {
        indices.add(i - 1); // Convert to 0-based
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        indices.add(page - 1); // Convert to 0-based
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

module.exports = { parsePageRange };
