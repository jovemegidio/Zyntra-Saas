/**
 * Automatic print queue for PCP.
 * Uses OS-native print commands instead of the deprecated printer package.
 */

const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function runCommand(command, args, timeout = 8000) {
    try {
        const { stdout } = await execFileAsync(command, args, {
            timeout,
            windowsHide: true,
            maxBuffer: 1024 * 1024
        });
        return stdout || '';
    } catch {
        return '';
    }
}

function lines(output) {
    return output.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

async function listNativePrinters() {
    if (process.platform === 'win32') {
        const output = await runCommand('powershell.exe', [
            '-NoProfile',
            '-Command',
            'Get-Printer | Select-Object -ExpandProperty Name'
        ]);
        return lines(output).map(name => ({ name, status: 'available' }));
    }

    const output = await runCommand('lpstat', ['-e']);
    return lines(output).map(name => ({ name, status: 'available' }));
}

async function getNativeDefaultPrinter() {
    if (process.platform === 'win32') {
        const output = await runCommand('powershell.exe', [
            '-NoProfile',
            '-Command',
            '(Get-CimInstance Win32_Printer | Where-Object Default -eq $true | Select-Object -First 1 -ExpandProperty Name)'
        ]);
        return lines(output)[0] || null;
    }

    const output = await runCommand('lpstat', ['-d']);
    const match = output.match(/:\s*(.+)$/);
    return match ? match[1].trim() : null;
}

async function printNativeFile(filePath, job) {
    if (process.platform === 'win32') {
        await execFileAsync('powershell.exe', [
            '-NoProfile',
            '-Command',
            'Start-Process -FilePath $args[0] -Verb Print -WindowStyle Hidden',
            filePath
        ], { timeout: 30000, windowsHide: true });
        return `win32-${Date.now()}`;
    }

    const args = [];
    if (job.printer) args.push('-d', job.printer);
    if (job.copies) args.push('-n', String(job.copies));
    if (job.paperSize) args.push('-o', `media=${job.paperSize}`);
    args.push('-o', job.orientation === 'landscape' ? 'landscape' : 'portrait');
    args.push(filePath);

    const output = await execFileAsync('lp', args, {
        timeout: 30000,
        windowsHide: true
    });
    return String(output.stdout || '').trim() || `lp-${Date.now()}`;
}

class AutoPrintSystem {
    constructor() {
        this.printQueue = [];
        this.printHistory = [];
        this.availablePrinters = [];
        this.printerSettings = {
            defaultPrinter: process.env.DEFAULT_PRINTER || null,
            paperSize: 'A4',
            orientation: 'portrait',
            copies: 1,
            colorMode: 'color'
        };
        this.pdfConfig = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };
        this.queueProcessingInterval = null;
        this.ready = this.init();
    }

    async init() {
        try {
            await this.loadPrintQueue();
            await this.detectAvailablePrinters();
            this.startQueueProcessor();
            console.log('[print] Sistema de impressao inicializado');
        } catch (error) {
            console.error('[print] Erro ao inicializar:', error.message);
        }
    }

    async ensureReady() {
        await this.ready;
    }

    async queueFilePath() {
        const logsDir = path.join(__dirname, '..', 'logs');
        await fs.mkdir(logsDir, { recursive: true });
        return path.join(logsDir, 'print-queue.json');
    }

    async loadPrintQueue() {
        try {
            const queueFile = await this.queueFilePath();
            const data = await fs.readFile(queueFile, 'utf8');
            this.printQueue = JSON.parse(data);
        } catch {
            this.printQueue = [];
            await this.savePrintQueue();
        }
    }

    async savePrintQueue() {
        try {
            const queueFile = await this.queueFilePath();
            await fs.writeFile(queueFile, JSON.stringify(this.printQueue, null, 2));
        } catch (error) {
            console.error('[print] Erro ao salvar fila:', error.message);
        }
    }

    async detectAvailablePrinters() {
        this.availablePrinters = await listNativePrinters();
        if (!this.printerSettings.defaultPrinter) {
            this.printerSettings.defaultPrinter =
                await getNativeDefaultPrinter() ||
                this.availablePrinters[0]?.name ||
                null;
        }
        return this.availablePrinters;
    }

    async detectPrinters() {
        await this.ensureReady();
        return this.detectAvailablePrinters();
    }

    async convertExcelToPDF(excelFilePath, outputPath = null) {
        const pdfPath = outputPath || excelFilePath.replace(/\.xlsx?$/i, '.pdf');
        const htmlContent = await this.excelToHTML(excelFilePath);
        const tempDir = path.join(__dirname, '..', 'temp_excel');
        await fs.mkdir(tempDir, { recursive: true });
        const tempHtmlPath = path.join(tempDir, `print-${Date.now()}.html`);

        await fs.writeFile(tempHtmlPath, htmlContent);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
            await page.pdf({ path: pdfPath, ...this.pdfConfig });
            return pdfPath;
        } finally {
            await browser.close();
            fs.unlink(tempHtmlPath).catch(() => {});
        }
    }

    async excelToHTML(excelFilePath) {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet(1);

        let html = '<!doctype html><html><head><meta charset="UTF-8"><style>';
        html += 'body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}';
        html += 'td,th{border:1px solid #ddd;padding:8px;text-align:left}.header{background:#f2f2f2;font-weight:bold}';
        html += '.number{text-align:right}@media print{body{margin:0}table{page-break-inside:avoid}}';
        html += '</style></head><body><table>';

        worksheet.eachRow((row, rowNumber) => {
            html += '<tr>';
            row.eachCell(cell => {
                const value = cell.value ?? '';
                const cellClass = rowNumber <= 3 ? 'header' : (typeof value === 'number' ? 'number' : '');
                html += `<td class="${cellClass}">${String(value)}</td>`;
            });
            html += '</tr>';
        });

        html += '</table></body></html>';
        return html;
    }

    async addToPrintQueue(printJob) {
        await this.ensureReady();

        const job = {
            id: `print_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            type: printJob.type || 'pdf',
            filePath: printJob.filePath,
            printer: printJob.printer || this.printerSettings.defaultPrinter,
            copies: printJob.copies || 1,
            paperSize: printJob.paperSize || 'A4',
            orientation: printJob.orientation || 'portrait',
            colorMode: printJob.colorMode || 'color',
            priority: printJob.priority || 'normal',
            createdAt: new Date().toISOString(),
            status: 'pending',
            createdBy: printJob.createdBy || 'system',
            retryCount: 0,
            metadata: {
                documentName: printJob.documentName || path.basename(printJob.filePath),
                department: printJob.department || 'Geral',
                requestId: printJob.requestId || null,
                ...(printJob.metadata || {})
            }
        };

        if (job.priority === 'high') {
            this.printQueue.unshift(job);
        } else {
            this.printQueue.push(job);
        }

        await this.savePrintQueue();
        return job.id;
    }

    async addToQueue(filePath, options = {}) {
        const id = await this.addToPrintQueue({
            filePath,
            type: options.type || options.metadata?.type || 'pdf',
            printer: options.printer,
            copies: options.copies,
            paperSize: options.paperSize,
            orientation: options.orientation,
            colorMode: options.colorMode,
            priority: options.priority,
            metadata: options.metadata,
            documentName: options.metadata?.documentName || options.documentName,
            department: options.department
        });
        return this.printQueue.find(job => job.id === id) || { id };
    }

    startQueueProcessor() {
        if (this.queueProcessingInterval) clearInterval(this.queueProcessingInterval);
        this.queueProcessingInterval = setInterval(() => {
            this.processNextInQueue().catch(error => {
                console.error('[print] Erro no processador:', error.message);
            });
        }, 5000);
    }

    async processNextInQueue() {
        if (this.printQueue.length === 0) return;

        const job = this.printQueue[0];
        try {
            job.status = 'processing';
            job.processedAt = new Date().toISOString();
            await this.executeJob(job);
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            this.printHistory.unshift(job);
            this.printQueue.shift();
            if (this.printHistory.length > 100) this.printHistory = this.printHistory.slice(0, 100);
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date().toISOString();
            this.printQueue.shift();
            if ((job.retryCount || 0) < 3) {
                job.retryCount = (job.retryCount || 0) + 1;
                job.status = 'pending';
                this.printQueue.push(job);
            } else {
                this.printHistory.unshift(job);
            }
        }

        await this.savePrintQueue();
    }

    async executeJob(job) {
        await fs.access(job.filePath);

        if (!job.printer) {
            throw new Error('Nenhuma impressora configurada');
        }

        const knownPrinter = this.availablePrinters.find(p => p.name === job.printer);
        if (!knownPrinter) {
            await this.detectAvailablePrinters();
            if (!this.availablePrinters.find(p => p.name === job.printer)) {
                throw new Error(`Impressora nao encontrada: ${job.printer}`);
            }
        }

        let fileToPrint = job.filePath;
        if (job.type === 'excel') {
            fileToPrint = await this.convertExcelToPDF(job.filePath);
        }

        await this.printFile(fileToPrint, job);
    }

    async printFile(filePath, job) {
        const jobId = await printNativeFile(filePath, job);
        console.log(`[print] Enviado para impressora: ${jobId}`);
        return jobId;
    }

    async quickPrintExcel(excelFilePath, options = {}) {
        const id = await this.addToPrintQueue({
            type: 'excel',
            filePath: excelFilePath,
            documentName: options.documentName || path.basename(excelFilePath),
            copies: options.copies || 1,
            priority: options.priority || 'normal',
            createdBy: options.createdBy || 'user',
            department: options.department || 'PCP'
        });

        return {
            success: true,
            jobId: id,
            message: 'Documento adicionado a fila de impressao',
            queuePosition: this.printQueue.length
        };
    }

    async setDefaultPrinter(printerName) {
        await this.ensureReady();
        const printer = this.availablePrinters.find(p => p.name === printerName);
        if (!printer) throw new Error('Impressora nao encontrada');
        this.printerSettings.defaultPrinter = printerName;
        return printerName;
    }

    async getQueue() {
        await this.ensureReady();
        return this.printQueue;
    }

    async getHistory() {
        await this.ensureReady();
        return this.printHistory;
    }

    getQueueStatus() {
        const pending = this.printQueue.filter(j => j.status === 'pending').length;
        const processing = this.printQueue.filter(j => j.status === 'processing').length;
        const failed = this.printHistory.filter(j => j.status === 'failed').length;
        const completed = this.printHistory.filter(j => j.status === 'completed').length;

        return {
            queue: { total: this.printQueue.length, pending, processing },
            history: { total: this.printHistory.length, completed, failed },
            printers: {
                total: this.availablePrinters.length,
                default: this.printerSettings.defaultPrinter,
                available: this.availablePrinters.map(p => ({
                    name: p.name,
                    status: p.status,
                    isDefault: p.name === this.printerSettings.defaultPrinter
                }))
            }
        };
    }

    async cancelJob(jobId) {
        await this.ensureReady();
        const jobIndex = this.printQueue.findIndex(j => j.id === jobId);
        if (jobIndex === -1) throw new Error('Job nao encontrado na fila');

        const job = this.printQueue[jobIndex];
        job.status = 'cancelled';
        job.cancelledAt = new Date().toISOString();
        this.printQueue.splice(jobIndex, 1);
        this.printHistory.unshift(job);
        await this.savePrintQueue();
        return true;
    }

    async clearQueue() {
        await this.ensureReady();
        const cancelledJobs = this.printQueue.filter(j => j.status === 'pending');
        cancelledJobs.forEach(job => {
            job.status = 'cancelled';
            job.cancelledAt = new Date().toISOString();
            this.printHistory.unshift(job);
        });
        this.printQueue = this.printQueue.filter(j => j.status === 'processing');
        await this.savePrintQueue();
        return { cancelledCount: cancelledJobs.length };
    }

    async getStatistics() {
        await this.ensureReady();
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const jobs24h = this.printHistory.filter(j => new Date(j.createdAt) >= last24h);
        const jobs7d = this.printHistory.filter(j => new Date(j.createdAt) >= last7d);

        return {
            total: this.printHistory.length,
            last24h: {
                total: jobs24h.length,
                completed: jobs24h.filter(j => j.status === 'completed').length,
                failed: jobs24h.filter(j => j.status === 'failed').length,
                successRate: jobs24h.length > 0
                    ? Math.round((jobs24h.filter(j => j.status === 'completed').length / jobs24h.length) * 100)
                    : 0
            },
            last7d: {
                total: jobs7d.length,
                completed: jobs7d.filter(j => j.status === 'completed').length,
                failed: jobs7d.filter(j => j.status === 'failed').length,
                successRate: jobs7d.length > 0
                    ? Math.round((jobs7d.filter(j => j.status === 'completed').length / jobs7d.length) * 100)
                    : 0
            },
            byDepartment: this.getStatsByDepartment(),
            byPrinter: this.getStatsByPrinter()
        };
    }

    async updateSettings(settings = {}) {
        await this.ensureReady();
        const allowed = ['defaultPrinter', 'paperSize', 'orientation', 'copies', 'colorMode'];
        for (const key of allowed) {
            if (settings[key] !== undefined) this.printerSettings[key] = settings[key];
        }
        return this.printerSettings;
    }

    getStatsByDepartment() {
        const departments = {};
        this.printHistory.forEach(job => {
            const dept = job.metadata.department || 'Nao especificado';
            if (!departments[dept]) departments[dept] = { total: 0, completed: 0, failed: 0 };
            departments[dept].total++;
            if (job.status === 'completed') departments[dept].completed++;
            if (job.status === 'failed') departments[dept].failed++;
        });
        return departments;
    }

    getStatsByPrinter() {
        const printers = {};
        this.printHistory.forEach(job => {
            const printer = job.printer || 'Nao especificado';
            if (!printers[printer]) printers[printer] = { total: 0, completed: 0, failed: 0 };
            printers[printer].total++;
            if (job.status === 'completed') printers[printer].completed++;
            if (job.status === 'failed') printers[printer].failed++;
        });
        return printers;
    }

    async stop() {
        if (this.queueProcessingInterval) {
            clearInterval(this.queueProcessingInterval);
            this.queueProcessingInterval = null;
        }
        await this.savePrintQueue();
    }
}

const instance = new AutoPrintSystem();
module.exports = instance;
module.exports.AutoPrintSystem = AutoPrintSystem;
