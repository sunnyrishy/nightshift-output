export interface ExecutionContextData {
  id: string;
  node_name: string;
  status: string;
  input_payload?: Record<string, any>;
  output_payload?: Record<string, any>;
  error_message?: string;
  error_stack?: string;
  timestamp: string;
  duration: number;
  node_config?: Record<string, any>;
  truncated_fields?: string[];
}

const MAX_PAYLOAD_SIZE = 5120; // 5KB in characters

export function formatExecutionContext(context: ExecutionContextData): string {
  const sections: string[] = [];

  // Header
  sections.push("**Execution Debugging Context**\n");

  // Basic Info
  sections.push(`**Node:** ${context.node_name}`);
  sections.push(`**Execution ID:** ${context.id}`);
  sections.push(`**Status:** ${context.status}`);
  sections.push(`**Timestamp:** ${context.timestamp}`);
  sections.push(`**Duration:** ${context.duration}ms\n`);

  // Error section (if applicable)
  if (context.error_message) {
    sections.push("**Error:**");
    sections.push(context.error_message);
    if (context.error_stack) {
      sections.push("\n**Stack Trace:**");
      sections.push(formatStackTrace(context.error_stack));
    }
    sections.push("");
  }

  // Input payload
  if (context.input_payload) {
    sections.push("**Input Payload:**");
    sections.push(formatPayload(context.input_payload));
    sections.push("");
  }

  // Output payload
  if (context.output_payload) {
    sections.push("**Output Payload:**");
    sections.push(formatPayload(context.output_payload));
    sections.push("");
  }

  // Node configuration
  if (context.node_config) {
    sections.push("**Node Configuration:**");
    sections.push(formatPayload(context.node_config));
    sections.push("");
  }

  // Truncation notice
  if (context.truncated_fields && context.truncated_fields.length > 0) {
    sections.push(
      `_Note: The following fields were truncated: ${context.truncated_fields.join(", ")}_`
    );
  }

  return sections.join("\n");
}

function formatPayload(payload: any): string {
  try {
    const jsonString = JSON.stringify(payload, null, 2);

    if (jsonString.length > MAX_PAYLOAD_SIZE) {
      return (
        jsonString.substring(0, MAX_PAYLOAD_SIZE) +
        "\n...\n_[Payload truncated - too large to display]_"
      );
    }

    return `\`\`\`json\n${jsonString}\n\`\`\``;
  } catch (error) {
    return "[Unable to format payload]";
  }
}

function formatStackTrace(stackTrace: string): string {
  try {
    const lines = stackTrace.split("\n").slice(0, 10); // Limit to first 10 lines
    return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
  } catch (error) {
    return `\`\`\`\n${stackTrace.substring(0, MAX_PAYLOAD_SIZE)}\n\`\`\``;
  }
}

export function truncatePayload(
  payload: any,
  maxSize: number = MAX_PAYLOAD_SIZE
): { data: any; truncated: boolean } {
  try {
    const jsonString = JSON.stringify(payload);
    if (jsonString.length > maxSize) {
      return {
        data: JSON.parse(jsonString.substring(0, maxSize)),
        truncated: true,
      };
    }
    return { data: payload, truncated: false };
  } catch (error) {
    return { data: payload, truncated: true };
  }
}