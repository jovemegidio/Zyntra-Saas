const mysql = require('mysql2/promise');
const fs = require('fs');

// Configuração do banco Railway
const DB_CONFIG = {
    host: 'interchange.proxy.rlwy.net',
    port: 19396,
    user: 'root',
    password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database: 'railway',
    charset: 'utf8mb4'
};

// CNPJ para geração de EAN-13: 68.192.475/0001-60
const CNPJ_BASE = '6819247500';

// Função para calcular dígito verificador EAN-13
function calcularDigitoVerificadorEAN13(codigo12) {
    let soma = 0;
    for (let i = 0; i < 12; i++) {
        const digito = parseInt(codigo12[i]);
        soma += digito * (i % 2 === 0 ? 1 : 3);
    }
    const resto = soma % 10;
    return resto === 0 ? 0 : 10 - resto;
}

// Função para gerar EAN-13 baseado no CNPJ e sequência
function gerarEAN13(sequencia) {
    const codigo12 = '789' + CNPJ_BASE.substring(0, 6) + sequencia.toString().padStart(3, '0');
    const digitoVerificador = calcularDigitoVerificadorEAN13(codigo12);
    return codigo12 + digitoVerificador;
}

// Função para formatar NCM (remover pontos)
function formatarNCM(ncm) {
    if (!ncm) return null;
    return ncm.replace(/\./g, '');
}

// Função para formatar CEST (remover pontos)
function formatarCEST(cest) {
    if (!cest) return null;
    return cest.replace(/\./g, '');
}

// Função para extrair unidade
function extrairUnidade(textoUnidade) {
    if (!textoUnidade) return 'UN';
    const match = textoUnidade.match(/\(([^)]+)\)/);
    return match ? match[1] : 'UN';
}

// Função para extrair código de origem
function extrairOrigem(textoOrigem) {
    if (!textoOrigem) return '0';
    // Ex: "Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8" -> "0"
    if (textoOrigem.toLowerCase().includes('nacional')) return '0';
    if (textoOrigem.toLowerCase().includes('estrangeira')) return '1';
    return '0';
}

