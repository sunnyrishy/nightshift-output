export interface ExecutionContext {
  nodeId: string;
  executionId: string;
  status: 'failed' | 'degraded' | 'success' | 'running' | 'pending';
  createdAt: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  nodeConfig?: Record<string, any>;
}

export interface SerializedExecutionContext {
  nodeId: string;
  executionId: string;
  status: string;
  createdAt: string;
  inputFormatted: string;
  outputFormatted?: string;
  errorFormatted?: string;
  nodeConfigFormatted?: string;
}