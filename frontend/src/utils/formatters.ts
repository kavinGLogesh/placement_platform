/**
 * Formats a Date object or ISO string to a human-readable timestamp
 */
export const formatTimestamp = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(d);
};

/**
 * Formats milliseconds to readable latency string
 */
export const formatLatency = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '--';
  return `${ms} ms`;
};
