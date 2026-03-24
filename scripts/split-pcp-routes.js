/**
 * Script de Refactoring: Split pcp-routes.js (God Object -> Domain modules)
 * 
 * Estrategia: Padrao "Mixin" - cada modulo exporta uma funcao que registra
 * rotas no mesmo router. ZERO mudancas em routes/index.js, ZERO mudancas
 * nas URLs dos endpoints.
 * 
 * Uso: node scripts/split-pcp-routes.js
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const PCP_FILE = path.join(ROUTES_DIR, 'pcp-routes.js');
const PCP_DIR = path.join(ROUTES_DIR, 'pcp');
const BACKUP_FILE = PCP_FILE + '.pre-split.bak';

// ========================================
// DOMAIN DEFINITIONS (verified line ranges)
// ========================================

const domains = [
    {
        name: 'configuracoes-routes',
        description: 'Configuracoes do Sistema (empresa, impostos, vendedores, certificados, etc.)',
        blocks: [
            { start: 3923, end: 5089 },
            { start: 5369, end: 6748 }
        ],
        deps: ['pool', 'authenticateToken', 'authorizeAdmin', 'cacheMiddleware', 'CACHE_CONFIG', 'writeAuditLog'],
        needsUpload: true,
        needsFs: true,
        needsLgpd: false
    },
    {
        name: 'clientes-routes',
        description: 'Gestao de Clientes (CRUD, autocomplete, historico)',
        blocks: [
            { start: 1885, end: 2305 }
        ],
        deps: ['pool', 'authenticateToken'],
        needsUpload: false,
        needsFs: false,
        needsLgpd: true
    },
    {
        name: 'print-routes',
        description: 'Sistema de Impressao (fila, impressoras, configuracoes)',
        blocks: [
            { start: 6749, end: 6992 }
        ],
        deps: ['pool', 'authenticateToken', 'authorizeAdmin'],
        needsUpload: true,
        needsFs: false,
        needsLgpd: false
    },
    {
        name: 'templates-routes',
        description: 'Editor de Templates (CRUD, export/import, customizacao)',
        blocks: [
            { start: 1643, end: 1884 }
        ],
        deps: ['pool', 'authenticateToken', 'authorizeAdmin'],
        needsUpload: true,
        needsFs: false,
        needsLgpd: false
    },
    {
        name: 'diario-producao-routes',
        description: 'Diario de Producao (registro diario, CRUD)',
        blocks: [
            { start: 2412, end: 2572 }
        ],
        deps: ['pool', 'authenticateToken'],
        needsUpload: false,
        needsFs: false,
        needsLgpd: false
    }
];

// ========================================
// EXTRACTION LOGIC
// ========================================

function main() {
    console.log('PCP Routes Splitter - Zyntra SGE');
    console.log('=====================================\n');

    // 1. Read the original file
    const originalContent = fs.readFileSync(PCP_FILE, 'utf8');
    const lines = originalContent.split('\n');
    console.log('Lido pcp-routes.js: ' + lines.length + ' linhas');

    // 2. Create backup
    fs.writeFileSync(BACKUP_FILE, originalContent, 'utf8');
    console.log('Backup criado: pcp-routes.js.pre-split.bak');

    // 3. Create pcp/ directory
    if (!fs.existsSync(PCP_DIR)) {
        fs.mkdirSync(PCP_DIR, { recursive: true });
        console.log('Diretorio criado: routes/pcp/');
    }

    // 4. Extract each domain
    const extractedRanges = [];

    for (const domain of domains) {
        console.log('\nExtraindo: ' + domain.name);
        console.log('   ' + domain.description);

        let extractedCode = '';
        let totalLines = 0;

        for (const block of domain.blocks) {
            const blockLines = lines.slice(block.start - 1, block.end);
            extractedCode += blockLines.join('\n') + '\n';
            totalLines += blockLines.length;
            extractedRanges.push({ start: block.start, end: block.end, domain: domain.name });
            console.log('   Bloco L' + block.start + '-L' + block.end + ': ' + blockLines.length + ' linhas');
        }

        // Adjust relative paths: routes/pcp-routes.js -> routes/pcp/xxx.js (one level deeper)
        extractedCode = adjustRequirePaths(extractedCode);

        // Generate the module file
        const moduleContent = generateModuleFile(domain, extractedCode);
        const outputPath = path.join(PCP_DIR, domain.name + '.js');
        fs.writeFileSync(outputPath, moduleContent, 'utf8');
        console.log('   Criado: routes/pcp/' + domain.name + '.js (' + totalLines + ' linhas extraidas)');
    }

    // 5. Modify pcp-routes.js - replace extracted blocks with require() calls
    console.log('\nModificando pcp-routes.js...');
    const modifiedContent = modifyOriginalFile(lines, extractedRanges, domains);
    fs.writeFileSync(PCP_FILE, modifiedContent, 'utf8');

    const newLines = modifiedContent.split('\n').length;
    console.log('   pcp-routes.js: ' + lines.length + ' -> ' + newLines + ' linhas (' + (lines.length - newLines) + ' removidas)');

    // 6. Summary
    console.log('\n========================================');
    console.log('RESUMO DA REFATORACAO');
    console.log('========================================');
    console.log('   Original:     ' + lines.length + ' linhas');
    console.log('   Novo:         ' + newLines + ' linhas');
    console.log('   Reducao:      ' + (lines.length - newLines) + ' linhas (' + Math.round((lines.length - newLines) / lines.length * 100) + '%)');
    console.log('   Arquivos:     ' + domains.length + ' modulos criados em routes/pcp/');
    console.log('   Backup:       routes/pcp-routes.js.pre-split.bak');
    console.log('\n   Nenhuma alteracao em routes/index.js necessaria!');
    console.log('   Todas as URLs de API permanecem identicas.');
    console.log('\n   Refatoracao concluida com sucesso!');
}

/**
 * Adjust require() paths and path.join(__dirname, ...) references
 * from routes/ level to routes/pcp/ level (one directory deeper)
 */
