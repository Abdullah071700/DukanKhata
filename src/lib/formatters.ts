/**
 * Formats a number into Indian Rupees (₹) currency string.
 * Example: 123456.7 -> "₹1,23,456.70"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₹0';
  
  // Format with standard Indian locale
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a clean, readable Indian date.
 * Example: "2026-10-21" -> "21 Oct 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  // If YYYY-MM-DD format, split to prevent timezone shifts
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sanitizes cell text to protect against formula injection in Excel/CSV.
 * If text begins with =, +, -, @, \t, or \r, prefix with a single quote.
 */
export function sanitizeSpreadsheetValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Helper to round to 2 decimal places safely.
 */
export function round2(num: number): number {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}
