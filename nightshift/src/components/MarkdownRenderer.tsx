import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MermaidDiagram } from './MermaidDiagram';
import { NodeMentionChip } from './NodeMentionChip';
import remarkNodeMentions from '../utils/remarkNodeMentions';
import 'highlight.js/styles/atom-one-dark.css';
import '../styles/markdown-renderer.css';

interface MarkdownRendererProps {
  content: string;
  availableNodes?: string[];
  onNodeMentionClick?: (nodeName: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  availableNodes = [],
  onNodeMentionClick,
}) => {
  // Memoize to prevent unnecessary re-renders
  const memoizedContent = useMemo(() => content, [content]);

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Render Mermaid diagrams
      if (language === 'mermaid' && !inline) {
        const mermaidCode = String(children).replace(/\n$/, '');
        return <MermaidDiagram code={mermaidCode} />;
      }

      // Render regular code blocks with syntax highlighting
      if (!inline && className) {
        return (
          <pre className={`code-block ${className}`}>
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      }

      // Inline code
      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    },

    table({ children }: any) {
      return (
        <div className="table-wrapper">
          <table className="markdown-table">{children}</table>
        </div>
      );
    },

    th({ children }: any) {
      return <th className="table-header">{children}</th>;
    },

    td({ children }: any) {
      return <td className="table-cell">{children}</td>;
    },

    img({ src, alt, ...props }: any) {
      return (
        <img
          src={src}
          alt={alt || 'markdown image'}
          className="markdown-image"
          loading="lazy"
          {...props}
        />
      );
    },

    h1({ children }: any) {
      return <h1 className="markdown-h1">{children}</h1>;
    },

    h2({ children }: any) {
      return <h2 className="markdown-h2">{children}</h2>;
    },

    h3({ children }: any) {
      return <h3 className="markdown-h3">{children}</h3>;
    },

    h4({ children }: any) {
      return <h4 className="markdown-h4">{children}</h4>;
    },

    h5({ children }: any) {
      return <h5 className="markdown-h5">{children}</h5>;
    },

    h6({ children }: any) {
      return <h6 className="markdown-h6">{children}</h6>;
    },

    blockquote({ children }: any) {
      return <blockquote className="markdown-blockquote">{children}</blockquote>;
    },

    hr() {
      return <hr className="markdown-hr" />;
    },

    ul({ children }: any) {
      return <ul className="markdown-ul">{children}</ul>;
    },

    ol({ children }: any) {
      return <ol className="markdown-ol">{children}</ol>;
    },

    li({ children }: any) {
      return <li className="markdown-li">{children}</li>;
    },

    a({ href, children, ...props }: any) {
      return (
        <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },

    p({ children }: any) {
      return <p className="markdown-p">{children}</p>;
    },

    NodeMentionChip({ nodeName }: any) {
      const isValid = availableNodes.includes(nodeName);
      if (!isValid) {
        return <span className="invalid-mention">@{nodeName}</span>;
      }
      return (
        <NodeMentionChip
          nodeName={nodeName}
          onClick={() => onNodeMentionClick?.(nodeName)}
        />
      );
    },
  };

  if (!memoizedContent || memoizedContent.trim() === '') {
    return <div className="markdown-renderer empty">No content to display</div>;
  }

  return (
    <div className="markdown-renderer">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkNodeMentions, { availableNodes }],
        ]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
        skipHtml={true}
      >
        {memoizedContent}
      </ReactMarkdown>
    </div>
  );
};