async function importarProdutos(connection) {
    console.log('📦 IMPORTANDO PRODUTOS');
    console.log('='.repeat(60));

    // Carregar produtos do JSON
    let produtosExcel;
    try {
        produtosExcel = JSON.parse(fs.readFileSync('todos_produtos_excel.json', 'utf8'));
    } catch (e) {
        console.log('❌ Arquivo todos_produtos_excel.json não encontrado');
        return;
    }

    console.log(`📄 Total de produtos no arquivo: ${produtosExcel.length}`);

    // Buscar produtos existentes
    const [produtosExistentes] = await connection.query('SELECT id, codigo, nome, descricao FROM produtos');
    console.log(`📊 Produtos existentes no Railway: ${produtosExistentes.length}`);

    // Criar mapa de produtos existentes por código e descrição
    const mapaProdutos = {};
    produtosExistentes.forEach(p => {
        if (p.codigo) mapaProdutos[p.codigo.toLowerCase().trim()] = p.id;
        if (p.nome) mapaProdutos[p.nome.toLowerCase().trim()] = p.id;
        if (p.descricao) mapaProdutos[p.descricao.toLowerCase().trim()] = p.id;
    });

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    let sequenciaEAN = 1;

    for (const produto of produtosExcel) {
        const codigo = produto.codigo || null;
        const descricao = produto.descricao || null;
        const ncm = formatarNCM(produto.ncm) || null;
        const cest = formatarCEST(produto.cest) || null;
        const preco = produto.preco || 0;
        const estoque = produto.estoque || 0;
        const unidade = extrairUnidade(produto.unidade) || 'UN';
        const origem = extrairOrigem(produto.origem) || '0';
        const familia = produto.familia || null;
        const pesoLiquido = produto.pesoLiquido || 0;
        const pesoBruto = produto.pesoBruto || 0;
        const situacao = produto.situacao || 'Ativo';
        const ativo = situacao.toLowerCase().includes('ativo') ? 1 : 0;
        const tipo = produto.tipo || null;

        // Gerar EAN se não tiver
        let gtin = produto.ean && produto.ean.trim() !== '' ? produto.ean : null;
        if (!gtin) {
            gtin = gerarEAN13(sequenciaEAN++);
        }

        try {
            const chaveDescricao = descricao ? descricao.toLowerCase().trim() : '';
            const chaveCodigo = codigo ? codigo.toLowerCase().trim() : '';

            const idExistente = mapaProdutos[chaveCodigo] || mapaProdutos[chaveDescricao];

            if (idExistente) {
                // Atualizar produto existente
                await connection.execute(`
                    UPDATE produtos
                    SET ncm = COALESCE(?, ncm),
                        cest = COALESCE(?, cest),
                        gtin = COALESCE(?, gtin),
                        preco_venda = COALESCE(NULLIF(?, 0), preco_venda),
                        preco_custo = COALESCE(NULLIF(?, 0), preco_custo),
                        familia = COALESCE(?, familia),
                        origem = COALESCE(?, origem),
                        peso = COALESCE(NULLIF(?, 0), peso),
                        unidade_medida = COALESCE(?, unidade_medida),
                        ativo = ?,
                        tipo_produto = COALESCE(?, tipo_produto),
                        updated_at = NOW()
                    WHERE id = ?
                `, [ncm, cest, gtin, preco, preco, familia, origem, pesoBruto || pesoLiquido, unidade, ativo, tipo, idExistente]);

                atualizados++;
            } else {
                // Inserir novo produto
                await connection.execute(`
                    INSERT INTO produtos (
                        codigo, nome, descricao, ncm, cest, gtin,
                        preco_venda, preco_custo, custo_unitario,
                        familia, origem, peso, unidade_medida,
                        quantidade_estoque, estoque_atual, ativo, tipo_produto,
                        status, data_criacao, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', NOW(), NOW())
                `, [
                    codigo,
                    descricao,
                    descricao,
                    ncm,
                    cest,
                    gtin,
                    preco,
                    preco,
                    preco,
                    familia,
                    origem,
                    pesoBruto || pesoLiquido,
                    unidade,
                    estoque,
                    estoque,
                    ativo,
                    tipo
                ]);

                inseridos++;

                // Adicionar ao mapa para evitar duplicatas
                if (descricao) mapaProdutos[descricao.toLowerCase().trim()] = 'novo';
                if (codigo) mapaProdutos[codigo.toLowerCase().trim()] = 'novo';
            }

            if ((inseridos + atualizados) % 100 === 0) {
                console.log(`  📊 Progresso: ${inseridos} inseridos, ${atualizados} atualizados...`);
            }
        } catch (err) {
            console.log(`  ❌ ${codigo || descricao}: ${err.message}`);
            erros++;
        }
    }

    console.log(`  📊 RESUMO PRODUTOS:`);
    console.log(`     - Inseridos: ${inseridos}`);
    console.log(`     - Atualizados: ${atualizados}`);
    console.log(`     - Erros: ${erros}`);
}

