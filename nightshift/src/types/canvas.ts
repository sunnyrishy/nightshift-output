export type WarningsSeverity = 'error' | 'warning' | 'info';

export interface CanvasWarning {
  id: string;
  nodeId: string;
  severity: WarningsSeverity;
  message: string;
  relatedNodeIds: string[];
  type: 'dead_node' | 'unconnected_required_input' | 'unreachable_node' | 'conditional_without_branches' | 'cycle';
}

export interface CanvasNode {
  id: string;
  name: string;
  type: 'action' | 'conditional' | 'start' | 'end';
  inputPorts?: Array<{
    id: string;
    name: string;
    required: boolean;
  }>;
  outputPorts?: Array<{
    id: string;
    name: string;
  }>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}