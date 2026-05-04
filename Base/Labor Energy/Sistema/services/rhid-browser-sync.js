/**
 * RHiD Cloud Browser Sync Service (Playwright)
 * 
 * Serviço INTERNO (dev-only) para sincronizar alterações do Aluforce → RHiD Cloud
 * via automação de browser (Playwright headless).
 * 
 * A API do RHiD Cloud é read-only, então usamos automação para:
 *   - Atualizar fotos de funcionários
 *   - Editar marcações de ponto
 *   - Excluir marcações de ponto
 *   - Adicionar marcações manuais
 * 
 * Uso:
 *   const rhidSync = require('./services/rhid-browser-sync');
 *   await rhidSync.init();
 *   await rhidSync.queuePhotoUpdate(personId, photoPath);
 *   await rhidSync.queueMarcacaoEdit(personId, date, oldTime, newTime);
 * 
 * @module rhid-browser-sync
 * @internal Developer-only — não expor ao usuário final
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ==================== CONFIG ====================
const RHID_URL = 'https://www.rhid.com.br/v2';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'logs', 'rhid-sync-screenshots');
const MAX_RETRIES = 3;
const QUEUE_INTERVAL = 15000; // processar fila a cada 15s
const BROWSER_TIMEOUT = 30000;
const NAV_TIMEOUT = 20000;

// Pool MySQL (reutilizar se disponível)
let pool = null;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'railway',
            charset: 'utf8mb4',
            connectionLimit: 3,
            waitForConnections: true
        });
    }
    return pool;
}

// ==================== STATE ====================
let browser = null;
let context = null;
let page = null;
let isLoggedIn = false;
let isProcessing = false;
let queueInterval = null;

// Fila de sincronização em memória (persistida no banco quando disponível)
const syncQueue = [];

// Estatísticas
const stats = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    lastSync: null,
    lastError: null,
    startedAt: null
};

// ==================== LOGGING ====================
function log(level, msg, data) {
    const prefix = '[RHiD-BrowserSync]';
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${prefix} [${level.toUpperCase()}] ${msg}`;
    
    if (level === 'error') {
        console.error(logLine, data || '');
    } else if (level === 'warn') {
        console.warn(logLine, data || '');
    } else {
        console.log(logLine, data || '');
    }

    // Salvar log em arquivo
    try {
        const logDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, 'rhid-browser-sync.log');
        fs.appendFileSync(logFile, logLine + (data ? ' ' + JSON.stringify(data) : '') + '\n');
    } catch (e) { /* ok */ }
}

