import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import mermaid from 'mermaid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RENDER_SIZE = 2 * 1024 * 1024; // 2MB for rendered content

class MarkdownRenderer {
  constructor() {
    this.md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
    });

    this.setupMermaidPlugin();
    this.initMermaid();
  }

  initMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
    });
  }

  setupMermaidPlugin() {
    const defaultFence = this.md.renderer.rules.fence || this.defaultFence;

    this.md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info.trim();

      if (info === 'mermaid') {
        const code = token.content;
        return this.renderMermaidBlock(code);
      }

      return defaultFence.call(this, tokens, idx, options, env, self);
    };
  }

  defaultFence(tokens, idx) {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : '';
    const langName = info.split(/\s+/g)[0];
    const highlighted =
      langName && this.md.utils.escapeHtml(token.content);

    return (
      `<pre><code${langName ? ` class="language-${langName}"` : ''}>` +
      (highlighted || this.md.utils.escapeHtml(token.content)) +
      '</code></pre>\n'
    );
  }

  renderMermaidBlock(code) {
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    return `<div class="mermaid" id="${id}">${this.md.utils.escapeHtml(code)}</div>`;
  }

  sanitizeHtml(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'code',
        'pre',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'hr',
        'div',
        'span',
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  }

  processNodeMentions(html) {
    const nodeRegex = /@\[([^\]]+)\]\(node:([a-zA-Z0-9-]+)\)/g;

    return html.replace(nodeRegex, (match, label, nodeId) => {
      const escapedLabel = this.md.utils.escapeHtml(label);
      const escapedId = this.md.utils.escapeHtml(nodeId);
      return `<span class="node-mention-chip" data-node-id="${escapedId}" role="button" tabindex="0">${escapedLabel}</span>`;
    });
  }

  validateFileSize(content) {
    const byteSize = new Blob([content]).size;

    if (byteSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        warning: true,
        message: `File exceeds 5MB limit (${(byteSize / 1024 / 1024).toFixed(2)}MB). Displaying raw text.`,
      };
    }

    return { valid: true, warning: false };
  }

  renderMarkdown(content) {
    // Validate file size
    const validation = this.validateFileSize(content);

    if (!validation.valid) {
      return {
        html: `<pre>${this.md.utils.escapeHtml(content)}</pre>`,
        warning: validation.message,
        error: null,
      };
    }

    try {
      // Render markdown to HTML
      let html = this.md.render(content);

      // Process node mentions
      html = this.processNodeMentions(html);

      // Sanitize HTML
      html = this.sanitizeHtml(html);

      return {
        html,
        warning: null,
        error: null,
      };
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return {
        html: `<pre>${this.md.utils.escapeHtml(content)}</pre>`,
        warning: null,
        error: `Failed to render markdown: ${error.message}`,
      };
    }
  }

  async renderWithMermaid(content) {
    const renderResult = this.renderMarkdown(content);

    if (renderResult.error) {
      return renderResult;
    }

    try {
      // Find all mermaid diagrams and render them
      const container = document.createElement('div');
      container.innerHTML = renderResult.html;

      const mermaidDivs = container.querySelectorAll('.mermaid');

      for (const div of mermaidDivs) {
        try {
          const { svg } = await mermaid.render(div.id, div.textContent);
          div.innerHTML = svg;
          div.classList.add('mermaid-rendered');
        } catch (mermaidError) {
          console.error(`Failed to render mermaid diagram ${div.id}:`, mermaidError);
          div.innerHTML = `<div class="mermaid-error">Failed to render diagram</div>`;
          div.classList.add('mermaid-error');
        }
      }

      return {
        html: container.innerHTML,
        warning: renderResult.warning,
        error: null,
      };
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      return {
      