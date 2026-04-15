'use strict';

/**
 * One-time migration: Restore missing CNPJ data for all transportadoras.
 * Data extracted from aluforce_vendas_dump_2025-12-18.sql.
 * Idempotent: only updates records where cnpj_cpf is NULL or empty.
 */

// Base 73 transportadoras (ID → CNPJ) from the original dump
const BASE_CNPJS = [
    '81.560.047/0007-05', // offset 0
    '51.254.159/0001-73', // offset 1
    '36.212.210/0001-90', // offset 2
    '19.451.038/0024-03', // offset 3
    '10.973.773/0001-08', // offset 4
    '54.813.811/0001-30', // offset 5
    '68.192.475/0001-60', // offset 6
    '19.973.954/0001-09', // offset 7
    '13.091.297/0002-70', // offset 8
    '33.070.814/0003-13', // offset 9
    '39.041.579/0001-76', // offset 10
    '01.403.213/0001-27', // offset 11
    '01.010.442/0006-96', // offset 12
    '05.813.363/0010-50', // offset 13
    '03.119.616/0002-55', // offset 14
    '05.813.363/0006-74', // offset 15
    '21.623.475/0017-71', // offset 16
    '12.331.372/0001-80', // offset 17
    '17.676.693/0013-73', // offset 18
    '19.029.870/0002-00', // offset 19
    '09.181.518/0003-05', // offset 20
    '07.632.502/0002-65', // offset 21
    '05.597.965/0001-27', // offset 22
    '31.716.355/0001-05', // offset 23
    '13.425.351/0001-96', // offset 24
    '50.928.982/0001-54', // offset 25
    '22.604.364/0001-13', // offset 26
    '33.487.162/0001-55', // offset 27
    '10.510.059/0002-64', // offset 28
    '23.860.180/0001-87', // offset 29
    '03.298.420/0003-56', // offset 30
    '28.410.268/0001-10', // offset 31
    '02.259.840/0001-07', // offset 32
    '34.538.625/0001-23', // offset 33
    '09.651.932/0001-79', // offset 34
    '44.914.992/0001-38', // offset 35
    '48.618.583/0001-45', // offset 36
    '57.317.394/0001-23', // offset 37
    '24.882.886/0002-93', // offset 38
    '07.494.510/0003-73', // offset 39
    '01.496.359/0002-45', // offset 40
    '10.382.132/0003-40', // offset 41
    '01.220.380/0001-32', // offset 42
    '13.484.991/0001-77', // offset 43
    '35.632.522/0001-90', // offset 44
    '01.496.359/0001-64', // offset 45
    '10.382.132/0001-89', // offset 46
    '10.866.435/0004-10', // offset 47
    '25.335.282/0003-70', // offset 48
    '06.879.342/0004-52', // offset 49
    '06.311.940/0001-88', // offset 50
    '28.141.158/0007-96', // offset 51
    '51.716.490/0001-68', // offset 52
    '17.706.435/0002-30', // offset 53
    '20.693.532/0001-69', // offset 54
    '44.433.407/0001-88', // offset 55
    '38.243.029/0002-58', // offset 56
    '46.556.446/0001-06', // offset 57
    '50.335.371/0002-83', // offset 58
    '50.335.371/0001-00', // offset 59
    '22.980.155/0003-36', // offset 60
    '91.381.095/0002-77', // offset 61
    '10.349.430/0002-58', // offset 62
    '01.169.444/0003-80', // offset 63
    '13.988.627/0002-25', // offset 64
    '15.177.661/0002-45', // offset 65
    '07.770.042/0001-50', // offset 66
    '45.362.970/0003-37', // offset 67
    '04.502.970/0003-08', // offset 68
    '08.323.344/0003-05', // offset 69
    '38.493.863/0002-00', // offset 70
    '55.249.839/0001-50', // offset 71
    '03.232.675/0025-21', // offset 72
];

async function fixTransportadorasCnpj(pool) {
    // Check if fix is needed: count records with empty cnpj_cpf
    const [check] = await pool.query(
        `SELECT COUNT(*) as total FROM transportadoras WHERE cnpj_cpf IS NULL OR cnpj_cpf = '' OR cnpj_cpf = '[ENCRYPTED]'`
    );

    if (check[0].total === 0) {
        console.log('[FIX-CNPJ] ✅ Todos os CNPJs já estão preenchidos — skip');
        return;
    }

    console.log(`[FIX-CNPJ] 🔧 Restaurando CNPJs de ${check[0].total} transportadoras...`);

    // Get max ID to know how many records exist
    const [maxRow] = await pool.query('SELECT MAX(id) as maxId FROM transportadoras');
    const maxId = maxRow[0].maxId || 0;

    if (maxId === 0) {
        console.log('[FIX-CNPJ] ⚠️ Nenhuma transportadora encontrada');
        return;
    }

    // Build all ID → CNPJ mappings (pattern repeats every 73 records)
    const updates = [];
    for (let id = 1; id <= maxId; id++) {
        const cnpj = BASE_CNPJS[(id - 1) % BASE_CNPJS.length];
        updates.push([cnpj, id]);
    }

    // Execute updates in a single transaction
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let updated = 0;
        for (const [cnpj, id] of updates) {
            const [result] = await conn.query(
                `UPDATE transportadoras SET cnpj_cpf = ? WHERE id = ? AND (cnpj_cpf IS NULL OR cnpj_cpf = '' OR cnpj_cpf = '[ENCRYPTED]')`,
                [cnpj, id]
            );
            if (result.affectedRows > 0) updated++;
        }

        await conn.commit();
        console.log(`[FIX-CNPJ] ✅ ${updated} transportadoras atualizadas com CNPJ`);
    } catch (err) {
        await conn.rollback();
        console.error('[FIX-CNPJ] ❌ Erro ao restaurar CNPJs:', err.message);
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { fixTransportadorasCnpj };
