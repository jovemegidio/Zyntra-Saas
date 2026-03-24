/**
 * Diagnóstico de CPF logins — executa na VPS
 * Testa resolução de CPF para todos os funcionários
 * node /tmp/test-cpf-logins.js
 */
'use strict';
process.chdir('/var/www/aluforce');
require('dotenv').config({ path: '/var/www/aluforce/.env' });

const mysql = require('mysql2/promise');
const { decryptPII } = require('./lgpd-crypto');

const STATUS = { OK: '✅', WARN: '⚠️ ', ERR: '❌', INFO: 'ℹ️ ' };

async function main() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  DIAGNÓSTICO: CPF LOGIN — TODOS OS FUNCIONÁRIOS');
    console.log(`  Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const [rows] = await pool.query(
        `SELECT id, nome_completo, email, cpf, senha, forcar_troca_senha FROM funcionarios WHERE cpf IS NOT NULL AND cpf != '' ORDER BY id`
    );

    console.log(`Total funcionários com CPF: ${rows.length}\n`);

    const results = [];

    for (const f of rows) {
        let cpfDecrypted = null;
        let cpfStatus = '';
        let issue = null;

        // 1. Decriptar CPF
        if (f.cpf && f.cpf.startsWith('ENC:')) {
            try {
                cpfDecrypted = decryptPII(f.cpf);
                if (!cpfDecrypted) {
                    cpfStatus = 'ENC_DECRYPT_NULL';
                    issue = 'CPF ENC: resultou em null após decrypt';
                } else {
                    cpfDecrypted = cpfDecrypted.replace(/\D/g, '');
                    cpfStatus = cpfDecrypted.length === 11 ? 'ENC_OK' : `ENC_LEN${cpfDecrypted.length}`;
                    if (cpfDecrypted.length !== 11) issue = `CPF decriptado tem ${cpfDecrypted.length} dígitos (esperado 11)`;
                }
            } catch (e) {
                cpfStatus = 'ENC_ERROR';
                issue = `Erro decrypt: ${e.message}`;
            }
        } else {
            cpfDecrypted = (f.cpf || '').replace(/\D/g, '');
            cpfStatus = cpfDecrypted.length === 11 ? 'PLAIN_OK' : `PLAIN_LEN${cpfDecrypted.length}`;
            if (cpfDecrypted.length !== 11) issue = `CPF plaintext tem ${cpfDecrypted.length} dígitos`;
        }

        // 2. Verificar tipo de senha em funcionarios
        let senhaTipo = 'NULL';
        if (f.senha) {
            if (f.senha.startsWith('$2')) senhaTipo = 'BCRYPT';
            else if (f.senha.startsWith('ENC:')) senhaTipo = 'ENC_LGPD(PROBLEMA)';
            else senhaTipo = `PLAIN(${f.senha.length}ch)`;
        }

        // 3. Verificar conta usuarios
        let usuarioStatus = 'SEM_CONTA';
        let loginCount = '-';
        let userAtivo = '-';
        let forcarTroca = f.forcar_troca_senha;
        let senhaHashTipo = '-';

        const [urows] = await pool.query(
            `SELECT id, status, ativo, login_count, forcar_troca_senha, senha_temporaria,
                    CASE WHEN senha_hash LIKE '$2%' THEN 'BCRYPT'
                         WHEN senha_hash IS NULL THEN 'NULL'
                         WHEN senha_hash = '' THEN 'EMPTY'
                         ELSE 'OTHER' END as sh_tipo
             FROM usuarios WHERE email = ? LIMIT 1`,
            [f.email]
        );

        if (urows.length) {
            const u = urows[0];
            usuarioStatus = u.status || 'desconhecido';
            loginCount = u.login_count;
            userAtivo = u.ativo;
            senhaHashTipo = u.sh_tipo;
            if (u.ativo == 0 && !issue) issue = 'usuarios.ativo=0 (desativado)';
            if (u.status === 'inativo' && !issue) issue = `usuarios.status=inativo`;
        } else {
            if (!issue) issue = 'Sem registro em usuarios (auto-provision necessário)';
        }

        // 4. Classificar estado
        let estado = STATUS.OK + ' OK';
        if (issue) {
            if (cpfStatus.includes('ERROR') || cpfStatus.includes('NULL') || senhaTipo === 'NULL') {
                estado = STATUS.ERR + ' BLOQUEADO';
            } else if (forcarTroca == 1 && loginCount == 0) {
                estado = STATUS.WARN + 'PRIMEIRO_ACESSO';
            } else if (usuarioStatus === 'SEM_CONTA') {
                estado = STATUS.WARN + 'SEM_CONTA_USUARIOS'; 
            } else {
                estado = STATUS.WARN + 'ATENÇÃO';
            }
        } else if (forcarTroca == 1) {
            estado = STATUS.INFO + 'PRECISA_TROCAR_SENHA';
        }

        results.push({
            fid: f.id,
            nome: (f.nome_completo || '').split(' ').slice(0,2).join(' '),
            email: f.email,
            cpfOk: cpfDecrypted && cpfDecrypted.length === 11,
            cpfStatus,
            senhaTipo,
            usuarioStatus,
            loginCount,
            userAtivo,
            forcarTroca,
            senhaHashTipo,
            issue,
            estado
        });
    }

    // ── Relatório por estado ──
    const byEstado = {};
    for (const r of results) {
        const k = r.estado.replace(/[✅⚠️❌ℹ️]/g, '').trim();
        if (!byEstado[k]) byEstado[k] = [];
        byEstado[k].push(r);
    }

    for (const [estado, items] of Object.entries(byEstado)) {
        console.log(`\n─── ${estado} (${items.length}) ───────────────────────────────`);
        for (const r of items) {
            console.log(`  ${r.estado.padEnd(30)} fid=${String(r.fid).padEnd(3)} ${r.email}`);
            console.log(`    CPF: ${r.cpfStatus.padEnd(12)} | FuncSenha: ${r.senhaTipo.padEnd(8)} | UserSenha: ${r.senhaHashTipo.padEnd(8)} | loginCount=${r.loginCount} | ativo=${r.userAtivo} | fts=${r.forcarTroca}`);
            if (r.issue) console.log(`    ⚠ ${r.issue}`);
        }
    }

    // ── Sumário ──
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMÁRIO');
    console.log('═══════════════════════════════════════════════════════════');
    for (const [estado, items] of Object.entries(byEstado)) {
        console.log(`  ${estado.padEnd(30)}: ${items.length}`);
    }
    console.log(`  TOTAL                         : ${results.length}`);

    // ── Identificar problemas críticos ──
    const criticos = results.filter(r => r.estado.includes('BLOQUEADO'));
    if (criticos.length) {
        console.log('\n❌ PROBLEMAS CRÍTICOS (login impossível):');
        criticos.forEach(r => console.log(`  - ${r.email}: ${r.issue}`));
    }

    await pool.end();
    console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
