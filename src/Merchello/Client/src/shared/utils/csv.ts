/**
 * CSV column definition for mapping data to CSV columns
 */
export interface CsvColumn<T> {
  /** Column header text */
  header: string;
  /** Function to extract value from data item */
  accessor: (item: T) => string | number | null | undefined;
}

/**
 * Escape a value for CSV format.
 * Wraps in quotes if contains comma, quote, or newline.
 * Doubles any quotes within the value.
 */
function escapeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If contains special characters, wrap in quotes and escape internal quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV content from an array of data items.
 * @param data - Array of data items to convert
 * @param columns - Column definitions for the CSV
 * @returns CSV content as a string
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  // Generate header row
  const headerRow = columns.map((col) => escapeValue(col.header)).join(",");

  // Generate data rows
  const dataRows = data.map((item) =>
    columns.map((col) => escapeValue(col.accessor(item))).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 * @param content - CSV content as a string
 * @param filename - Name for the downloaded file
 */
export function downloadCsv(content: string, filename: string): void {
  // Create blob with UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.addEventListener("click", (event) => event.stopPropagation(), { once: true });
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Format a date string for CSV export (YYYY-MM-DD format).
 * @param dateString - ISO date string to format
 * @returns Formatted date string
 */
export function formatDateForCsv(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {    
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