async function importarMateriais(connection) {
    console.log('🔧 IMPORTANDO MATERIAIS');
    console.log('='.repeat(60));

    // Carregar materiais do JSON
    let materiaisExcel;
    try {
        materiaisExcel = JSON.parse(fs.readFileSync('materiais_extraidos.json', 'utf8'));
    } catch (e) {
        console.log('❌ Arquivo materiais_extraidos.json não encontrado');
        return;
    }

    console.log(`📄 Total de materiais no arquivo: ${materiaisExcel.length}`);

    // Buscar materiais existentes
    const [materiaisExistentes] = await connection.query('SELECT id, codigo_material, descricao FROM materiais');
    console.log(`📊 Materiais existentes no Railway: ${materiaisExistentes.length}`);

    // Criar mapa de materiais existentes
    const mapaMateriais = {};
    materiaisExistentes.forEach(m => {
        if (m.descricao) mapaMateriais[m.descricao.toLowerCase().trim()] = m.id;
        if (m.codigo_material) mapaMateriais[m.codigo_material.toLowerCase().trim()] = m.id;
    });

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;

    for (const material of materiaisExcel) {
        const codigo = material.codigo || null;
        const descricao = material.descricao || null;
        const unidade = extrairUnidade(material.unidade) || 'UN';
        const estoque = material.estoque || 0;
        const preco = material.preco || 0;
        const fornecedor = material.fornecedor || null;

        try {
            const chaveDescricao = descricao ? descricao.toLowerCase().trim() : '';
            const chaveCodigo = codigo ? codigo.toLowerCase().trim() : '';

            const idExistente = mapaMateriais[chaveCodigo] || mapaMateriais[chaveDescricao];

            if (idExistente) {
                // Atualizar material existente
                await connection.execute(`
                    UPDATE materiais
                    SET unidade_medida = COALESCE(?, unidade_medida),
                        custo_unitario = COALESCE(NULLIF(?, 0), custo_unitario),
                        fornecedor_padrao = COALESCE(?, fornecedor_padrao)
                    WHERE id = ?
                `, [unidade, preco, fornecedor, idExistente]);

                atualizados++;
            } else {
                // Inserir novo material
                await connection.execute(`
                    INSERT INTO materiais (
                        codigo_material, descricao, unidade_medida,
                        quantidade_estoque, custo_unitario, fornecedor_padrao
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    codigo,
                    descricao,
                    unidade,
                    estoque,
                    preco,
                    fornecedor
                ]);

                inseridos++;

                // Adicionar ao mapa para evitar duplicatas
                if (descricao) mapaMateriais[descricao.toLowerCase().trim()] = 'novo';
                if (codigo) mapaMateriais[codigo.toLowerCase().trim()] = 'novo';
            }

            if ((inseridos + atualizados) % 50 === 0) {
                console.log(`  📊 Progresso: ${inseridos} inseridos, ${atualizados} atualizados...`);
            }
        } catch (err) {
            console.log(`  ❌ ${codigo || descricao}: ${err.message}`);
            erros++;
        }
    }

    console.log(`  📊 RESUMO MATERIAIS:`);
    console.log(`     - Inseridos: ${inseridos}`);
    console.log(`     - Atualizados: ${atualizados}`);
    console.log(`     - Erros: ${erros}`);
}

async function main() {
    console.log('🚀 IMPORTAÇÍO COMPLETA PARA RAILWAY');
    console.log('='.repeat(60));
    console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔌 Conectando ao Railway...`);

    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Conectado ao Railway!');

    try {
        // Importar produtos
        await importarProdutos(connection);

        // Importar materiais
        await importarMateriais(connection);

        // Estatísticas finais
        console.log('📊 ESTATÍSTICAS FINAIS');
        console.log('='.repeat(60));

        const [countProdutos] = await connection.query('SELECT COUNT(*) as total FROM produtos');
        const [countMateriais] = await connection.query('SELECT COUNT(*) as total FROM materiais');
        const [produtosComNCM] = await connection.query('SELECT COUNT(*) as total FROM produtos WHERE ncm IS NOT NULL AND ncm != ""');
        const [produtosComGTIN] = await connection.query('SELECT COUNT(*) as total FROM produtos WHERE gtin IS NOT NULL AND gtin != ""');

        console.log(`  📦 Total de produtos no Railway: ${countProdutos[0].total}`);
        console.log(`     - Com NCM: ${produtosComNCM[0].total}`);
        console.log(`     - Com GTIN: ${produtosComGTIN[0].total}`);
        console.log(`  🔧 Total de materiais no Railway: ${countMateriais[0].total}`);

        console.log('✅ IMPORTAÇÍO CONCLUÍDA COM SUCESSO!');

    } catch (error) {
        console.error('❌ ERRO GERAL:', error.message);
        console.error(error.stack);
    } finally {
        await connection.end();
        console.log('🔌 Conexão encerrada');
    }
}

main();