function adjustRequirePaths(code) {
    return code
        // require('../something') -> require('../../something')
        .replace(/require\(\s*['"]\.\.\/([^'"]+)['"]\s*\)/g, "require('../../$1')")
        // path.join(__dirname, '..', 'something') -> path.join(__dirname, '..', '..', 'something')
        .replace(/path\.join\(\s*__dirname\s*,\s*'\.\.'\s*,/g, "path.join(__dirname, '..', '..',");
}

function generateModuleFile(domain, extractedCode) {
    const depsDestructure = domain.deps.join(', ');

    // Build imports section
    const importLines = [];

    if (domain.needsUpload || domain.needsFs) {
        importLines.push("    const path = require('path');");
    }
    if (domain.needsFs) {
        importLines.push("    const fs = require('fs');");
    }
    if (domain.needsUpload) {
        importLines.push("    const multer = require('multer');");
        importLines.push("    const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads'), limits: { fileSize: 10 * 1024 * 1024 } });");
    }
    if (domain.needsLgpd) {
        importLines.push("    let lgpdCrypto = null;");
        importLines.push("    try { lgpdCrypto = require('../../lgpd-crypto'); } catch (_) {}");
    }

    const importsBlock = importLines.length > 0 ? '\n' + importLines.join('\n') + '\n' : '';

    return '/**\n' +
        ' * PCP Domain Module: ' + domain.description + '\n' +
        ' * Extraido de pcp-routes.js em ' + new Date().toLocaleDateString('pt-BR') + '\n' +
        ' * Padrao Mixin: registra rotas no router compartilhado do PCP\n' +
        ' * @module routes/pcp/' + domain.name + '\n' +
        ' */\n' +
        '\n' +
        'module.exports = function register' + toPascalCase(domain.name) + '(router, deps) {\n' +
        '    const { ' + depsDestructure + ' } = deps;\n' +
        importsBlock +
        '\n' +
        extractedCode +
        '\n};\n';
}

function toPascalCase(str) {
    return str.split('-').map(function(s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join('');
}

function modifyOriginalFile(lines, extractedRanges, domains) {
    // Sort ranges by start line DESCENDING so we splice from bottom to top
    // (avoids index shifting issues)
    const sortedRanges = extractedRanges.slice().sort(function(a, b) { return b.start - a.start; });

    const modifiedLines = lines.slice();

    // Count blocks per domain to know which is the last (=first position) one
    var domainBlockCount = {};
    sortedRanges.forEach(function(range) {
        domainBlockCount[range.domain] = (domainBlockCount[range.domain] || 0) + 1;
    });
    var remainingBlocks = {};
    Object.keys(domainBlockCount).forEach(function(k) { remainingBlocks[k] = domainBlockCount[k]; });

    sortedRanges.forEach(function(range) {
        var removeCount = range.end - range.start + 1;
        remainingBlocks[range.domain]--;

        // Insert require() at the FIRST (lowest line number) block of each domain
        if (remainingBlocks[range.domain] === 0) {
            var domain = domains.find(function(d) { return d.name === range.domain; });
            var requireComment = '    // [REFACTORED] ' + domain.description;
            var requireCall = "    require('./pcp/" + domain.name + "')(router, deps);";
            modifiedLines.splice(range.start - 1, removeCount, requireComment, requireCall, '');
        } else {
            // Higher-numbered blocks: just remove (require goes at first position)
            modifiedLines.splice(range.start - 1, removeCount);
        }
    });

    return modifiedLines.join('\n');
}

// ========================================
// RUN
// ========================================
main();
