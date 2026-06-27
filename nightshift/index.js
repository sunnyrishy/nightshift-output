FILENAME: index.js
```javascript
import { diffLines, diffChars } from 'diff';

/**
 * Canvas Version Diff Engine
 * Provides line-level and character-level diff highlighting
 */

class CanvasDiffEngine {
  constructor(options = {}) {
    this.cacheMap = new Map();
    this.performanceThreshold = options.performanceThreshold || 500;
    this.maxLines = options.maxLines || 5000;
  }

  /**
   * Generate comprehensive diff with line and character level changes
   * @param {string} oldContent - Original canvas content
   * @param {string} newContent - Modified canvas content
   * @returns {Object} Structured diff result with caching
   */
  generateDiff(oldContent, newContent) {
    const cacheKey = this._generateCacheKey(oldContent, newContent);
    
    if (this.cacheMap.has(cacheKey)) {
      return this.cacheMap.get(cacheKey);
    }

    const startTime = performance.now();

    // Phase 1: Line-level diff
    const lineDiffs = this._computeLineLevelDiff(oldContent, newContent);

    // Phase 2: Character-level diff for changed lines only
    const enrichedDiffs = this._enrichWithCharDiffs(lineDiffs);

    // Phase 3: Add context preservation
    const contextualDiffs = this._addContextLines(enrichedDiffs, oldContent, newContent);

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > this.performanceThreshold) {
      console.warn(`Diff computation took ${duration.toFixed(2)}ms, exceeds threshold of ${this.performanceThreshold}ms`);
    }

    const result = {
      hunks: contextualDiffs,
      stats: {
        additions: contextualDiffs.filter(d => d.type === 'add').length,
        removals: contextualDiffs.filter(d => d.type === 'remove').length,
        duration: duration
      }
    };

    // Cache result
    this.cacheMap.set(cacheKey, result);
    this._pruneCache();

    return result;
  }

  /**
   * Compute line-level differences
   * @private
   */
  _computeLineLevelDiff(oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const lineDiffs = diffLines(oldContent, newContent);
    const result = [];
    let newLineIndex = 0;
    let oldLineIndex = 0;

    for (const diff of lineDiffs) {
      const lines = diff.value.split('\n').filter(line => line.length > 0);

      if (diff.added) {
        for (const line of lines) {
          result.push({
            type: 'add',
            lineIndex: newLineIndex,
            content: line,
            charDiffs: [],
            originalIndex: null
          });
          newLineIndex++;
        }
      } else if (diff.removed) {
        for (const line of lines) {
          result.push({
            type: 'remove',
            lineIndex: oldLineIndex,
            content: line,
            charDiffs: [],
            originalIndex: oldLineIndex
          });
          oldLineIndex++;
        }
      } else {
        for (const line of lines) {
          result.push({
            t