// ==================== SCREENSHOT HELPER ====================
async function takeScreenshot(stepName) {
    if (!page) return null;
    try {
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
        const filename = `${Date.now()}_${stepName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        log('info', `Screenshot salvo: ${filename}`);
        return filepath;
    } catch (e) {
        log('warn', 'Falha ao salvar screenshot: ' + e.message);
        return null;
    }
}

// ==================== BROWSER LIFECYCLE ====================

/**
 * Inicializar o browser Playwright (headless)
 */
async function init() {
    if (browser) {
        log('info', 'Browser já inicializado');
        return true;
    }

    try {
        // Tentar importar playwright
        let chromium;
        try {
            const pw = require('playwright');
            chromium = pw.chromium;
        } catch (e) {
            try {
                const pw = require('playwright-core');
                chromium = pw.chromium;
            } catch (e2) {
                log('error', 'Playwright não encontrado. Instale com: npm install playwright');
                return false;
            }
        }

        log('info', 'Iniciando browser headless...');
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ],
            timeout: BROWSER_TIMEOUT
        });

        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo'
        });

        page = await context.newPage();
        page.setDefaultTimeout(NAV_TIMEOUT);

        stats.startedAt = new Date().toISOString();
        log('info', 'Browser iniciado com sucesso');
        return true;
    } catch (error) {
        log('error', 'Falha ao iniciar browser: ' + error.message);
        browser = null;
        context = null;
        page = null;
        return false;
    }
}

/**
 * Encerrar browser
 */
async function shutdown() {
    try {
        if (queueInterval) {
            clearInterval(queueInterval);
            queueInterval = null;
        }
        if (browser) {
            await browser.close();
            browser = null;
            context = null;
            page = null;
            isLoggedIn = false;
            log('info', 'Browser encerrado');
        }
    } catch (e) {
        log('warn', 'Erro ao encerrar browser: ' + e.message);
    }
}

// ==================== RHID LOGIN ====================

/**
 * Obter credenciais do RHiD do banco de dados
 */
async function getRhidCredentials() {
    try {
        const db = getPool();
        const [rows] = await db.query(
            'SELECT rhid_email, rhid_password FROM controlid_config WHERE ativo = TRUE AND rhid_enabled = TRUE ORDER BY id DESC LIMIT 1'
        );
        if (rows.length === 0) {
            throw new Error('RHiD Cloud não configurado no banco');
        }
        return {
            email: rows[0].rhid_email,
            password: Buffer.from(rows[0].rhid_password, 'base64').toString()
        };
    } catch (e) {
        log('error', 'Falha ao obter credenciais: ' + e.message);
        throw e;
    }
}

/**
 * Login no RHiD Cloud via browser
 */
async function login(forceLogin) {
    if (isLoggedIn && !forceLogin) {
        // Verificar se sessão ainda é válida
        try {
            const url = page.url();
            if (url.includes('rhid.com.br') && !url.includes('login') && !url.endsWith('/v2') && !url.endsWith('/v2/')) {
                log('info', 'Sessão RHiD ainda ativa');
                return true;
            }
        } catch (e) { /* precisa relogar */ }
    }

    const creds = await getRhidCredentials();

    log('info', 'Fazendo login no RHiD Cloud...');

    try {
        // Navegar para a página de login
        await page.goto(RHID_URL, { waitUntil: 'networkidle', timeout: BROWSER_TIMEOUT });
        await page.waitForTimeout(2000); // Esperar SPA carregar

        await takeScreenshot('01_login_page');

        // Procurar campo de email - tentar múltiplos seletores
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="mail"]',
            'input[placeholder*="Email"]',
            'input[placeholder*="e-mail"]',
            'input[ng-model*="email"]',
            'input[formcontrolname="email"]',
            'input[id*="email"]',
            '#email',
            'input[type="text"]:first-of-type'
        ];

        let emailInput = null;
        for (const sel of emailSelectors) {
            try {
                emailInput = await page.$(sel);
                if (emailInput) {
                    log('info', `Campo email encontrado com seletor: ${sel}`);
                    break;
                }
            } catch (e) { /* try next */ }
        }

        if (!emailInput) {
            // Fallback: pegar todos os inputs visíveis
            const inputs = await page.$$('input:visible');
            if (inputs.length >= 2) {
                emailInput = inputs[0];
                log('info', 'Campo email encontrado via fallback (1º input visível)');
            } else {
                await takeScreenshot('01_login_no_email_field');
                throw new Error('Campo de email não encontrado na página de login');
            }
        }

        // Preencher email
        await emailInput.click({ clickCount: 3 }); // selecionar tudo
        await emailInput.fill(creds.email);
        await page.waitForTimeout(500);

        // Procurar campo de senha
        const passwordSelectors = [
            'input[type="password"]',
            'input[name="password"]',
            'input[name="senha"]',
            'input[placeholder*="enha"]',
            'input[placeholder*="assword"]',
            'input[ng-model*="password"]',
            'input[formcontrolname="password"]',
            '#password',
            '#senha'
        ];

        let passwordInput = null;
        for (const sel of passwordSelectors) {
            try {
                passwordInput = await page.$(sel);
                if (passwordInput) {
                    log('info', `Campo senha encontrado com seletor: ${sel}`);
                    break;
                }
            } catch (e) { /* try next */ }
        }

        if (!passwordInput) {
            await takeScreenshot('01_login_no_password_field');
            throw new Error('Campo de senha não encontrado na página de login');
        }

        // Preencher senha
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.fill(creds.password);
        await page.waitForTimeout(500);

        await takeScreenshot('02_login_filled');

        // Procurar botão de login
        const loginButtonSelectors = [
            'button[type="submit"]',
            'button:has-text("Entrar")',
            'button:has-text("Login")',
            'button:has-text("Acessar")',
            'input[type="submit"]',
            'a:has-text("Entrar")',
            '.btn-login',
            '.login-btn',
            'button.btn-primary',
            'form button'
        ];

        let loginBtn = null;
        for (const sel of loginButtonSelectors) {
            try {
                loginBtn = await page.$(sel);
                if (loginBtn) {
                    log('info', `Botão login encontrado com seletor: ${sel}`);
                    break;
                }
            } catch (e) { /* try next */ }
        }

        if (!loginBtn) {
            await takeScreenshot('02_login_no_button');
            throw new Error('Botão de login não encontrado');
        }

        // Clicar no botão de login e esperar navegação
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: BROWSER_TIMEOUT }).catch(() => {}),
            loginBtn.click()
        ]);

        await page.waitForTimeout(3000); // Esperar SPA carregar completamente

        await takeScreenshot('03_after_login');

        // Verificar se login foi bem-sucedido
        const currentUrl = page.url();
        const pageContent = await page.content();

        if (currentUrl.includes('login') || pageContent.includes('incorret') || pageContent.includes('inválid')) {
            isLoggedIn = false;
            throw new Error('Login falhou - credenciais podem estar incorretas');
        }

        isLoggedIn = true;
        log('info', 'Login RHiD realizado com sucesso! URL: ' + currentUrl);
        return true;

    } catch (error) {
        isLoggedIn = false;
        log('error', 'Falha no login RHiD: ' + error.message);
        await takeScreenshot('login_error');
        throw error;
    }
}

// ==================== NAVIGATION HELPERS ====================

/**
 * Navegar para uma seção do menu do RHiD
 * Tenta encontrar menus/links por texto
 */
async function navigateTo(menuTexts) {
    if (!Array.isArray(menuTexts)) menuTexts = [menuTexts];

    for (const menuText of menuTexts) {
        try {
            // Tentar clicar em links/botões do menu que contenham o texto
            // RHiD usa classes m-menu__item, m-menu__link, m-menu__toggle (Angular/Metronic)
            const selectors = [
                `a:has-text("${menuText}")`,
                `.m-menu__item:has-text("${menuText}") > a`,
                `.m-menu__item:has-text("${menuText}")`,
                `li:has-text("${menuText}") > a.m-menu__link`,
                `button:has-text("${menuText}")`,
                `span:has-text("${menuText}")`,
                `li:has-text("${menuText}") a`,
                `[class*="menu"] :has-text("${menuText}")`,
                `[class*="nav"] :has-text("${menuText}")`,
                `[class*="sidebar"] :has-text("${menuText}")`
            ];

            for (const sel of selectors) {
                try {
                    const el = await page.$(sel);
                    if (el) {
                        const isVisible = await el.isVisible();
                        if (isVisible) {
                            await el.click();
                            await page.waitForTimeout(2000);
                            log('info', `Navegou para: ${menuText} (seletor: ${sel})`);
                            return true;
                        }
                    }
                } catch (e) { /* try next */ }
            }
        } catch (e) {
            log('warn', `Falha ao navegar para "${menuText}": ${e.message}`);
        }
    }

    log('warn', `Nenhum menu encontrado para: ${menuTexts.join(', ')}`);
    return false;
}

/**
 * Esperar um elemento aparecer na página
 */
async function waitForElement(selectors, timeout) {
    timeout = timeout || NAV_TIMEOUT;
    if (!Array.isArray(selectors)) selectors = [selectors];

    for (const sel of selectors) {
        try {
            await page.waitForSelector(sel, { timeout: timeout, state: 'visible' });
            return await page.$(sel);
        } catch (e) { /* try next */ }
    }
    return null;
}

// ==================== AÇÕES NO RHID ====================

/**
 * Navegar até a tela de gestão de pessoas/funcionários
 */
async function navigateToEmployees() {
    await login();

    log('info', 'Navegando para gestão de funcionários...');

    // Menus possíveis no RHiD para chegar em Pessoas/Funcionários
    // Descoberto via discovery: Cadastros → Funcionários
    const menuPaths = [
        ['Cadastros', 'Funcionários'],
        ['Cadastros', 'Pessoas'],
        ['Funcionários'],
        ['Pessoas'],
        ['Colaboradores'],
        ['People'],
        ['Employees']
    ];

    for (const menuPath of menuPaths) {
        let success = true;
        for (const item of menuPath) {
            const result = await navigateTo(item);
            if (!result) {
                success = false;
                break;
            }
        }
        if (success) {
            await page.waitForTimeout(2000);
            await takeScreenshot('nav_employees');
            return true;
        }
    }

    // Fallback: tentar navegar diretamente pela URL (RHiD usa Angular com hash routing)
    const possibleUrls = [
        RHID_URL + '/#/person',
        RHID_URL + '/#/persons',
        RHID_URL + '/#/people',
        RHID_URL + '/#/employees',
        RHID_URL + '/#/funcionarios',
        RHID_URL + '/#/cadastros/pessoas',
        RHID_URL + '/#/cadastros/funcionarios'
    ];

    for (const url of possibleUrls) {
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);
            const content = await page.content();
            // Se a página parece ter conteúdo de funcionários
            if (content.includes('person') || content.includes('pessoa') || content.includes('funcionário') || content.includes('nome')) {
                log('info', 'Navegou para funcionários via URL: ' + url);
                await takeScreenshot('nav_employees_url');
                return true;
            }
        } catch (e) { /* try next */ }
    }

    await takeScreenshot('nav_employees_failed');
    log('error', 'Não foi possível navegar para gestão de funcionários');
    return false;
}

/**
 * Navegar até a tela de marcações de ponto
 */
async function navigateToMarcacoes() {
    await login();

    log('info', 'Navegando para marcações de ponto...');

    const menuPaths = [
        ['Apuração e Cálculo', 'Ponto Diário'],
        ['Apuração e Cálculo', 'Apuração de Ponto'],
        ['Ponto', 'Marcações'],
        ['Ponto', 'Manutenção'],
        ['Marcações'],
        ['Manutenção de Ponto'],
        ['Apuração'],
        ['Time Clock', 'Entries']
    ];

    for (const menuPath of menuPaths) {
        let success = true;
        for (const item of menuPath) {
            const result = await navigateTo(item);
            if (!result) {
                success = false;
                break;
            }
        }
        if (success) {
            await page.waitForTimeout(2000);
            await takeScreenshot('nav_marcacoes');
            return true;
        }
    }

    // Fallback via URL (RHiD usa Angular com hash routing)
    const possibleUrls = [
        RHID_URL + '/#/ponto_diario',
        RHID_URL + '/#/apuracao_ponto',
        RHID_URL + '/#/timeclock',
        RHID_URL + '/#/marcacoes',
        RHID_URL + '/#/ponto',
        RHID_URL + '/#/maintenance',
        RHID_URL + '/#/apuracao'
    ];

    for (const url of possibleUrls) {
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);
            const content = await page.content();
            if (content.includes('marcaç') || content.includes('ponto') || content.includes('hora') || content.includes('clock')) {
                log('info', 'Navegou para marcações via URL: ' + url);
                await takeScreenshot('nav_marcacoes_url');
                return true;
            }
        } catch (e) { /* try next */ }
    }

    await takeScreenshot('nav_marcacoes_failed');
    log('error', 'Não foi possível navegar para marcações');
    return false;
}

/**
 * Buscar um funcionário pelo nome ou PIS na tela de funcionários
 */
async function searchEmployee(nameOrPis) {
    log('info', `Buscando funcionário: ${nameOrPis}`);

    // Procurar campo de busca
    const searchSelectors = [
        'input[type="search"]',
        'input[placeholder*="uscar"]',
        'input[placeholder*="earch"]',
        'input[placeholder*="filtro"]',
        'input[placeholder*="nome"]',
        'input[class*="search"]',
        'input[class*="filter"]',
        '.search-box input',
        '.filter input',
        '[role="search"] input'
    ];

    let searchInput = null;
    for (const sel of searchSelectors) {
        try {
            searchInput = await page.$(sel);
            if (searchInput && await searchInput.isVisible()) break;
            searchInput = null;
        } catch (e) { /* try next */ }
    }

    if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.fill(nameOrPis);
        await page.waitForTimeout(2000); // esperar filtro
        await takeScreenshot('search_employee_' + nameOrPis.replace(/\s/g, '_'));
        return true;
    }

    log('warn', 'Campo de busca não encontrado');
    return false;
}

/**
 * Clicar em um funcionário da lista
 */
async function clickEmployee(nameOrPis) {
    try {
        // Tentar encontrar o funcionário na lista
        const rows = await page.$$('tr, .list-item, .card, [class*="person"], [class*="employee"]');
        for (const row of rows) {
            const text = await row.textContent();
            if (text && (text.includes(nameOrPis) || text.toUpperCase().includes(nameOrPis.toUpperCase()))) {
                await row.click();
                await page.waitForTimeout(2000);
                await takeScreenshot('clicked_employee');
                return true;
            }
        }

        // Fallback: tentar link direto
        const link = await page.$(`a:has-text("${nameOrPis}")`);
        if (link) {
            await link.click();
            await page.waitForTimeout(2000);
            return true;
        }
    } catch (e) {
        log('warn', 'Falha ao clicar no funcionário: ' + e.message);
    }
    return false;
}

// ==================== SYNC OPERATIONS ====================

/**
 * Atualizar foto de um funcionário no RHiD
 * @param {string} employeeName - Nome do funcionário no RHiD
 * @param {string} employeePis - PIS do funcionário
 * @param {string} localPhotoPath - Caminho absoluto da foto local
 */
async function updateEmployeePhoto(employeeName, employeePis, localPhotoPath) {
    log('info', `Atualizando foto para: ${employeeName} (PIS: ${employeePis})`);

    // Verificar se a foto existe
    if (!fs.existsSync(localPhotoPath)) {
        throw new Error('Arquivo de foto não encontrado: ' + localPhotoPath);
    }

    try {
        // 1. Navegar para funcionários
        const navOk = await navigateToEmployees();
        if (!navOk) throw new Error('Não foi possível navegar para gestão de funcionários');

        // 2. Buscar funcionário
        await searchEmployee(employeeName || employeePis);

        // 3. Clicar no funcionário
        const clickOk = await clickEmployee(employeeName || employeePis);
        if (!clickOk) throw new Error('Funcionário não encontrado na lista: ' + (employeeName || employeePis));

        await takeScreenshot('04_employee_detail');

        // 4. Procurar área de foto/avatar
        const photoSelectors = [
            'input[type="file"]',
            'input[accept*="image"]',
            '.avatar',
            '.photo',
            '.foto',
            '[class*="photo"]',
            '[class*="avatar"]',
            '[class*="imagem"]',
            'img[class*="profile"]',
            'img[class*="avatar"]'
        ];

        // Primeiro tentar input file direto
        let fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            await fileInput.setInputFiles(localPhotoPath);
            log('info', 'Foto enviada via input file');
        } else {
            // Clicar na área de foto para abrir upload dialog
            for (const sel of photoSelectors) {
                try {
                    const el = await page.$(sel);
                    if (el && await el.isVisible()) {
                        await el.click();
                        await page.waitForTimeout(1500);

                        // Agora procurar o input file que pode ter aparecido
                        fileInput = await page.$('input[type="file"]');
                        if (fileInput) {
                            await fileInput.setInputFiles(localPhotoPath);
                            log('info', `Foto enviada após clicar em: ${sel}`);
                            break;
                        }
                    }
                } catch (e) { /* try next */ }
            }
        }

        if (!fileInput) {
            await takeScreenshot('05_photo_upload_not_found');
            throw new Error('Não foi possível encontrar campo de upload de foto');
        }

        await page.waitForTimeout(2000);
        await takeScreenshot('05_photo_uploaded');

        // 5. Salvar alterações
        const saveSelectors = [
            'button:has-text("Salvar")',
            'button:has-text("Save")',
            'button:has-text("Confirmar")',
            'button:has-text("OK")',
            'button[type="submit"]',
            '.btn-save',
            '.btn-primary'
        ];

        for (const sel of saveSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    await page.waitForTimeout(2000);
                    log('info', 'Salvar clicado: ' + sel);
                    break;
                }
            } catch (e) { /* try next */ }
        }

        await takeScreenshot('06_photo_saved');
        log('info', `Foto atualizada com sucesso para: ${employeeName}`);
        return { success: true, message: 'Foto atualizada no RHiD' };

    } catch (error) {
        log('error', `Falha ao atualizar foto: ${error.message}`);
        await takeScreenshot('photo_error');
        return { success: false, message: error.message };
    }
}

/**
 * Editar uma marcação de ponto no RHiD
 * @param {string} employeeName - Nome do funcionário
 * @param {string} employeePis - PIS do funcionário
 * @param {string} date - Data da marcação (YYYY-MM-DD)
 * @param {string} oldTime - Hora original (HH:MM)
 * @param {string} newTime - Nova hora (HH:MM)
 */
async function updateMarcacao(employeeName, employeePis, date, oldTime, newTime) {
    log('info', `Editando marcação: ${employeeName} ${date} ${oldTime} → ${newTime}`);

    try {
        // 1. Navegar para marcações
        const navOk = await navigateToMarcacoes();
        if (!navOk) throw new Error('Não foi possível navegar para marcações');

        // 2. Filtrar por funcionário e data
        await searchEmployee(employeeName || employeePis);
        await page.waitForTimeout(1500);

        // Procurar campo de data
        const dateInputs = await page.$$('input[type="date"], input[placeholder*="data"], input[placeholder*="Data"]');
        if (dateInputs.length > 0) {
            const formattedDate = date; // YYYY-MM-DD format
            await dateInputs[0].fill(formattedDate);
            await page.waitForTimeout(1000);
        }

        await takeScreenshot('marcacao_search');

        // 3. Encontrar a marcação com a hora original
        const rows = await page.$$('tr, .row, .list-item, [class*="marcacao"], [class*="entry"]');
        let targetRow = null;

        for (const row of rows) {
            const text = await row.textContent();
            if (text && text.includes(oldTime)) {
                targetRow = row;
                break;
            }
        }

        if (!targetRow) {
            await takeScreenshot('marcacao_not_found');
            throw new Error(`Marcação ${oldTime} não encontrada na data ${date}`);
        }

        // 4. Clicar para editar
        // Tentar botão de editar dentro da row
        const editBtn = await targetRow.$('button:has-text("Editar"), button:has-text("Edit"), .btn-edit, [class*="edit"], i[class*="edit"], i[class*="pencil"]');
        if (editBtn) {
            await editBtn.click();
        } else {
            // Double-click na row para editar
            await targetRow.dblclick();
        }
        await page.waitForTimeout(2000);

        await takeScreenshot('marcacao_edit_form');

        // 5. Alterar a hora
        const timeInputs = await page.$$('input[type="time"], input[placeholder*="hora"], input[placeholder*="Hora"], input[type="text"]');
        for (const input of timeInputs) {
            const val = await input.inputValue().catch(() => '');
            if (val.includes(oldTime) || val === oldTime) {
                await input.click({ clickCount: 3 });
                await input.fill(newTime);
                log('info', `Hora alterada de ${oldTime} para ${newTime}`);
                break;
            }
        }

        await page.waitForTimeout(1000);

        // 6. Salvar
        const saveSelectors = [
            'button:has-text("Salvar")',
            'button:has-text("Save")',
            'button:has-text("Confirmar")',
            'button:has-text("OK")',
            'button[type="submit"]'
        ];

        for (const sel of saveSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    await page.waitForTimeout(2000);
                    log('info', 'Marcação salva');
                    break;
                }
            } catch (e) { /* try next */ }
        }

        await takeScreenshot('marcacao_saved');
        log('info', `Marcação editada com sucesso: ${date} ${oldTime} → ${newTime}`);
        return { success: true, message: `Marcação atualizada: ${oldTime} → ${newTime}` };

    } catch (error) {
        log('error', `Falha ao editar marcação: ${error.message}`);
        await takeScreenshot('marcacao_error');
        return { success: false, message: error.message };
    }
}

/**
 * Excluir uma marcação de ponto no RHiD
 */
async function deleteMarcacao(employeeName, employeePis, date, time) {
    log('info', `Excluindo marcação: ${employeeName} ${date} ${time}`);

    try {
        const navOk = await navigateToMarcacoes();
        if (!navOk) throw new Error('Não foi possível navegar para marcações');

        await searchEmployee(employeeName || employeePis);
        await page.waitForTimeout(1500);

        // Encontrar a marcação
        const rows = await page.$$('tr, .row, .list-item');
        let targetRow = null;

        for (const row of rows) {
            const text = await row.textContent();
            if (text && text.includes(time) && text.includes(date.split('-').reverse().join('/'))) {
                targetRow = row;
                break;
            }
        }

        if (!targetRow) {
            throw new Error(`Marcação ${time} não encontrada na data ${date}`);
        }

        // Clicar no botão de excluir
        const deleteBtn = await targetRow.$('button:has-text("Excluir"), button:has-text("Delete"), .btn-delete, [class*="delete"], i[class*="trash"], i[class*="delete"]');
        if (deleteBtn) {
            await deleteBtn.click();
            await page.waitForTimeout(1000);

            // Confirmar exclusão (modal)
            const confirmSelectors = [
                'button:has-text("Confirmar")',
                'button:has-text("Sim")',
                'button:has-text("Yes")',
                'button:has-text("OK")',
                '.modal button.btn-danger',
                '.modal button.btn-primary'
            ];

            for (const sel of confirmSelectors) {
                try {
                    const btn = await page.$(sel);
                    if (btn && await btn.isVisible()) {
                        await btn.click();
                        await page.waitForTimeout(2000);
                        break;
                    }
                } catch (e) { /* try next */ }
            }
        }

        await takeScreenshot('marcacao_deleted');
        log('info', `Marcação excluída: ${date} ${time}`);
        return { success: true, message: 'Marcação excluída no RHiD' };

    } catch (error) {
        log('error', `Falha ao excluir marcação: ${error.message}`);
        await takeScreenshot('delete_error');
        return { success: false, message: error.message };
    }
}

// ==================== QUEUE SYSTEM ====================

/**
 * Adicionar tarefa à fila de sincronização
 */
function queueTask(type, data) {
    const task = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        type: type,  // 'photo_update', 'marcacao_edit', 'marcacao_delete', 'marcacao_add'
        data: data,
        status: 'pending', // 'pending', 'processing', 'done', 'failed'
        retries: 0,
        createdAt: new Date().toISOString(),
        processedAt: null,
        error: null
    };

    syncQueue.push(task);
    log('info', `Tarefa adicionada à fila: ${type} (${task.id})`);

    // Persistir no banco (async, não bloqueia)
    persistTaskToDb(task).catch(e => log('warn', 'Falha ao persistir tarefa: ' + e.message));

    return task.id;
}

/**
 * Persistir tarefa no banco
 */
async function persistTaskToDb(task) {
    try {
        const db = getPool();
        await db.query(
            `INSERT INTO rhid_sync_queue (task_id, task_type, task_data, status, retries, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE status = VALUES(status), retries = VALUES(retries)`,
            [task.id, task.type, JSON.stringify(task.data), task.status, task.retries]
        );
    } catch (e) {
        // Tabela pode não existir ainda - ok
        if (e.code === 'ER_NO_SUCH_TABLE') {
            await createSyncTable();
            // Retry
            await persistTaskToDb(task);
        }
    }
}

/**
 * Criar tabela de fila de sync (se não existir)
 */
async function createSyncTable() {
    try {
        const db = getPool();
        await db.query(`
            CREATE TABLE IF NOT EXISTS rhid_sync_queue (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id VARCHAR(50) UNIQUE NOT NULL,
                task_type ENUM('photo_update', 'marcacao_edit', 'marcacao_delete', 'marcacao_add') NOT NULL,
                task_data JSON,
                status ENUM('pending', 'processing', 'done', 'failed') DEFAULT 'pending',
                retries INT DEFAULT 0,
                error TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME NULL,
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        log('info', 'Tabela rhid_sync_queue criada');
    } catch (e) {
        log('warn', 'Falha ao criar tabela: ' + e.message);
    }
}

/**
 * Processar próxima tarefa da fila
 */
async function processNextTask() {
    if (isProcessing) return;
    
    const task = syncQueue.find(t => t.status === 'pending');
    if (!task) return;

    isProcessing = true;
    task.status = 'processing';

    try {
        log('info', `Processando tarefa: ${task.type} (${task.id})`);

        // Garantir que o browser está inicializado
        if (!browser) {
            const ok = await init();
            if (!ok) throw new Error('Browser não disponível');
        }

        let result;

        switch (task.type) {
            case 'photo_update':
                result = await updateEmployeePhoto(
                    task.data.employeeName,
                    task.data.employeePis,
                    task.data.photoPath
                );
                break;

            case 'marcacao_edit':
                result = await updateMarcacao(
                    task.data.employeeName,
                    task.data.employeePis,
                    task.data.date,
                    task.data.oldTime,
                    task.data.newTime
                );
                break;

            case 'marcacao_delete':
                result = await deleteMarcacao(
                    task.data.employeeName,
                    task.data.employeePis,
                    task.data.date,
                    task.data.time
                );
                break;

            default:
                result = { success: false, message: 'Tipo de tarefa desconhecido: ' + task.type };
        }

        if (result.success) {
            task.status = 'done';
            task.processedAt = new Date().toISOString();
            stats.totalSuccess++;
            log('info', `Tarefa concluída: ${task.id}`);
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        task.retries++;
        if (task.retries >= MAX_RETRIES) {
            task.status = 'failed';
            task.error = error.message;
            stats.totalFailed++;
            log('error', `Tarefa falhou definitivamente: ${task.id} - ${error.message}`);
        } else {
            task.status = 'pending'; // tentar novamente
            log('warn', `Tarefa será retentada (${task.retries}/${MAX_RETRIES}): ${task.id}`);
        }
    } finally {
        isProcessing = false;
        stats.totalProcessed++;
        stats.lastSync = new Date().toISOString();

        // Atualizar no banco
        persistTaskToDb(task).catch(() => {});

        // Remover tarefas concluídas antigas (manter últimas 100)
        const doneOrFailed = syncQueue.filter(t => t.status === 'done' || t.status === 'failed');
        if (doneOrFailed.length > 100) {
            const toRemove = doneOrFailed.slice(0, doneOrFailed.length - 100);
            for (const t of toRemove) {
                const idx = syncQueue.indexOf(t);
                if (idx >= 0) syncQueue.splice(idx, 1);
            }
        }
    }
}

/**
 * Iniciar processamento automático da fila
 */
function startQueueProcessor() {
    if (queueInterval) return;

    queueInterval = setInterval(async () => {
        try {
            await processNextTask();
        } catch (e) {
            log('error', 'Erro no processador de fila: ' + e.message);
        }
    }, QUEUE_INTERVAL);

    log('info', `Processador de fila iniciado (intervalo: ${QUEUE_INTERVAL}ms)`);
}

/**
 * Parar processamento da fila
 */
function stopQueueProcessor() {
    if (queueInterval) {
        clearInterval(queueInterval);
        queueInterval = null;
        log('info', 'Processador de fila parado');
    }
}

// ==================== PUBLIC API ====================

/**
 * Enfileirar atualização de foto
 */
function queuePhotoUpdate(employeeName, employeePis, photoPath) {
    return queueTask('photo_update', { employeeName, employeePis, photoPath });
}

/**
 * Enfileirar edição de marcação
 */
function queueMarcacaoEdit(employeeName, employeePis, date, oldTime, newTime) {
    return queueTask('marcacao_edit', { employeeName, employeePis, date, oldTime, newTime });
}

/**
 * Enfileirar exclusão de marcação
 */
function queueMarcacaoDelete(employeeName, employeePis, date, time) {
    return queueTask('marcacao_delete', { employeeName, employeePis, date, time });
}

/**
 * Obter status geral do serviço
 */
function getStatus() {
    return {
        browserActive: !!browser,
        isLoggedIn: isLoggedIn,
        isProcessing: isProcessing,
        queueLength: syncQueue.filter(t => t.status === 'pending').length,
        queueTotal: syncQueue.length,
        stats: { ...stats },
        recentTasks: syncQueue.slice(-20).reverse()
    };
}

/**
 * Obter fila de tarefas
 */
function getQueue() {
    return syncQueue.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        retries: t.retries,
        createdAt: t.createdAt,
        processedAt: t.processedAt,
        error: t.error,
        data: { 
            employeeName: t.data.employeeName,
            date: t.data.date
        }
    }));
}

