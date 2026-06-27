FILENAME: index.js
```javascript
import MarkdownIt from 'markdown-it';
import mermaid from 'mermaid';
import { highlightCode } from './syntax-highlighter';

// Configuration
const CONFIG = {
  MAX_DIAGRAMS: 10,
  RENDER_TIMEOUT_MS: 200,
  DIAGRAM_TIMEOUT_MS: 3000,
  FILE_SIZE_THRESHOLD: 5 * 1024 * 1024, // 5MB
  MERMAID_VERSION: '10.6.0'
};

// Initialize markdown parser
const md = new MarkdownIt({
  highlight: (code, lang) => {
    if (lang && lang !== 'mermaid') {
      return highlightCode(code, lang);
    }
    return code;
  }
});

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'antiscript'
});

class MarkdownPreviewRenderer {
  constructor(options = {}) {
    this.nodeCache = new Map();
    this.renderedDiagrams = 0;
    this.lazyLoadEnabled = options.lazyLoadEnabled || false;
    this.onNodeNavigate = options.onNodeNavigate || (() => {});
    this.getNodeMetadata = options.getNodeMetadata || (() => null);
    this.circularRefDetection = new Set();
  }

  /**
   * Main render method
   */
  async render(markdownContent, fileSize = 0) {
    const startTime = performance.now();
    this.renderedDiagrams = 0;
    this.circularRefDetection.clear();

    try {
      // Parse markdown to HTML
      let html = md.render(markdownContent);

      // Process mermaid diagrams
      html = await this.processMermaidDiagrams(
        html,
        fileSize > CONFIG.FILE_SIZE_THRESHOLD
      );

      // Process node references
      html = this.processNodeReferences(html);

      const renderTime = performance.now() - startTime;
      console.debug(`Markdown rendered in ${renderTime.toFixed(2)}ms`);

      return html;
    } catch (error) {
      console.error('Markdown render error:', error);
      return this.renderErrorFallback(markdownContent);
    }
  }

  /**
   * Process mermaid code blocks
   */
  async processMermaidDiagrams(html, useLazyLoad = false) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const codeBlocks = doc.querySelectorAll('pre code.language-mermaid');

    const processingTasks = [];

    codeBlocks.forEach((block, index) => {
      if (this.renderedDiagrams >= CONFIG.MAX_DIAGRAMS) {
        return;
      }

      const diagramContent = block.textContent;
      const preElement = block.parentElement;

      if (useLazyLoad) {
        preElement.setAttribute('data-lazy', 'true');
        preElement.setAttribute('data-diagram-id', `diagram-${index}`);
      }

      processingTasks.push(
        this.renderMermaidDiagram(diagramContent, index, preElement, useLazyLoad)
      );

      this.renderedDiagrams++;
    });

    // Execute with timeout constraint
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Diagram rendering timeout')), CONFIG.RENDER_TIMEOUT_MS)
    );

    try {
      await Promise.race([Promise.all(processingTasks), timeoutPromise]);
    } catch (error) {
      console.warn('Diagram processing timeout or error:', error);
    }

    return doc.documentElement.outerHTML;
  }

  /**
   * Render individual mermaid diagram with timeout
   */
  async renderMermaidDiagram(content, index, preElement, useLazyLoad = false) {
    const containerId = `mermaid-${index}`;
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'mermaid-container';

    if (useLazyLoad) {
      container.setAttribute('data-lazy', 'true');
      container.innerHTML = '';
    } else {
      container.innerHTML = content;
    }

    try {
      // Validate diagram syntax
      mermaid.parse(content);

      // Render with timeout
      await this.renderWithTimeout(content, containerId, CONFIG.DIAGRAM_TIMEOUT_MS);

      preElement.replaceWith(container);
    } catch (error) {
      this.renderDiagramError(preElement, content, error);
    }
  }

  /**
   * Render diagram with timeout protection
   */
  async renderWithTimeout(content, containerId, timeout) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Diagram too complex')), timeout)
    );

    const renderPromise = mermaid.render(containerId, content);

    return Promise.race([renderPromise, timeoutPromise]);
  }

  /**
   * Render diagram error state
   */
  renderDiagramError(preElement, content, error) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'mermaid-error';

    const errorMessage = error.message === 'Diagram too complex'
      ? 'Diagram too complex to render'
      : `Failed to render diagram: ${error.message}`;

    errorContainer.innerHTML = `
      <div class="error-header">${errorMessage}</div>
      <pre class="error-code"><code>${this.escapeHtml(content)}</code></pre>
    `;

    preElement.replaceWith(errorContainer);
  }

  /**
   * Process node references: [[node_id]] and @node_id
   */
  processNodeReferences(html) {
    const parser = new