import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

// Builds a real .xlsx file client-side from whatever rows are currently
// visible (already filtered) and triggers a browser download. Each column's
// `value` pulls straight from the underlying record, not the grid's
// formatted display, so exports carry the full set of fields (amounts,
// comments, etc.) regardless of what the table itself shows.
export function exportToExcel<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const data = rows.map((row) => {
    const record: Record<string, any> = {};
    columns.forEach((col) => {
      record[col.header] = col.value(row) ?? '';
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  const dateStamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${dateStamp}.xlsx`);
}
