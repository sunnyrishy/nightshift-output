import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

/**
 * Custom markdown renderer service
 * Handles parsing and rendering markdown with support for:
 * - Mermaid diagrams
 * - Node mentions (@node-name)
 * - Standard markdown elements with syntax highlighting
 */

class MarkdownRenderer {
  private md: MarkdownIt;

  constructor() {
    // Initialize markdown-it with highlight.js for code blocks
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Syntax highlighting error:', err);
            return code;
          }
        }
        return code;
      },
    });

    // Add custom fence renderer for mermaid diagrams
    this.setupMermaidRenderer();

    // Add custom inline rule for node mentions
    this.setupNodeMentionRenderer();
  }

  /**
   * Setup custom fence rule to detect and mark mermaid blocks
   */
  private setupMermaidRenderer(): void {
    const defaultFence = this.md.renderer.rules.fence;

    this.md.renderer.rules.fence = (tokens, idx, _options, env, self) => {
      const token = tokens[idx];
      const info = token.info.trim();
      const code = token.content;

      // Detect mermaid code blocks
      if (info === 'mermaid') {
        return `<div class="mermaid-wrapper" data-mermaid-code="${this.escapeHtml(code)}">
          <div class="mermaid">${this.escapeHtml(code)}</div>
        </div>`;
      }

      // Fallback to default fence rendering for other code blocks
      return defaultFence ? defaultFence(tokens, idx, _options, env, self) : '';
    };
  }

  /**
   * Setup custom inline rule for @node-name mentions
   */
  private setupNodeMentionRenderer(): void {
    // Pattern to match @node-name (alphanumeric, hyphens, underscores)
    const nodeMentionPattern = /@([\w-]+)/g;

    const defaultText = this.md.renderer.rules.text;

    this.md.renderer.rules.text = (tokens, idx) => {
      const token = tokens[idx];
      let text = token.content;

      // Replace @node-name patterns with chip markers
      text = text.replace(nodeMentionPattern, (match, nodeName) => {
        return `<span class="node-mention-chip" data-node-name="${this.escapeHtml(nodeName)}">${this.escapeHtml(match)}</span>`;
      });

      return text;
    };
  }

  /**
   * Render markdown string to HTML with component markers
   * @param markdown - Raw markdown text
   * @returns HTML string with component markers for Mermaid and NodeMentionChip
   */
  public render(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    try {
      const html = this.md.render(markdown);
      return html;
    } catch (err) {
      console.error('Markdown rendering error:', err);
      return `<p>Error rendering markdown</p>`;
    }
  }

  /**
   * Escape HTML special characters for safe rendering
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

// Export singleton instance
export const markdownRenderer = new MarkdownRenderer();
export default markdownRenderer;