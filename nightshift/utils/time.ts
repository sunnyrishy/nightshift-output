/**
 * Format duration between two timestamps into human-readable format
 * @param startTime - ISO string or timestamp in milliseconds
 * @param endTime - ISO string or timestamp in milliseconds (optional, defaults to now)
 * @returns Formatted duration string (e.g., "2m 34s")
 */
export function formatDuration(
  startTime: string | number | null | undefined,
  endTime?: string | number | null | undefined
): string {
  if (!startTime) {
    return "0s";
  }

  const start = new Date(startTime).getTime();
  if (isNaN(start)) {
    return "0s";
  }

  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (isNaN(end)) {
    return "0s";
  }

  const durationMs = Math.max(0, end - start);
  return formatMilliseconds(durationMs);
}

/**
 * Format milliseconds into human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatMilliseconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    const hours = totalHours % 24;
    return `${totalDays}d ${hours}h`;
  }

  if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    return `${totalHours}h ${minutes}m`;
  }

  if (totalMinutes > 0) {
    const seconds = totalSeconds % 60;
    return `${totalMinutes}m ${seconds}s`;
  }

  return `${totalSeconds}s`;
}

/**
 * Hook to get real-time duration updates for active runs
 */
export function useDuration(
  startTime: string | number | null | undefined,
  endTime?: string | number | null | undefined,
  isActive: boolean = false
) {
  const [duration, setDuration] = React.useState(() =>
    formatDuration(startTime, endTime)
  );

  React.useEffect(() => {
    if (!isActive || !startTime) return;

    const interval = setInterval(() => {
      setDuration(formatDuration(startTime, endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, isActive]);

  return duration;
}