# Canvas Warning System Implementation

FILENAME: index.js
```javascript
import { EventEmitter } from 'events';

/**
 * Canvas Warning System
 * Detects misconfiguration scenarios and provides rich visual feedback
 */
class CanvasWarningSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.warnings = new Map();
    this.suppressedWarnings = new Set();
    this.detectionLatency = 0;
    this.storagePrefix = 'canvas-warning-';
    this.loadSuppressedWarnings();
  }

  /**
   * Main detection pipeline - runs on canvas save
   * Target: <100ms latency
   */
  async detectWarnings(canvas) {
    const startTime = performance.now();
    this.warnings.clear();

    try {
      // Run all detection algorithms in parallel
      await Promise.all([
        this.detectActionNodesWithoutInputs(canvas),
        this.detectOrphanedNodes(canvas),
        this.detectMissingNodeConfigurations(canvas),
        this.detectCircularDependencies(canvas),
        this.detectUnconnectedOutputs(canvas),
        this.detectMissingVariableReferences(canvas),
        this.detectInvalidNodeTypes(canvas),
        this.detectResourceExhaustion(canvas),
      ]);

      this.detectionLatency = performance.now() - startTime;
      this.emit('warnings-detected', this.getActiveWarnings());
      return this.getActiveWarnings();
    } catch (error) {
      this.emit('detection-error', error);
      throw error;
    }
  }

  /**
   * Detection Algorithm 1: Action node with no inputs
   */
  async detectActionNodesWithoutInputs(canvas) {
    canvas.nodes.forEach((node) => {
      if (node.type === 'action' && !this.hasInputConnections(node, canvas)) {
        this.addWarning({
          nodeId: node.id,
          type: 'action-no-inputs',
          severity: 'warning',
          title: 'Action node has no inputs',
          explanation:
            'This action will execute with no data. Connect input nodes or configure static inputs.',
          affectedNodes: [node.id],
          remediationSteps: [
            'Connect an input node to this action',
            'Or configure static input values in the node settings',
            'Or use this action as a trigger with event-based inputs',
          ],
        });
      }
    });
  }

  /**
   * Detection Algorithm 2: Orphaned nodes (unreferenced)
   */
  async detectOrphanedNodes(canvas) {
    const referencedNodeIds = new Set();

    canvas.nodes.forEach((node) => {
      if (node.edges) {
        node.edges.forEach((edge) => {
          referencedNodeIds.add(edge.target);
        });
      }
    });

    canvas.nodes.forEach((node) => {
      const isStartNode = node.type === 'start' || node.isEntryPoint;
      const isReferenced = referencedNodeIds.has(node.id);
      const hasOutgoing = node.edges && node.edges.length > 0;

      if (!isStartNode && !isReferenced && !hasOutgoing) {
        this.addWarning({
          nodeId: node.id,
          type: 'orphaned-node',
          severity: 'info',
          title: 'Orphaned node detected',
          explanation:
            'This node is not connected to any other nodes and will not execute.',
          affectedNodes: [node.id],
          remediationSteps: [
            'Connect this node to the canvas workflow',
            'Or delete this node if no longer needed',
          ],
        });
      }
    });
  }

  /**
   * Detection Algorithm 3: Missing node configurations
   */
  async detectMissingNodeConfigurations(canvas) {
    const requiredConfigFields = {
      api: ['endpoint', 'method'],
      database: ['connection', 'query'],
      transform: ['template'],
      conditional: ['condition'],
      loop: ['iterator', 'body'],
    };

    canvas.nodes.forEach((node) => {
      const required = requiredConfigFields[node.type];
      if (required) {
        const missing = required.filter((field) => !node.config?.[field]);
        if (missing.length > 0) {
          this.addWarning({
            nodeId: node.id,
            type: 'missing-configuration',
            severity: 'error',
            title: `Missing required configuration for ${node.type}`,
            explanation: `This ${node.type} node requires: ${missing.join(', ')}`,
            affectedNodes: [node.id],
            remediationSteps: [
              `Configure the following fields: ${missing.join(', ')}`,
              'Use the node inspector panel to set these values',
            ],
          });
        }
      }
    });
  }

  /**
   * Detection Algorithm 4: Circular dependencies
   */
  async detectCircularDependencies(canvas) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const hasCycle = (nodeId, path = []) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = canvas.nodes.find((n) => n.id === nodeId);
      if (node?.edges) {
        for (const edge of node.edges) {
          if (!visited.has(edge.target)) {
            if (hasCy