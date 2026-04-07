/**
 * Auto-Import Ponto (Control iD / RHiD)
 * Importação automática de marcações de ponto a cada intervalo configurável
 * Mantém compatibilidade com importação manual existente
 */
const http = require('http');
const https = require('https');

let autoImportTimer = null;
let isRunning = false;

/**
 * Inicializa o auto-import de ponto
 * @param {Object} deps - { pool }
 * @param {number} intervalMs - Intervalo em ms (default: 30 min)
 */
function initAutoImportPonto(deps, intervalMs = 30 * 60 * 1000) {
    const { pool } = deps;
    if (!pool) {
        console.error('[AUTO-PONTO] ❌ Pool de banco não disponível');
        return;
    }

    console.log(`[AUTO-PONTO] ✅ Auto-importação iniciada (intervalo: ${intervalMs / 60000} min)`);

    // Executar primeira vez após 2 minutos (dar tempo do server iniciar)
    setTimeout(() => runAutoImport(pool), 2 * 60 * 1000);

    // Depois rodar no intervalo configurado
    autoImportTimer = setInterval(() => runAutoImport(pool), intervalMs);
}

/**
 * Executa a importação automática
 */
async function runAutoImport(pool) {
    if (isRunning) {
        console.log('[AUTO-PONTO] ⏳ Importação anterior ainda em execução, pulando...');
        return;
    }
    isRunning = true;

    try {
        console.log(`[AUTO-PONTO] 🔄 Iniciando importação automática - ${new Date().toLocaleString('pt-BR')}`);

        // 1. Buscar dispositivos configurados
        const devices = await getConfiguredDevices(pool);
        if (devices.length === 0) {
            console.log('[AUTO-PONTO] ℹ️ Nenhum dispositivo Control iD configurado');
            isRunning = false;
            return;
        }

        let totalImported = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const device of devices) {
            try {
                const result = await syncDeviceMarks(pool, device);
                totalImported += result.imported;
                totalSkipped += result.skipped;
                console.log(`[AUTO-PONTO] ✅ ${device.nome || device.ip}: ${result.imported} novas, ${result.skipped} já existentes`);
            } catch (devErr) {
                totalErrors++;
                console.error(`[AUTO-PONTO] ❌ Erro no dispositivo ${device.ip}:`, devErr.message);
            }
        }

        // Registrar log da importação
        try {
            await pool.query(
                `INSERT INTO ponto_import_log (tipo, total_importadas, total_ignoradas, total_erros, created_at)
                 VALUES ('auto', ?, ?, ?, NOW())`,
                [totalImported, totalSkipped, totalErrors]
            );
        } catch (logErr) {
            // Log table might not exist yet, create it
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS ponto_import_log (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        tipo ENUM('auto', 'manual') DEFAULT 'auto',
                        dispositivo_ip VARCHAR(45),
                        total_importadas INT DEFAULT 0,
                        total_ignoradas INT DEFAULT 0,
                        total_erros INT DEFAULT 0,
                        detalhes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                await pool.query(
                    `INSERT INTO ponto_import_log (tipo, total_importadas, total_ignoradas, total_erros, created_at)
                     VALUES ('auto', ?, ?, ?, NOW())`,
                    [totalImported, totalSkipped, totalErrors]
                );
            } catch (e) { /* silent */ }
        }

        console.log(`[AUTO-PONTO] ✅ Importação concluída: ${totalImported} novas | ${totalSkipped} duplicadas | ${totalErrors} erros`);

    } catch (error) {
        console.error('[AUTO-PONTO] ❌ Erro na importação automática:', error.message);
    } finally {
        isRunning = false;
    }
}

/**
 * Busca dispositivos Control iD configurados no banco
 */
async function getConfiguredDevices(pool) {
    try {
        // Check in rh_configuracoes for device settings
        const [rows] = await pool.query(
            "SELECT chave, valor FROM rh_configuracoes WHERE categoria = 'rhid_device'"
        );

        if (rows.length === 0) {
            // Try legacy rhid_config table
            try {
                const [legacy] = await pool.query('SELECT * FROM rhid_config WHERE ativo = 1');
                return legacy.map(d => ({
                    ip: d.ip || d.host,
                    port: d.porta || d.port || 443,
                    login: d.login || d.usuario || 'admin',
                    password: d.senha || d.password || '',
                    nome: d.nome || d.descricao || d.ip
                }));
            } catch (e) {
                return [];
            }
        }

        // Parse from key-value config
        const config = {};
        rows.forEach(r => { config[r.chave] = r.valor; });

        if (!config.ip) return [];

        return [{
            ip: config.ip,
            port: parseInt(config.porta) || 443,
            login: config.login || 'admin',
            password: config.senha || '',
            nome: config.nome || config.ip
        }];
    } catch (error) {
        console.error('[AUTO-PONTO] Erro ao buscar dispositivos:', error.message);
        return [];
    }
}

/**
 * Sincroniza marcações de um dispositivo Control iD
 */
