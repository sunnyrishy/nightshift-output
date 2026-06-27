import React, { useState } from 'react';

// Constants
const REDACTION_PATTERN = /password|token|secret|api_key|authorization|credit_card/i;
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const TRUNCATION_WARNING = 'Payload exceeded 5MB and was truncated';

/**
 * Sanitizes sensitive data from payloads
 * @param {Object} data - Data to sanitize
 * @param {Set} processedRefs - Track circular references
 * @returns {Object} Sanitized copy of data
 */
function sanitizePayload(data, processedRefs = new WeakSet()) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle circular references
  if (typeof data === 'object' && processedRefs.has(data)) {
    return '[Circular Reference]';
  }

  if (typeof data === 'object') {
    processedRefs.add(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizePayload(item, processedRefs));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (REDACTION_PATTERN.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizePayload(value, processedRefs);
      } else if (typeof value === 'string' && REDACTION_PATTERN.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Serializes execution context to ExecutionContextMessage schema
 * @param {Object} execution - Execution object with id, status, input, output, error, timestamps
 * @returns {Object} Serialized message or error object
 */
function serializeExecutionContext(execution) {
  try {
    if (!execution || typeof execution !== 'object') {
      throw new Error('Invalid execution object');
    }

    const sanitizedInput = sanitizePayload(execution.input);
    const sanitizedOutput = sanitizePayload(execution.output);

    let isTruncated = false;
    const inputJson = JSON.stringify(sanitizedInput);
    const outputJson = JSON.stringify(sanitizedOutput);

    if (inputJson.length > MAX_PAYLOAD_SIZE || outputJson.length > MAX_PAYLOAD_SIZE) {
      isTruncated = true;
    }

    const message = {
      type: 'execution_context',
      version: '1.0',
      timestamp: new Date().toISOString(),
      execution: {
        id: execution.id,
        status: execution.status,
        input: sanitizedInput,
        output: sanitizedOutput,
        error: execution.error ? {
          message: execution.error.message,
          stack: execution.error.stack,
          code: execution.error.code,
        } : null,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
      },
      metadata: {
        sanitized: true,
        truncated: isTruncated,
        truncationWarning: isTruncated ? TRUNCATION_WARNING : null,
      },
    };

    return { success: true, message };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        type: 'serialization_error',
      },
    };
  }
}

/**
 * Raw payload viewer modal with security warning
 */
function RawPayloadModal({ execution, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>View Raw Payload</h2>
        {!confirmed ? (
          <>
            <div className="security-warning">
              <p>⚠️ <strong>Security Warning</strong></p>
              <p>Raw payloads contain unredacted sensitive data including passwords, tokens, and API keys.</p>
              <p>Only share this data with trusted agents in secure environments.</p>
            </div>
            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button onClick={handleConfirm} className="btn btn-danger">Show Raw Data</button>
            </div>
          </>
        ) : (
          <>
            <pre className="raw-payload">
              {JSON.stringify(execution, null, 2)}
            </pre>
            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-primary">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Send to Agent button and handler
 */
export function SendToAgentButton({ execution, onSuccess, onError }) {
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validate execution status
  const isValidStatus = execution?.status === 'failed' || execution?.status === 'completed';

  const handleSendToAgent = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = serializeExecutionContext(execution);