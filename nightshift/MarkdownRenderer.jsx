FILENAME: MarkdownRenderer.jsx
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import './MarkdownRenderer.css';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: true, theme: 'default', logLevel: 'error' });

/**
 * NodeMentionChip - Renders a mention chip for @node-name references
 */
const NodeMentionChip = ({ nodeName, onNodeClick }) => {
  const handleClick = useCallback(() => {
    if (onNodeClick) {
      onNodeClick(nodeName);
    }
  }, [nodeName, onNodeClick]);

  return (
    <span
      className="node-mention-chip"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      @{nodeName}
    </span>
  );
};

/**
 * MermaidDiagram - Renders Mermaid diagram with error handling and timeout
 */
const MermaidDiagram = ({ content }) => {
  const [diagram, setDiagram] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const elementId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Mermaid rendering timeout')), 5000)
        );

        // Validate mermaid syntax
        await Promise.race([
          mermaid.parse(content),
          timeoutPromise,
        ]);

        // Render diagram
        const { svg } = await Promise.race([
          mermaid.render(elementId, content),
          timeoutPromise,
        ]);

        setDiagram(svg);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to render diagram');
        setLoading(false);
      }
    };

    renderMermaid();
  }, [content, elementId]);

  if (loading) {
    return <div className="mermaid-loading">Rendering diagram...</div>;
  }

  if (error) {
    return (
      <div className="mermaid-error">
        <strong>Diagram Error:</strong> {error}
        <pre className="mermaid-fallback">{content}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: diagram }}
    />
  );
};

/**
 * Custom renderers for markdown elements
 */
const createCustomRenderers = (onNodeClick) => ({
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';

    if (inline) {
      return <code className="inline-code">{children}</code>;
    }

    re