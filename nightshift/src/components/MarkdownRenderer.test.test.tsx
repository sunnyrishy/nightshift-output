import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarkdownRenderer from '../MarkdownRenderer';

// Mock dependencies
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: any) => (
    <pre data-testid={`code-block-${language}`}>{children}</pre>
  ),
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  atomDark: {},
}));

jest.mock('./MermaidDiagram', () => {
  return function MockMermaidDiagram({ content }: any) {
    return <div data-testid="mermaid-diagram">{content}</div>;
  };
});

jest.mock('./NodeMentionChip', () => {
  return function MockNodeMentionChip({ nodeId }: any) {
    return <span data-testid={`node-chip-${nodeId}`}>@{nodeId}</span>;
  };
});

jest.mock('remark-gfm', () => jest.fn());

describe('MarkdownRenderer', () => {
  describe('View Mode Rendering', () => {
    it('should render markdown content in view mode', () => {
      const content = '# Hello World\n\nThis is a test.';
      render(<MarkdownRenderer content={content} isViewMode={true} />);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World');
      expect(screen.getByText('This is a test.')).toBeInTheDocument();
    });

    it('should render raw markdown in edit mode', () => {
      const content = '# Hello World\n\nThis is a test.';
      render(<MarkdownRenderer content={content} isViewMode={false} />);
      
      expect(screen.getByDisplayValue(content)).toBeInTheDocument();
    });

    it('should render bold text', () => {
      const content = 'This is **bold** text.';
      render(<MarkdownRenderer content={content} isViewMode={true} />);
      
      expect(screen.getByText('bold')).toBeInTheDocument();
    });

    it('should render italic text', () => {
      const content = 'This is *italic* text.';
      render(<MarkdownRenderer content={content} isViewMode={true} />);
      
      expect(screen.