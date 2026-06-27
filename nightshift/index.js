FILENAME: index.js
```javascript
// Run Inspection UX Improvements

import React, { useState, useEffect } from 'react';
import { ChevronUp, Maximize2, X } from 'lucide-react';

/**
 * Formats duration between two timestamps
 * @param {number|string} startTime - Start timestamp (ms)
 * @param {number|string} endTime - End timestamp (ms)
 * @param {boolean} isRunning - Whether run is currently executing
 * @returns {string} Human-readable duration
 */
export const formatDuration = (startTime, endTime, isRunning = false) => {
  if (!startTime) return 'Duration unavailable';
  if (!isRunning && !endTime) return 'Duration unavailable';

  const start = new Date(startTime).getTime();
  const end = isRunning ? Date.now() : new Date(endTime).getTime();

  if (isNaN(start) || isNaN(end)) return 'Invalid timestamps';
  if (end < start) return 'Invalid timestamps';

  const totalSeconds = Math.floor((end - start) / 1000);
  return formatSeconds(totalSeconds, isRunning);
};

/**
 * Converts seconds to human-readable format
 * @param {number} seconds - Total seconds
 * @param {boolean} isRunning - Whether currently running
 * @returns {string} Formatted duration
 */
const formatSeconds = (seconds, isRunning = false) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  const duration = parts.join(' ');
  return isRunning ? `${duration} (in progress)` : duration;
};

/**
 * Run Duration Display Component
 */
export const RunDurationDisplay = ({ startTime, endTime, isRunning = false }) => {
  const [displayDuration, setDisplayDuration] = useState(
    formatDuration(startTime, endTime, isRunning)
  );

  useEffect(() => {
    if (!isRunning) {
      setDisplayDuration(formatDuration(startTime, endTime, false));
      return;
    }

    const interval = setInterval(() => {
      setDisplayDuration(formatDuration(startTime, endTime, true));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, isRunning]);

  return (
    <div className="text-sm text-gray-600 mt-1">
      <div className="flex items-center gap-2">
        {isRunning && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
        <span>{displayDuration}</span>
      </div>
    </div>
  );
};

/**
 * Node Execution Duration Component
 */
export const NodeExecutionDuration = ({ nodeStartTime, nodeEndTime, nodeIsRunning = false }) => {
  const [displayDuration, setDisplayDuration] = useState(
    formatDuration(nodeStartTime, nodeEndTime, nodeIsRunning)
  );

  useEffect(() => {
    if (!nodeIsRunning) {
      setDisplayDuration(formatDuration(nodeStartTime, nodeEndTime, false));
      return;
    }

    const interval = setInterval(() => {
      setDisplayDuration(formatDuration(nodeStartTime, nodeEndTime, true));
    }, 1000);

    return () => clearInterval(interval);
  }, [nodeStartTime, nodeEndTime, nodeIsRunning]);

  return (
    <div className="text-xs text-gray-500 mt-1">
      <div className="flex items-center gap-1">
        {nodeIsRunning && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
        <span>{displayDuration}</span>
      </div>
    </div>
  );
};

/**
 * JSON Tree with configurable expansion depth
 */
class JSONTreeNode extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: props.depth < props.expandToDepth,
    };
  }

  toggleExpand = () => {
    this.setState((prev) => ({ expanded: !prev.expanded }));
  };

  render() {
    const { data, depth = 0, expandToDepth = 2, path = 'root' } = this.props;
    const { expanded } = this.state;

    if (data === null) {
      return <span className="text-gray-500">null</span>;
    }

    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        return <span className="text-red-600">"{data}"</span>;
      }
      if (typeof data === 'number') {
        return <span className="text-blue-600">{data}</span>;
      }
      if (typeof data === 'boolean') {
        return <span className="text-purple-600">{String(data)}</span>;
      }
      return <span>{String(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
    const isEmpty = entries.length === 0;

    if (isEmpty) {
      return <span className="text-gray-600">{isArray ? '[]' : '{}'}</span>;
    }

    return (
      <div className="font-mono text-sm">
        <div
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 py-0.5 px-1 rounded"
          onClick={this.toggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              this.toggleExpand();
            }
 