/**
 * Listar screenshots disponíveis
 */
function getScreenshots() {
    try {
        if (!fs.existsSync(SCREENSHOTS_DIR)) return [];
        return fs.readdirSync(SCREENSHOTS_DIR)
            .filter(f => f.endsWith('.png'))
            .sort()
            .reverse()
            .slice(0, 50)
            .map(f => ({
                filename: f,
                path: path.join(SCREENSHOTS_DIR, f),
                url: '/api/dev/rhid-sync/screenshots/' + f,
                size: fs.statSync(path.join(SCREENSHOTS_DIR, f)).size,
                created: fs.statSync(path.join(SCREENSHOTS_DIR, f)).mtime.toISOString()
            }));
    } catch (e) {
        return [];
    }
}

/**
 * Discovery mode: navegar e tirar screenshot de cada tela
 * Útil para mapear a interface do RHiD pela primeira vez
 */
async function discoveryMode() {
    log('info', '=== DISCOVERY MODE ===');
    const results = [];

    try {
        // 1. Init + Login
        await init();
        await login(true);
        results.push({ step: 'login', success: true, screenshot: await takeScreenshot('discovery_01_after_login') });

        // 2. Capturar todos os links/menus visíveis
        const links = await page.$$eval('a, button, [role="menuitem"], [class*="menu"] *, nav *', elements => {
            return elements
                .filter(el => el.textContent.trim().length > 0 && el.textContent.trim().length < 50)
                .map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim(),
                    href: el.href || null,
                    class: el.className || null
                }))
                .filter((v, i, a) => a.findIndex(t => t.text === v.text) === i) // unique
                .slice(0, 100);
        });
        results.push({ step: 'menu_scan', links: links });

        // 3. Tentar navegar para áreas principais
        const areas = ['Cadastros', 'Pessoas', 'Ponto', 'Marcações', 'Relatórios', 'Configurações', 'Dashboard'];
        for (let i = 0; i < areas.length; i++) {
            try {
                const found = await navigateTo(areas[i]);
                if (found) {
                    const screenshot = await takeScreenshot(`discovery_${String(i + 2).padStart(2, '0')}_${areas[i]}`);
                    results.push({ step: areas[i], success: true, url: page.url(), screenshot: screenshot });
                } else {
                    results.push({ step: areas[i], success: false });
                }
            } catch (e) {
                results.push({ step: areas[i], success: false, error: e.message });
            }
        }

        // 4. Capturar URL final e conteúdo do menu
        const finalUrl = page.url();
        const pageTitle = await page.title();
        results.push({ step: 'final', url: finalUrl, title: pageTitle });

        log('info', '=== DISCOVERY MODE COMPLETO ===');

    } catch (error) {
        log('error', 'Erro no discovery mode: ' + error.message);
        results.push({ step: 'error', message: error.message, screenshot: await takeScreenshot('discovery_error') });
    }

    return results;
}

// ==================== EXPORTS ====================
module.exports = {
    // Lifecycle
    init,
    shutdown,
    login,

    // Direct operations
    updateEmployeePhoto,
    updateMarcacao,
    deleteMarcacao,

    // Queue operations
    queuePhotoUpdate,
    queueMarcacaoEdit,
    queueMarcacaoDelete,
    startQueueProcessor,
    stopQueueProcessor,

    // Status & Debug
    getStatus,
    getQueue,
    getScreenshots,
    discoveryMode,

    // Internal
    navigateToEmployees,
    navigateToMarcacoes,
    createSyncTable
};
