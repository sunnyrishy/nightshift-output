FILENAME: index.js
```javascript
/**
 * Canvas Version Diff - Granular Change Highlighting
 * Provides character/word-level diff visualization with performance guarantees
 */

class CanvasVersionDiff {
  constructor(options = {}) {
    this.performanceThreshold = options.performanceThreshold || 500; // ms
    this.maxConfigSize = options.maxConfigSize || 10240; // bytes
  }

  /**
   * Main entry point: compare two canvas configurations
   * @param {string|object} oldConfig - Previous canvas state
   * @param {string|object} newConfig - Current canvas state
   * @returns {object} Diff result with line-level and word-level changes
   */
  diff(oldConfig, newConfig) {
    const startTime = performance.now();

    // Validate input size
    const oldStr = this._normalize(oldConfig);
    const newStr = this._normalize(newConfig);
    
    if (oldStr.length > this.maxConfigSize || newStr.length > this.maxConfigSize) {
      throw new Error(`Config exceeds max size of ${this.maxConfigSize} bytes`);
    }

    // Split into lines
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    // Compute line-level diff using Myers algorithm
    const lineDiff = this._computeLineDiff(oldLines, newLines);

    // Compute word-level diffs for changed lines
    const wordDiff = this._computeWordDiffs(lineDiff, oldLines, newLines);

    // Apply styling
    const styled = this._applyStyling(wordDiff);

    const duration = performance.now() - startTime;

    if (duration > this.performanceThreshold) {
      console.warn(
        `Diff computation took ${duration.toFixed(2)}ms, exceeds threshold of ${this.performanceThreshold}ms`
      );
    }

    return {
      lines: styled,
      stats: {
        added: styled.filter(l => l.type === 'add').length,
        deleted: styled.filter(l => l.type === 'delete').length,
        unchanged: styled.filter(l => l.type === 'unchanged').length,
        duration: duration.toFixed(2),
      },
    };
  }

  /**
   * Normalize config to string (handles JSON objects)
   */
  _normalize(config) {
    return typeof config === 'string' ? config : JSON.stringify(config, null, 2);
  }

  /**
   * Myers diff algorithm for line-level comparison
   * O(n*m) worst case, but typically O((n+m)*d) where d is diff size
   */
  _computeLineDiff(oldLines, newLines) {
    const matrix = this._buildDiffMatrix(oldLines, newLines);
    return this._tracebackDiff(matrix, oldLines, newLines);
  }

  /**
   * Build dynamic programming matrix for LCS
   */
  _buildDiffMatrix(oldLines, newLines) {
    const m = oldLines.length;
    const n = newLines.length;
    const matrix = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    return matrix;
  }

  /**
   * Traceback from matrix to determine edit operations
   */
  _tracebackDiff(matrix, oldLines, newLines) {
    const result = [];
    let i = oldLines.length;
    let j = newLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.unshift({
          type: 'unchanged',
          line: oldLines[i - 1],
          oldIndex: i - 1,
          newIndex: j - 1,
          words: null,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
        result.unshift({
          type: 'add',
          line: newLines[j - 1],
          oldIndex: null,
          newIndex: j - 1,
          words: null,
        });
        j--;
      } else if (i > 0) {
        result.unshift({
          type: 'delete',
          line: oldLines[i - 1],
          oldIndex: i - 1,
          newIndex: null,
          words: null,
        });
        i--;
      }
    }

    return result;
  }

  /**
   * Compute word-level diffs for changed lines
   */
  _computeWordDiffs(lineDiff, oldLines, newLines) {
    return lineDiff.map((entry) => {
      if (entry.type === 'unchanged') {
        return { ...entry, words: this._tokenizeLine(entry.line) };
      }

      // For changed lines, find word-level differences
      const oldLine = entry.oldIndex !== null ? oldLines[entry.oldIndex] : '';
      const newLine = entry.newIndex !== null ? newLines[entry.newIndex] : '';

      const oldWords = this._tokenizeLine(oldLine);
      const newWords = this._tokenizeLine(newLine);

      const wordDiff = this._computeWordDiff(oldWords, newWords);

      return {
        ...entry,
        words: entry.type === 'add' ? newWords : oldWords,
        wordDiff: wordDiff,
      };
    });
  }

  /**
   * Tokenize line into words (space-delimited)
   */
  _tokenizeLine(line) {
    if (!line) return [];
    return line.split(/(\s+)/).filter(Boolean);
  }

  /**
