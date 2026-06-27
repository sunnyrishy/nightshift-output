# Markdown File View Mode Rendering Implementation

FILENAME: MarkdownPreview.js
```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import marked from 'marked';
import './MarkdownPreview.css';

/**
 * MarkdownPreview Component
 * Renders markdown files with support for Mermaid diagrams and @node-id mentions
 * Includes sanitization, timeout handling, and accessibility features
 */
const MarkdownPreview = ({ fileContent, onNodeMention, fileName }) => {
  const [html, setHtml] = useState('');
  const [mermaidErrors, setMermaidErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [renderTime, setRenderTime] = useState(0);
  const containerRef = useRef(null);
  const mermaidTimeoutsRef = useRef({});

  // Configure mermaid with timeout
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'antitrust',
      theme: 'default',
      logLevel: 'error'
    });
  }, []);

  // Extract node IDs from content for mention detection
  const extractNodeIds = useCallback((text) => {
    const nodeIdRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = [];
    let match;
    while ((match = nodeIdRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)];
  }, []);

  // Render markdown with custom renderer for mermaid and mentions
  const renderMarkdown = useCallback(async () => {
    const startTime = performance.now();
    setIsLoading(true);

    if (!fileContent || typeof fileContent !== 'string') {
      setHtml('');
      setIsLoading(false);
      return;
    }

    try {
      // Custom renderer for handling code blocks
      const renderer = new marked.Renderer();
      const originalCodeRenderer = renderer.code.bind(renderer);

      renderer.code = (code, language) => {
        // Handle mermaid diagrams
        if (language === 'mermaid') {
          const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return `<div class="mermaid-wrapper"><div id="${diagramId}" class="mermaid">${DOMPurify.sanitize(code)}</div></div>`;
        }
        return originalCodeRenderer(code, language);
      };

      // Render markdown
      let rawHtml = await marked(fileContent, { renderer });

      // Process @node-id mentions
      rawHtml = rawHtml.replace(
        /@([a-zA-Z0-9_-]+)/g,
        (match, nodeId) => {
          return `<span class="node-mention" data-node-id="${DOMPurify.sanitize(nodeId)}" role="button" tabindex="0">${match}</span>`;
        }
      );

      // Sanitize HTML
      const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span',
          'hr', 'section', 'article'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'alt', 'src', 'id', 'class', 'data-node-id',
          'role', 'tabindex', 'aria-label'
        ],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true
      });

      setHtml(sanitizedHtml);
      setMermaidErrors({});

      // Render mermaid diagrams with timeout
      if (containerRef.current) {
        const mermaidDivs = containerRef.current.querySelectorAll('.mermaid');
        
        mermaidDivs.forEach((div) => {
          const diagramId = div.id;
          
          // Clear existing timeout if any
          if (mermaidTimeoutsRef.current[diagramId]) {
            clearTimeout(mermaidTimeoutsRef.current[diagramId]);
          }

          // Set timeout for mermaid rendering
          const timeoutId = setTimeout(() => {
            setMermaidErrors(prev => ({
              ...prev,
              [diagramId]: 'Diagram rendering timed out (5s). Click to retry.'
            }));
            div.innerHTML = '';
          }, 5000);

          mermaidTimeoutsRef.current[diagramId] = timeoutId;

          // Attempt to render
          mermaid.contentLoaderAsync(div)
            .then(() => {
              clearTimeout(timeoutId);
              delete mermaidTimeoutsRef.current[diagramId];
              
              // Add accessibility attributes
              div.setAttribute('role', 'img');
              div.setAttribute('aria-label', `Mermaid diagram in ${fileName || 'document'}`);
              
              setMermaidErrors(prev => {
                const updated = { ...prev };
                delete updated[diagramId];
                return updated;
              });
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              delete mermaidTimeoutsRef.current[diagramId];
              console.error(`Mermaid render error for ${diagramId}:`, error);
              setMermaidErrors(prev => ({
                ...prev,
                [diagramId]: '