const ExcelJS = require('exceljs');

function normalizeCellValue(value) {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'object') return value;
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return normalizeCellValue(value.result);
    if (Object.prototype.hasOwnProperty.call(value, 'text')) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || '').join('');
    if (Object.prototype.hasOwnProperty.call(value, 'hyperlink')) return value.text || value.hyperlink;
    return String(value);
}

function worksheetToRows(worksheet) {
    const rows = [];
    const rowCount = worksheet.rowCount || 0;
    const columnCount = worksheet.columnCount || 0;

    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const values = [];
        for (let colNumber = 1; colNumber <= columnCount; colNumber++) {
            values.push(normalizeCellValue(row.getCell(colNumber).value));
        }
        rows.push(values);
    }

    return rows;
}

function buildWorkbook(workbook) {
    const sheetNames = workbook.worksheets.map(sheet => sheet.name);
    const sheets = {};
    for (const worksheet of workbook.worksheets) {
        sheets[worksheet.name] = {
            name: worksheet.name,
            rows: worksheetToRows(worksheet)
        };
    }
    return { SheetNames: sheetNames, Sheets: sheets };
}

function valueWithDefault(value, defval) {
    if (value === null || value === undefined || value === '') {
        return defval !== undefined ? defval : undefined;
    }
    return value;
}

function trimTrailingUndefined(row) {
    let end = row.length;
    while (end > 0 && row[end - 1] === undefined) end--;
    return row.slice(0, end);
}

function sheetToJson(sheet, options = {}) {
    const rows = sheet?.rows || [];
    const defval = options.defval;

    if (options.header === 1) {
        return rows.map(row => trimTrailingUndefined(row.map(value => valueWithDefault(value, defval))));
    }

    const headers = (rows[0] || []).map(header => String(header || '').trim());
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
        const result = {};
        headers.forEach((header, index) => {
            if (!header) return;
            const value = valueWithDefault(row[index], defval);
            if (value !== undefined) result[header] = value;
        });
        return result;
    }).filter(row => Object.keys(row).length > 0);
}

function parseDateCode(serial) {
    if (typeof serial !== 'number' || !Number.isFinite(serial)) return null;
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    return {
        y: date.getUTCFullYear(),
        m: date.getUTCMonth() + 1,
        d: date.getUTCDate()
    };
}

async function read(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return buildWorkbook(workbook);
}

async function readFile(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return buildWorkbook(workbook);
}

module.exports = {
    read,
    readFile,
    utils: {
        sheet_to_json: sheetToJson
    },
    SSF: {
        parse_date_code: parseDateCode
    }
};
