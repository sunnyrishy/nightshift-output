import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidDiagram from './MermaidDiagram';
import NodeMentionChip from './NodeMentionChip';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  isViewMode: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isViewMode,
}) => {
  const [hasMermaid, setHasMermaid] = useState(false);

  // Detect if content has mermaid blocks for lazy loading
  useEffect(() => {
    const mermaidRegex = /