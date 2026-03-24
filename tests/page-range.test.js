'use strict';

const { parsePageRange } = require('../src/services/page-range');

describe('parsePageRange', () => {
  const totalPages = 10;

  test('returns all pages for "all"', () => {
    expect(parsePageRange('all', totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('returns all pages for empty string', () => {
    expect(parsePageRange('', totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('returns all pages for null', () => {
    expect(parsePageRange(null, totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('returns odd pages (1,3,5,7,9 -> indices 0,2,4,6,8)', () => {
    expect(parsePageRange('odd', totalPages)).toEqual([0, 2, 4, 6, 8]);
  });

  test('returns even pages (2,4,6,8,10 -> indices 1,3,5,7,9)', () => {
    expect(parsePageRange('even', totalPages)).toEqual([1, 3, 5, 7, 9]);
  });

  test('parses single page number', () => {
    expect(parsePageRange('5', totalPages)).toEqual([4]);
  });

  test('parses page range', () => {
    expect(parsePageRange('2-5', totalPages)).toEqual([1, 2, 3, 4]);
  });

  test('parses comma-separated pages', () => {
    expect(parsePageRange('1,3,5', totalPages)).toEqual([0, 2, 4]);
  });

  test('parses mixed ranges and pages', () => {
    expect(parsePageRange('1-3,7,9-10', totalPages)).toEqual([0, 1, 2, 6, 8, 9]);
  });

  test('clamps to total pages', () => {
    expect(parsePageRange('8-15', totalPages)).toEqual([7, 8, 9]);
  });

  test('ignores invalid ranges', () => {
    expect(parsePageRange('5-3', totalPages)).toEqual([]);
  });

  test('ignores pages below 1', () => {
    expect(parsePageRange('0,-1', totalPages)).toEqual([]);
  });

  test('deduplicates overlapping ranges', () => {
    expect(parsePageRange('1-5,3-7', totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('handles whitespace', () => {
    expect(parsePageRange(' 1 , 3 , 5 ', totalPages)).toEqual([0, 2, 4]);
  });

  test('case insensitive for keywords', () => {
    expect(parsePageRange('ALL', totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(parsePageRange('ODD', totalPages)).toEqual([0, 2, 4, 6, 8]);
    expect(parsePageRange('Even', totalPages)).toEqual([1, 3, 5, 7, 9]);
  });
});
