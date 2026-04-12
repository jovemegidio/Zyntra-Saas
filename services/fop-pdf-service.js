/**
 * Serviço de conversão XML → PDF via Apache FOP (XSL-FO)
 *
 * Pipeline: dados da ordem → XML → XSLT transforma em XSL-FO → Apache FOP gera PDF
 *
 * Requer Apache FOP instalado no servidor:
 *   - Linux (VPS): apt install fop  OU  download manual em /opt/fop/
 *   - Windows (dev): choco install fop  OU  download manual
 *
 * @module services/fop-pdf-service
 */
'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const XSL_TEMPLATE = path.join(__dirname, '..', 'modules', 'PCP', 'ordem-producao-fo.xsl');

// Possíveis locais do binário FOP
const FOP_PATHS = [
    process.env.FOP_PATH,                                    // Variável de ambiente
    '/usr/bin/fop',                                          // Linux (apt install fop)
    '/opt/fop/fop',                                          // Linux (instalação manual)
    '/opt/fop/fop/fop',                                      // Variação
    'C:\\fop\\fop.bat',                                      // Windows
    path.join(__dirname, '..', 'vendor', 'fop', 'fop'),      // Local (vendor/)
    path.join(__dirname, '..', 'vendor', 'fop', 'fop.bat'),  // Local Windows
].filter(Boolean);

/**
 * Encontra o binário do Apache FOP no sistema
 * @returns {string|null} Caminho do FOP ou null se não encontrado
 */
function findFopBinary() {
    for (const fopPath of FOP_PATHS) {
        try {
            if (fs.existsSync(fopPath)) return fopPath;
        } catch (_) { /* ignora */ }
    }
    // Tenta achar no PATH do sistema
    const ext = os.platform() === 'win32' ? '.bat' : '';
    const inPath = `fop${ext}`;
    try {
        const { execSync } = require('child_process');
        const result = os.platform() === 'win32'
            ? execSync(`where fop`, { encoding: 'utf8', timeout: 5000 }).trim()
            : execSync(`which fop`, { encoding: 'utf8', timeout: 5000 }).trim();
        if (result) return result.split('\n')[0].trim();
    } catch (_) { /* não está no PATH */ }
    return null;
}

/**
 * Converte XML da Ordem de Produção em PDF usando Apache FOP
 *
 * @param {string} xmlContent - Conteúdo XML da ordem (gerado por ordem-xml-generator.js)
 * @param {Object} [options] - Opções
 * @param {string} [options.xslPath] - Caminho customizado do XSL template
 * @param {string} [options.outputPath] - Caminho do PDF de saída (default: temp)
 * @param {number} [options.timeout] - Timeout em ms (default: 30s)
 * @returns {Promise<Buffer>} Buffer do PDF gerado
 */
async function gerarPdfComFop(xmlContent, options = {}) {
    const fopBin = findFopBinary();
    if (!fopBin) {
        throw new Error(
            'Apache FOP não encontrado. Instale via: apt install fop (Linux) ou ' +
            'defina FOP_PATH no .env. Veja setup-fop.sh para instruções.'
        );
    }

    const xslPath = options.xslPath || XSL_TEMPLATE;
    if (!fs.existsSync(xslPath)) {
        throw new Error(`Template XSL-FO não encontrado: ${xslPath}`);
    }

    const timeout = options.timeout || 30000;
    const tmpId = crypto.randomBytes(8).toString('hex');
    const tmpDir = path.join(os.tmpdir(), 'zyntra-fop');
    const xmlFile = path.join(tmpDir, `ordem-${tmpId}.xml`);
    const pdfFile = options.outputPath || path.join(tmpDir, `ordem-${tmpId}.pdf`);

    // Garantir que o diretório temp existe
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    try {
        // Escreve XML temporário
        fs.writeFileSync(xmlFile, xmlContent, 'utf8');

        // Executa Apache FOP: fop -xml input.xml -xsl template.xsl -pdf output.pdf
        await new Promise((resolve, reject) => {
            const args = ['-xml', xmlFile, '-xsl', xslPath, '-pdf', pdfFile];

            console.log(`🔄 Executando FOP: ${fopBin} ${args.join(' ')}`);

            execFile(fopBin, args, { timeout, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    console.error('❌ FOP erro:', err.message);
                    if (stderr) console.error('FOP stderr:', stderr);
                    return reject(new Error(`FOP falhou: ${err.message}\n${stderr || ''}`));
                }
                if (stderr && stderr.includes('SEVERE')) {
                    console.warn('⚠️ FOP warnings:', stderr);
                }
                console.log('✅ FOP gerou PDF com sucesso');
                resolve();
            });
        });

        // Lê o PDF gerado
        const pdfBuffer = fs.readFileSync(pdfFile);
        return pdfBuffer;

    } finally {
        // Limpa arquivos temporários
        try { fs.unlinkSync(xmlFile); } catch (_) {}
        try { if (!options.outputPath) fs.unlinkSync(pdfFile); } catch (_) {}
    }
}

/**
 * Verifica se o Apache FOP está disponível no sistema
 * @returns {{ available: boolean, path: string|null, version: string|null }}
 */
function verificarFop() {
    const fopBin = findFopBinary();
    if (!fopBin) return { available: false, path: null, version: null };

    let version = null;
    try {
        const { execSync } = require('child_process');
        const out = execSync(`"${fopBin}" -version`, { encoding: 'utf8', timeout: 10000 });
        const match = out.match(/FOP Version ([\d.]+)/i);
        if (match) version = match[1];
    } catch (_) {}

    return { available: true, path: fopBin, version };
}

module.exports = { gerarPdfComFop, verificarFop, findFopBinary };
