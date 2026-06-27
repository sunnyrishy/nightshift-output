```javascript
// MarkdownViewer.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarkdownViewer from "./MarkdownViewer";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Mock the marked library
jest.mock("marked");

// Mock DOMPurify
jest.mock("dompurify");

// Mock fetch globally
global.fetch = jest.fn();

// Mock console.error to verify it's called
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("MarkdownViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
    global.fetch.mockReset();

    // Default mocks
    marked.parse = jest.fn((markdown) => `<p>${markdown}</p>`);
    DOMPurify.sanitize = jest.fn((html) => html);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  // =========================================================================
  // HAPPY PATH TESTS
  // =========================================================================

  describe("Happy Path – initialMarkdown prop", () => {
    it("should render markdown immediately when initialMarkdown is provided", () => {
      const markdown = "# Hello World";
      marked.parse.mockReturnValue("<h1>Hello World</h1>");
      DOMPurify.sanitize.mockReturnValue("<h1>Hello World</h1>");

      render(<MarkdownViewer initialMarkdown={markdown} documentUrl="" />);

      expect(marked.parse).toHaveBeenCalledWith(markdown);
      expect(DOMPurify.sanitize).toHaveBeenCalled();
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("should skip loading state when initialMarkdown is provided", () => {
      const markdown = "# Test";
      marked.parse.mockReturnValue("<h1>Test</h1>");
      DOMPurify.sanitize.mockReturnValue("<h1>Test</h1>");

      const { queryByRole } = render(
        <MarkdownViewer initialMarkdown={markdown} documentUrl="" />
      );

      // Should not have a loading spinner
      expect(queryByRole("status")).not.toBeInTheDocument();
    });

    it("should render HTML from initialMarkdown in the article element", () => {
      const markdown = "**bold text**";
      const html = "<strong>bold text</strong>";
      marked.parse.mockReturnValue(html);
      DOMPurify.sanitize.mockReturnValue(html);

      const { container } = render(
        <MarkdownViewer initialMarkdown={markdown} documentUrl="" />
      );

      const article = container.querySelector(".markdown-viewer--content");
      expect(article).toHaveAttribute("class", "markdown-viewer markdown-viewer--content");
    });
  });

  describe("Happy Path – fetching from documentUrl", () => {
    it("should fetch and render markdown from documentUrl", async () => {
      const url = "https://example.com/doc.md";
      const markdown = "# Fetched Content";
      const html = "<h1>Fetched Content</h1>";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(markdown),
      });

      marked.parse.mockReturnValue(html);
      DOMPurify.sanitize.mockReturnValue(html);

      render(<MarkdownViewer documentUrl={url} />);

      await waitFor(() => {
        expect(screen.getByRole("article")).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(marked.parse).toHaveBeenCalledWith(markdown);
    });

    it("should show loading state initially when fetching", () => {
      const url = "https://example.com/doc.md";

      global.fetch.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MarkdownViewer documentUrl={url} />);

      expect(screen.getByRole("status", { hidden: false })).toBeInTheDocument();
      expect(screen.getByText("Loading document…")).toBeInTheDocument();
    });

    it("should transition from loading to content state", async () => {
      const url = "https://example.com/doc.md";
      const markdown = "Content";
      const html = "<p>Content</p>";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(markdown),
      });

      marked.parse.mockReturnValue(html);
      DOMPurify.sanitize.mockReturnValue(html);

      const { queryByRole } = render(<MarkdownViewer documentUrl={url} />);

      // Initially loading
      expect(queryByRole("status")).toBeInTheDocument();

      // Then content appears
      await waitFor(() => {
        expect(queryByRole("article")).toBeInTheDocument();
        expect(queryByRole("status")).not.toBeInTheDocument();
      });
    });

    it("should sanitize HTML before rendering", async () => {
      const url = "https://example.com/doc.md";
      const markdown = "<script>alert('xss')</script>";
      const rawHtml = "<script>alert('xss')</script>";
      const cleanHtml = "<p>Safe</p>";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(markdown),
      });

      marked.parse.mockReturnValue(rawHtml);
      DOMPurify.sanitize.mockReturnValue(cleanHtml);

      render(<MarkdownViewer documentUrl={url} />);

      await waitFor(() => {
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(rawHtml, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["class"],
        });
      });
    });

    it("should pass class attribute through DOMPurify", async () => {
      const url = "https://example.com/doc.md";
      const markdown = "code";
      const html = '<code class="language-js">code</code>';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce(markdown),
      });

      marked.parse.mockReturnValue(html);
      DOMPurify.sanitize.mockReturnValue(html);

      render(<MarkdownViewer documentUrl={url} />);

      await waitFor(() => {
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(html, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["class"],
        });
      });
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe("Error Handling – Network Failures", () => {
    it("should display error message on fetch failure", async () => {
      const url = "https://example.com/doc.md";
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      render(<MarkdownViewer documentUrl={url} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Unable to load document — please refresh or contact support"
          )
        ).toBeInTheDocument();
      });
    });

    it("should display