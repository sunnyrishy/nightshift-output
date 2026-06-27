import React, { useEffect, useState, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import NodeMentionChip from '@/components/chips/NodeMentionChip';
import MermaidDiagram from '@/components/diagrams/MermaidDiagram';
import './MarkdownRenderer.css';

const MarkdownRenderer = ({ content, nodeDatabase = {} }) => {
  const [renderedHTML, setRenderedHTML] = useState('');
  const [mentions, setMentions] = useState({});
  const navigate = useNavigate();

  // Regex to match @node-identifier mentions
  const MENTION_REGEX = /(?:^|\s)@([a-zA-Z0-9_-]+)/g;

  /**
   * Extract and validate node mentions from markdown
   */
  const extractMentions = useCallback((text) => {
    const foundMentions = {};
    let match;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
      const nodeId = match[1];
      foundMentions[nodeId] = {
        exists: nodeId in nodeDatabase,
        nodeId,
      };
    }

    return foundMentions;
  }, [nodeDatabase]);

  /**
   * Custom renderer for marked to handle mermaid diagrams
   */
  const setupMarkedRenderer = () => {
    const renderer = new marked.Renderer();

    // Override code block rendering for mermaid support
    renderer.codespan = (code) => {
      return `<code>${code.text}</code>`;
    };

    renderer.code = (code) => {
      const { text, lang } = code;

      if (lang === 'mermaid') {
        // Return placeholder for mermaid diagram
        return `<div class="mermaid-container" data-mermaid="${btoa(text)}"></div>`;
      }

      // Standard code block with syntax highlighting
      return `<pre><code class="language-${lang || 'plaintext'}">${DOMPurify.sanitize(text)}</code></pre>`;
    };

    // Custom table rendering with alignment support
    renderer.table = (table) => {
      return `<div class="markdown-table-wrapper"><table>${table.header}${table.body}</table></div>`;
    };

    renderer.tablerow = (row) => {
      return `<tr>${row.text}</tr>`;
    };

    renderer.tablecell = (cell) => {
      const { text, flags } = cell;
      const align = flags.align ? ` style="text-align:${flags.align}"` : '';
      const tag = flags.header ? 'th' : 'td';
      return `<${tag}${align}>${text}</${tag}>`;
    };

    return renderer;
  };

  /**
   * Replace mention placeholders with React components
   */
  const replaceMentionsWithComponents = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all text nodes and replace mentions
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodesToReplace = [];
    let currentNode;

    while ((currentNode = walker.nextNode())) {
      if (MENTION_REGEX.test(currentNode.nodeValue)) {
        nodesToReplace.push(currentNode);
      }
    }

    nodesToReplace.forEach((node) => {
      const span = document.createElement('span');
      span.innerHTML = node.nodeValue.replace(
        MENTION_REGEX,
        (match, nodeId) => {
          const chipKey = `mention-${nodeId}`;
          const exists = mentions[nodeId]?.exists ?? false;
          return `<span data-mention-chip="${chipKey}" data-node-id="${nodeId}" data-exists="${exists}"></span>`;
        }
      );
      node.parentNode.replaceChild(span, node);
    });

    return doc.body.innerHTML;
  };

  /**
   * Render markdown to HTML with custom handlers
   */
  const renderMarkdown = useCallback(async () => {
    if (!content) {
      setRenderedHTML('');
      return;
    }

    // Extract mentions for validation
    const foundMentions = extractMentions(content);
    setMentions(foundMentions);

    try {
      // Configure marked options
      marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
      });

      // Render markdown
      const renderer = setupMarkedRenderer();
      const html = marked(content, { renderer });

      // Sanitize HTML
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 'del',
          'ul', 'ol', 'li', 'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'pre', 'code', 'a', 'img', 'hr',
          'div', 'span', 'section', 'article',
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'target', 'rel',
          'src', 'alt', 'width', 'height',
          'class', 'id', 'style', 'data-*',
        ],
      });

      setRenderedHTML(sanitized);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      setRenderedHTML(`<p>Error rendering markdown: ${error.message}</p>`);
    }
  }, [content, extractMentions]);

  // Render markdown on content change
  useEffect(() => {
    renderMarkdown();
  }, [renderMarkdown]);

  /**
   * Handle mention chip click navigation
   */
  const handleMentionCl