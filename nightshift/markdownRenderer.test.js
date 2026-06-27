import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import {
  createMarkdownProcessor,
  parseMarkdown,
  transformMarkdownAST,
} from './markdownRenderer';

// Mock the MermaidDiagram component
jest.mock('./MermaidDiagram', () => {
  return jest.fn(() => <div data-testid="mermaid-diagram">Mermaid Diagram</div>);
});

describe('markdownRenderer', () => {
  const mockNodeResolver = jest.fn((nodeId) => ({
    id: nodeId,
    name: `Node ${nodeId}`,
    type: 'test',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMarkdownProcessor', () => {
    it('should create a unified processor with all plugins', () => {
      const processor = createMarkdownProcessor(mockNodeResolver);
      expect(processor).toBeDefined();
      expect(processor.parse).toBeDefined();
      expect(processor.runSync).toBeDefined();
    });

    it('should return the same processor instance for same nodeResolver', () => {
      const processor1 = createMarkdownProcessor(mockNodeResolver);
      const processor2 = createMarkdownProcessor(mockNodeResolver);
      expect(processor1).toBeDefined();
      expect(processor2).toBeDefined();
    });
  });

  describe('parseMarkdown', () => {
    it('should parse basic markdown content', () => {
      const content = '# Hello World\n\nThis is a test.';
      const ast = parseMarkdown(content, mockNodeResolver);
      
      expect(ast).toBeDefined();
      expect(ast.children).toBeDefined();
      expect(Array.isArray(ast.children)).toBe(true);
    });

    it('should parse markdown with code blocks', () => {
      const content = '