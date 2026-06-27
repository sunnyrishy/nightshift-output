import {
  formatExecutionContext,
  truncatePayload,
  ExecutionContextData,
} from '../formatExecutionContext';

describe('formatExecutionContext', () => {
  const baseContext: ExecutionContextData = {
    id: 'exec-123',
    node_name: 'API Request Node',
    status: 'failed',
    timestamp: '2024-01-15T10:30:00Z',
    duration: 1500,
  };

  describe('formatExecutionContext - Basic Info Section', () => {
    test('should include execution header', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Execution Debugging Context**');
    });

    test('should format node name correctly', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Node:** API Request Node');
    });

    test('should format execution ID correctly', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Execution ID:** exec-123');
    });

    test('should format status correctly', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Status:** failed');
    });

    test('should format timestamp correctly', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Timestamp:** 2024-01-15T10:30:00Z');
    });

    test('should format duration with ms unit', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).toContain('**Duration:** 1500ms');
    });
  });

  describe('formatExecutionContext - Error Section', () => {
    test('should include error message when present', () => {
      const context: ExecutionContextData = {
        ...baseContext,
        error_message: 'Connection timeout',
      };
      const result = formatExecutionContext(context);
      expect(result).toContain('**Error:**');
      expect(result).toContain('Connection timeout');
    });

    test('should not include error section when error_message is undefined', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).not.toContain('**Error:**');
    });

    test('should include error stack trace when present', () => {
      const stackTrace = 'Error: Connection timeout\n  at node.js:42:10';
      const context: ExecutionContextData = {
        ...baseContext,
        error_message: 'Connection timeout',
        error_stack: stackTrace,
      };
      const result = formatExecutionContext(context);
      expect(result).toContain('**Stack Trace:**');
      expect(result).toContain('Error: Connection timeout');
    });

    test('should limit stack trace to first 10 lines', () => {
      const stackLines = Array(15)
        .fill('at someFunction()')
        .join('\n');
      const context: ExecutionContextData = {
        ...baseContext,
        error_message: 'Error',
        error_stack: stackLines,
      };
      const result = formatExecutionContext(context);
      const stackSection = result.substring(result.indexOf('**Stack Trace:**'));
      const lineCount = (stackSection.match(/at someFunction\(\)/g) || [])
        .length;
      expect(lineCount).toBeLessThanOrEqual(10);
    });

    test('should handle stack trace formatting errors gracefully', () => {
      const context: ExecutionContextData = {
        ...baseContext,
        error_stack: null as any,
      };
      expect(() => formatExecutionContext(context)).not.toThrow();
    });
  });

  describe('formatExecutionContext - Payload Sections', () => {
    test('should include input payload when present', () => {
      const context: ExecutionContextData = {
        ...baseContext,
        input_payload: { param1: 'value1' },
      };
      const result = formatExecutionContext(context);
      expect(result).toContain('**Input Payload:**');
      expect(result).toContain('param1');
      expect(result).toContain('value1');
    });

    test('should not include input payload section when undefined', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).not.toContain('**Input Payload:**');
    });

    test('should include output payload when present', () => {
      const context: ExecutionContextData = {
        ...baseContext,
        output_payload: { result: 'success' },
      };
      const result = formatExecutionContext(context);
      expect(result).toContain('**Output Payload:**');
      expect(result).toContain('result');
      expect(result).toContain('success');
    });

    test('should not include output payload section when undefined', () => {
      const result = formatExecutionContext(baseContext);
      expect(result).not.toContain('**Output Payload:**');
    });

    test('should format payloads as JSON code blocks', () => {
      const context: ExecutionContextData = {
        ...baseContext,
        input_payload: { test: 'data' },
      };
      const result = formatExecutionContext(context);
      expect(result).toContain('