import { MarkdownPreviewRenderer } from './index';
import mermaid from 'mermaid';
import { highlightCode } from './syntax-highlighter';

jest.mock('mermaid');
jest.mock('./syntax-highlighter');

describe('MarkdownPreviewRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new MarkdownPreviewRenderer({
      lazyLoadEnabled: false,
      onNodeNavigate: jest.fn(),
      getNodeMetadata: jest.fn()
    });
    jest.clearAllMocks();
    highlightCode.mockImplementation((code) => `<span>${code}</span>`);
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const r = new MarkdownPreviewRenderer();
      expect(r.nodeCache).toBeInstanceOf(Map);
      expect(r.renderedDiagrams).toBe(0);
      expect(r.lazyLoadEnabled).toBe(false);
    });

    test('should initialize with custom options', () => {
      const onNavigate = jest.fn();
      const getMetadata = jest.fn();
      const r = new MarkdownPreviewRenderer({
        lazyLoadEnabled: true,
        onNodeNavigate: onNavigate,
        getNodeMetadata: getMetadata
      });
      expect(r.lazyLoadEnabled).toBe(true);
      expect(r.onNodeNavigate).toBe(onNavigate);
      expect(r.getNodeMetadata).toBe(getMetadata);
    });

    test('should initialize circularRefDetection as empty Set', () => {
      expect(renderer.circularRefDetection).toBeInstanceOf(Set);
      expect(renderer.circularRefDetection.size).toBe(0);
    });
  });

  describe('render', () => {
    test('should render basic markdown content', async () => {
      const markdown = '# Hello\n\nThis is a test.';
      const result = await renderer.render(markdown);
      expect(result).toContain('Hello');
      expect(result).toContain('This is a test.');
    });

    test('should handle empty markdown', async () => {
      const result = await renderer.render('');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should call processMermaidDiagrams', async () => {
      jest.spyOn(renderer, 'processMermaidDiagrams').mockResolvedValue('<html></html>');
      const markdown = '