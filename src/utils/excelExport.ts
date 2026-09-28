import * as XLSX from 'xlsx';

/**
 * Exports an array of JSON objects to an Excel (.xlsx) spreadsheet file.
 * Automatically formats column headers and adjusts cell widths.
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'Sheet1'): void {
  if (!data || data.length === 0) {
    alert('No data available to export for this task.');
    return;
  }

  try {
    // Create worksheet from JSON
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Calculate auto-fit column widths
    const keys = Object.keys(data[0]);
    const colWidths = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((item) => {
          const val = item[key];
          return val !== null && val !== undefined ? String(val).length : 0;
        })
      );
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
    });
    worksheet['!cols'] = colWidths;

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

    // Download the Excel file
    const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  } catch (error) {
    console.error('Failed to export Excel file:', error);
    alert('An error occurred while exporting the Excel file. Please check console for details.');
  }
}

/**
 * Exports multiple tabs/datasets into a single multi-sheet Excel workbook.
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, any>[] }[],
  fileName: string
): void {
  try {
    const workbook = XLSX.utils.book_new();
    let hasAnyData = false;

    sheets.forEach(({ name, data }) => {
      const sheetTitle = name.replace(/[\\/?*[]]/g, '_').slice(0, 31) || 'Sheet';
      if (data && data.length > 0) {
        hasAnyData = true;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const keys = Object.keys(data[0]);
        const colWidths = keys.map((key) => {
          const maxLen = Math.max(
            key.length,
            ...data.map((item) => {
              const val = item[key];
              return val !== null && val !== undefined ? String(val).length : 0;
            })
          );
          return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
        });
        worksheet['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
      } else {
        const worksheet = XLSX.utils.json_to_sheet([{ Notice: 'No records available in this section' }]);
        worksheet['!cols'] = [{ wch: 35 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
      }
    });

    if (!hasAnyData && sheets.length === 0) {
      alert('No data available to export across sheets.');
      return;
    }

    const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  } catch (error) {
    console.error('Failed to export multi-sheet Excel file:', error);
    alert('An error occurred while exporting the multi-sheet Excel file.');
  }
}