async function syncDeviceMarks(pool, device) {
    // Get last sync timestamp for this device
    let lastSync = null;
    try {
        const [rows] = await pool.query(
            "SELECT valor FROM rh_configuracoes WHERE categoria = 'rhid_sync' AND chave = ?",
            [`last_sync_${device.ip}`]
        );
        if (rows.length > 0) lastSync = rows[0].valor;
    } catch (e) { /* first sync */ }

    // Fetch marks from device API
    const marks = await fetchDeviceMarks(device, lastSync);

    let imported = 0;
    let skipped = 0;

    for (const mark of marks) {
        try {
            // Check for duplicates
            const [existing] = await pool.query(
                `SELECT id FROM ponto_marcacoes 
                 WHERE (funcionario_id = ? OR pis = ?) AND data = ? AND hora = ?
                 LIMIT 1`,
                [mark.funcionario_id || 0, mark.pis || '', mark.data, mark.hora]
            );

            if (existing.length > 0) {
                skipped++;
                continue;
            }

            // Resolve funcionario_id from PIS
            let funcId = mark.funcionario_id;
            if (!funcId && mark.pis) {
                const [func] = await pool.query(
                    'SELECT id FROM funcionarios WHERE pis_pasep = ? LIMIT 1',
                    [mark.pis]
                );
                if (func.length > 0) funcId = func[0].id;
            }

            // Insert new record
            await pool.query(
                `INSERT INTO ponto_marcacoes (funcionario_id, pis, data, hora, tipo, origem, observacao, criado_em)
                 VALUES (?, ?, ?, ?, ?, 'auto_import', ?, NOW())`,
                [
                    funcId || null,
                    mark.pis || '',
                    mark.data,
                    mark.hora,
                    mark.tipo || 'marcacao',
                    `Auto-importado de ${device.nome || device.ip} em ${new Date().toLocaleString('pt-BR')}`
                ]
            );
            imported++;
        } catch (insertErr) {
            console.error('[AUTO-PONTO] Erro ao inserir marcação:', insertErr.message);
        }
    }

    // Update last sync timestamp
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rh_configuracoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                categoria VARCHAR(50) NOT NULL,
                chave VARCHAR(100) NOT NULL,
                valor TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY idx_cat_chave (categoria, chave)
            )
        `);
        await pool.query(
            `INSERT INTO rh_configuracoes (categoria, chave, valor)
             VALUES ('rhid_sync', ?, NOW())
             ON DUPLICATE KEY UPDATE valor = NOW()`,
            [`last_sync_${device.ip}`]
        );
    } catch (e) { /* silent */ }

    return { imported, skipped };
}

/**
 * Fetch marks from Control iD API
 * The API returns punches since a given timestamp
 */
async function fetchDeviceMarks(device, since) {
    return new Promise((resolve) => {
        try {
            // Control iD REP API endpoint
            const postData = JSON.stringify({
                login: device.login,
                password: device.password,
                ...(since ? { initial_date: since } : {})
            });

            const options = {
                hostname: device.ip,
                port: device.port || 443,
                path: '/access_log.fcgi',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                rejectUnauthorized: false,
                timeout: 15000
            };

            const transport = device.port === 80 ? http : https;
            const req = transport.request(options, (res) => {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        const marks = (data.access_log || data.records || data.marcacoes || []).map(entry => {
                            const ts = entry.time ? new Date(entry.time * 1000) : new Date(entry.data_hora || entry.timestamp);
                            return {
                                pis: entry.pis || entry.user_id || '',
                                funcionario_id: entry.user_id || null,
                                data: ts.toISOString().split('T')[0],
                                hora: ts.toTimeString().substring(0, 5),
                                tipo: 'marcacao'
                            };
                        });
                        resolve(marks);
                    } catch (parseErr) {
                        console.error('[AUTO-PONTO] Erro ao parsear resposta do dispositivo:', parseErr.message);
                        resolve([]);
                    }
                });
            });

            req.on('error', (err) => {
                console.error(`[AUTO-PONTO] Dispositivo ${device.ip} offline/inacessível:`, err.message);
                resolve([]);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error(`[AUTO-PONTO] Timeout conectando a ${device.ip}`);
                resolve([]);
            });

            req.write(postData);
            req.end();
        } catch (error) {
            console.error('[AUTO-PONTO] Erro geral fetch:', error.message);
            resolve([]);
        }
    });
}

/**
 * Para o auto-import (para shutdown gracioso)
 */
function stopAutoImportPonto() {
    if (autoImportTimer) {
        clearInterval(autoImportTimer);
        autoImportTimer = null;
        console.log('[AUTO-PONTO] ⏹️ Auto-importação parada');
    }
}

/**
 * Retorna status do auto-import
 */
function getAutoImportStatus() {
    return {
        active: autoImportTimer !== null,
        running: isRunning
    };
}

module.exports = {
    initAutoImportPonto,
    stopAutoImportPonto,
    getAutoImportStatus,
    runAutoImport
};
