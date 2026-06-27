# Markdown File Rendering Feature Implementation

FILENAME: MarkdownPreviewRenderer.jsx
```javascript
import React, { useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import NodeMentionChip from './NodeMentionChip';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: true, theme: 'default' });

const MarkdownPreviewRenderer = ({ 
  content, 
  onNodeClick = null,
  nodeMetadata = {},
  className = ''
}) => {
  const [mermaidErrors, setMermaidErrors] = useState({});

  // Sanitize HTML content to prevent XSS
  const sanitizeHtml = useCallback((html) => {
    return DOMPurify.sanitize(html, { 
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title']
    });
  }, []);

  // Parse and render node mentions (@NodeName)
  const parseNodeMentions = useCallback((text) => {
    const mentionRegex = /@([A-Za-z0-9_-]+)/g;
    const parts = [];
    let lastIndex = 0;

    text.replace(mentionRegex, (match, nodeName, offset) => {
      if (lastIndex < offset) {
        parts.push(text.substring(lastIndex, offset));
      }
      parts.push(
        <NodeMentionChip
          key={`${nodeName}-${offset}`}
          nodeName={nodeName}
          metadata={nodeMetadata[nodeName]}
          onClick={() => onNodeClick?.(nodeName)}
        />
      );
      lastIndex = offset + match.length;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  }, [nodeMetadata, onNodeClick]);

  // Mermaid diagram renderer component
  const MermaidDiagram = ({ code, id }) => {
    const [svg, setSvg] = useState(null);
    const [error, setError] = useState(false);

    React.useEffect(() => {
      const renderDiagram = async () => {
        try {
          const { svg: renderedSvg } = await mermaid.render(id, code);
          setSvg(renderedSvg);
          setError(false);
          setMermaidErrors(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch (err) {
          console.error('Mermaid rendering error:', err);
          setError(true);
          setMermaidErrors(prev => ({ ...prev, [id]: err.message }));
        }
      };

      renderDiagram();
    }, [code, id]);

    if (error) {
      return (
        <div className="mermaid-error-fallback">
          <details>
            <summary>Mermaid Diagram Error</summary>
            <pre className="error-message">{mermaidErrors[id]}</pre>
            <pre className="code-block">{code}</pre>
          </details>
        </div>
      );
    }

    return (
      <div className="mermaid-diagram-container">
        {svg ? (
          <