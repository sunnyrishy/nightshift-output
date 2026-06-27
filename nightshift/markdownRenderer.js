import React, { Suspense, lazy, useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

const MermaidDiagram = lazy(() => import('./MermaidDiagram'));

/**
 * Plugin to transform mermaid code blocks into custom nodes
 */
function remarkMermaidPlugin() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') {
        node.type = 'mermaidDiagram';
        node.mermaidCode = node.value;
        delete node.value;
      }
    });
  };
}

/**
 * Plugin to detect and transform node mentions (@node_id)
 */
function remarkNodeMentionPlugin(nodeResolver) {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const mentionRegex = /(?:^|\s)@([\w\-_]+)/g;
      const matches = [...node.value.matchAll(mentionRegex)];
      
      if (matches.length === 0) return;

      const children = [];
      let lastIndex = 0;

      matches.forEach((match) => {
        const matchStart = match.index;
        const beforeText = node.value.slice(lastIndex, matchStart);
        const nodeId = match[1];

        // Add text before mention
        if (beforeText) {
          children.push({
            type: 'text',
            value: beforeText,
          });
        }

        // Add mention node
        children.push({
          type: 'nodeMention',
          nodeId,
          children: [
            {
              type: 'text',
              value: `@${nodeId}`,
            },
          ],
        });

        lastIndex = match.index + match[0].length;
      });

      // Add remaining text
      const afterText = node.value.slice(lastIndex);
      if (afterText) {
        children.push({
          type: 'text',
          value: afterText,
        });
      }

      if (children.length > 0) {
        parent.children.splice(index, 1, ...children);
      }
    });
  };
}

/**
 * Create unified markdown processor with plugins
 */
export function createMarkdownProcessor(nodeResolver) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMermaidPlugin)
    .use(remarkNodeMentionPlugin, nodeResolver);
}

/**
 * Parse markdown content into AST
 */
export function parseMarkdown(content, nodeResolver) {
  const processor = createMarkdownProcessor(nodeResolver);
  return processor.parse(content);
}

/**
 * Transform markdown AST to include plugin transformations
 */
export async function transformMarkdownAST(ast, nodeResolver) {
  const processor = createMarkdownProcessor(nodeResolver);
  return processor.runSync(ast);
}