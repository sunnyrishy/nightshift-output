# Implementation: Markdown File Rendering in View Mode

FILENAME: MarkdownRenderer.jsx
```javascript
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';

/**
 * MentionChip Component
 * Renders styled chips for @node-name mentions
 */
const MentionChip = ({ mention }) => (
  <span
    className="mention-chip"
    style={{
      display: 'inline-block',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      padding: '2px 8px',
      borderRadius: '16px',
      fontSize: '0.9em',
      fontWeight: '500',
      margin: '0 2px',
      cursor: 'pointer',
      border: '1px solid #1976d2',
    }}
    title={`Node: ${mention}`}
  >
    {mention}
  </span>
);

/**
 * MermaidBlock Component
 * Renders mermaid diagrams from code blocks
 */
const MermaidBlock = ({ code }) => {
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const elementId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        setError(null);
        const { svg: renderedSvg } = await mermaid.render(elementId, code);
        setSvg(renderedSvg);
      } catch (err) {
        setError(`Mermaid rendering error: ${err.message}`);
        console.error('Mermaid error:', err);
      }
    };

    renderMermaid();
  }, [code, elementId]);

  if (error) {
    return (
      <div
        style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginY: '12px',
          fontFamily: 'monospace',
          fontSize: '0.85em',
        }}
      >
        {error}
      </div>
    );
  }

  if (!svg) {
    return <div style={{ padding: '12px', color: '#999' }}>Loading diagram...</div>;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0',
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        overflow: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

/**
 * Process text to replace @mentions with MentionChip components
 * Returns an array of strings and React elements
 */
const processMentions = (text) => {
  if (typeof text !== 'string') return text;

  const mentionRegex = /@([\w-]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add mention chip
    parts.push(
      <MentionChip key={`mention-${match.index}`} mention={match[0]} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * Custom renderers for different markdown elements
 */
const createRenderers = () => ({
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    // Mermaid diagram handling
    if (language === 'mermaid') {
      const code = String(children).replace(/\n$/, '');
      return <MermaidBlock code={code} />;
    }

    // Regular code block with syntax highlighting
    if (!inline) {
      const code = String(children).replace(/\n$/, '');
      return (
        <SyntaxHighlighter
          style={tomorrow}
          language={language || 'text'}
          PreTag="div"
          customStyle={{
            borderRadius: '4px',
            margin: '12px 0',
            padding: '12px',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      );
    }

    // Inline code
    return (
      <code
        style={{
          backgroundColor: '#f0f0f0',
          padding: '2px 6px',
          borderRadius: '3px',
          fontFamily: 'monospace',
          fontSize: '0.9em',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },

  table({ children }) {
    return (
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          margin: '16px 0',
          border: '1px solid #ddd',
        }}
      >
        {children}
      </table>
    );
  },

  thead({ children }) {
    return (
      <thead
        style={{
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #ddd',
        }}
      >
        {children}
      </thead>
    );
  },

  td({ children }) {
    return (
      <td
        style={{
          border: '1px solid #ddd',
          padding: '8px',
        }}
      >
        {children}
      </td>
    );
  },

  th({ children, align }) {
    return (
      <th
        style={{
          border: '1px solid #ddd',
          padding: '8px',
          fontWeight: '600',
          textAlign: align || 'left',
        }}
      >
        {children}
      </th>
    );
  },

  img({ src, alt, ...props }) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '4px',
          margin: '12px 0',
        }}
        {...props}
      />
    );
  },

  blockquote({ children }) {
    return (
      <blockquote
        style={{
          borderLeft: '4px solid #1976d2',
          paddingLeft: '12px',
          marginLeft: '0',
          color: '#666',
          fontStyle: 'italic',
        }}
      >
        {children}
      </blockquote>
    );
  },

  h1({ children }) {
    return <h1 style={{ fontSize: '2em', marginTop: '20px', marginBottom: '10px' }}>{children}</h1>;
  },

  h2({ children }) {
    return <h2 style={{ fontSize: '1.6em', marginTop: '16px', marginBottom: '8px' }}>{children}</h2>;
  },

  h3({ children }) {
    return <h3 style={{ fontSize: '1.3em',