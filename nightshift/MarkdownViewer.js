// MarkdownViewer.js
// Renders markdown documents with CommonMark-compliant parsing.
// Displays a user-friendly error if the document payload cannot be fetched.

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// marked configuration – use CommonMark-compliant settings
// ---------------------------------------------------------------------------
marked.setOptions({
  gfm: true,        // GitHub-flavored Markdown (supersets CommonMark)
  breaks: false,    // Require two newlines for a paragraph break (CommonMark default)
  pedantic: false,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FETCH_TIMEOUT_MS = 3000; // 3-second deadline per acceptance criteria
const ERROR_MESSAGE =
  "Unable to load document — please refresh or contact support";

// ---------------------------------------------------------------------------
// Helper: fetch with an explicit timeout so the error appears within 3 s
// ---------------------------------------------------------------------------
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();

  // Set a timer that aborts the request if it has not resolved in time
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timerId);

    if (!response.ok) {
      throw new Error(
        `Server responded with status ${response.status} (${response.statusText})`
      );
    }

    return response;
  } catch (err) {
    clearTimeout(timerId);

    // Re-throw with a clearer label so callers can distinguish abort vs. network
    if (err.name === "AbortError") {
      throw new Error("Request timed out after " + timeoutMs + " ms");
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// MarkdownViewer component
//
// Props:
//   documentUrl  {string}  – URL that returns the raw markdown text
//   initialMarkdown {string|null} – optional pre-loaded markdown (skips fetch)
// ---------------------------------------------------------------------------
export default function MarkdownViewer({ documentUrl, initialMarkdown = null }) {
  const [html, setHtml]         = useState("");        // sanitised rendered HTML
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);      // string or null

  // Keep a ref so we can cancel the render if the component unmounts mid-fetch
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // If the parent already supplied markdown, render it immediately
    if (initialMarkdown !== null) {
      const rendered = renderMarkdown(initialMarkdown);
      if (isMounted.current) {
        setHtml(rendered);
        setLoading(false);
      }
      return;
    }

    // Otherwise fetch from the supplied URL
    if (!documentUrl) {
      if (isMounted.current) {
        setError(ERROR_MESSAGE);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetchWithTimeout(documentUrl, {}, FETCH_TIMEOUT_MS);
        const text = await response.text();

        if (cancelled) return;

        const rendered = renderMarkdown(text);

        if (isMounted.current) {
          setHtml(rendered);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        // Log internally for debugging, but show friendly message to the user
        console.error("[MarkdownViewer] Failed to load document:", err);

        if (!cancelled && isMounted.current) {
          setError(ERROR_MESSAGE);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      isMounted.current = false;
    };
  }, [documentUrl, initialMarkdown]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="markdown-viewer markdown-viewer--loading" role="status" aria-live="polite">
        <span className="markdown-viewer__spinner" aria-hidden="true" />
        <span>Loading document…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="markdown-viewer markdown-viewer--error"
        role="alert"
        aria-live="assertive"
      >
        {/* Visible error message – satisfies acceptance criterion 3 */}
        <p className="markdown-viewer__error-message">{error}</p>
      </div>
    );
  }

  return (
    <article
      className="markdown-viewer markdown-viewer--content"
      // dangerouslySetInnerHTML is safe here because we always pass
      // the output through DOMPurify before setting it.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---------------------------------------------------------------------------
// renderMarkdown
// Converts raw markdown string → sanitised HTML string.
// Runs synchronously so it can be used both in the fetch path and the
// initialMarkdown fast path.
// ---------------------------------------------------------------------------
function renderMarkdown(markdown) {
  if (typeof markdown !== "string") return "";

  // marked.parse() converts markdown → HTML string (CommonMark-compatible)
  const rawHtml = marked.parse(markdown);

  // DOMPurify strips any injected scripts / unsafe attributes before we set
  // innerHTML, preventing XSS while keeping all valid HTML formatting intact.
  const clean = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    // Allow code-related attributes that DOMPurify would otherwise strip
    ADD_ATTR: ["class"],
  });

  return clean;
}