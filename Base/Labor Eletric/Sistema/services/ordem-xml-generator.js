/**
 * Gerador de XML para Ordem de Produção
 * Serializa os dados da OP em XML estruturado para processamento XSL-FO → PDF
 * @module services/ordem-xml-generator
 */
'use strict';

const { create } = require('xmlbuilder2');

/**
 * Gera XML da Ordem de Produção a partir dos dados do sistema
 * @param {Object} dados - Dados da ordem (mesmo formato enviado para /api/gerar-ordem-excel)
 * @returns {string} XML serializado como string
 */
function gerarOrdemXML(dados) {
    const produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
    const formasPagamento = Array.isArray(dados.formas_pagamento) ? dados.formas_pagamento : [];

    // Dados da empresa - usar dados dinâmicos se fornecidos, senão env vars, senão fallback
    const empresa = dados.empresa || {};
    const empNome = empresa.nome || empresa.razao_social || process.env.EMPRESA_NOME || 'Empresa não configurada';
    const empEndereco = empresa.endereco || process.env.EMPRESA_ENDERECO || '';
    const empBairro = empresa.bairro || process.env.EMPRESA_BAIRRO || '';
    const empCep = empresa.cep || process.env.EMPRESA_CEP || '';
    const empCidade = empresa.cidade || process.env.EMPRESA_CIDADE || '';
    const empUf = empresa.estado || empresa.uf || process.env.EMPRESA_UF || '';
    const empEnderecoCompleto = empresa.enderecoCompleto || `${empEndereco} - ${empBairro}`.replace(/^ - $/, '');
    const empCidadeUf = `${empCidade}${empUf ? ' - ' + empUf : ''}`;

    // Calcular total geral
    let totalGeral = 0;
    produtos.forEach(p => {
        const qty = parseFloat(p.quantidade) || 0;
        const vUnit = parseFloat(p.valor_unitario) || 0;
        totalGeral += qty * vUnit;
    });

    const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('ordem-producao', {
            xmlns: 'http://zyntra.com.br/ordem-producao',
            'data-geracao': new Date().toISOString()
        })
            .ele('empresa')
                .ele('nome').txt(empNome).up()
                .ele('endereco').txt(empEnderecoCompleto).up()
                .ele('cep').txt(empCep.replace(/\D/g, '')).up()
                .ele('cidade').txt(empCidadeUf).up()
            .up()
            .ele('cabecalho')
                .ele('numero-orcamento').txt(String(dados.numero_orcamento || '')).up()
                .ele('revisao').txt(String(dados.revisao || '01')).up()
                .ele('numero-pedido').txt(String(dados.numero_pedido || '')).up()
                .ele('data-liberacao').txt(dados.data_liberacao || formatarData(new Date())).up()
                .ele('vendedor').txt(String(dados.vendedor || '')).up()
                .ele('prazo-entrega').txt(String(dados.prazo_entrega || '15 Dias')).up()
            .up()
            .ele('cliente')
                .ele('nome').txt(String(dados.cliente || '')).up()
                .ele('contato').txt(String(dados.contato_cliente || '')).up()
                .ele('telefone').txt(String(dados.fone_cliente || '')).up()
                .ele('email').txt(String(dados.email_cliente || '')).up()
                .ele('frete').txt(String(dados.tipo_frete || 'FOB')).up()
                .ele('cpf-cnpj').txt(String(dados.cpf_cnpj || '')).up()
                .ele('endereco').txt(String(dados.endereco || '')).up()
                .ele('cep').txt(String(dados.cep || '')).up()
            .up()
            .ele('transportadora')
                .ele('nome').txt(String(dados.transportadora_nome || '')).up()
                .ele('telefone').txt(String(dados.transportadora_fone || '')).up()
                .ele('cep').txt(String(dados.transportadora_cep || '')).up()
                .ele('endereco').txt(String(dados.transportadora_endereco || '')).up()
                .ele('cpf-cnpj').txt(String(dados.transportadora_cpf_cnpj || '')).up()
                .ele('email-nfe').txt(String(dados.transportadora_email_nfe || '')).up()
            .up();

    // Nó de produtos
    const produtosNode = doc.ele('produtos');
    produtos.forEach((prod, idx) => {
        const qty = parseFloat(prod.quantidade) || 0;
        const vUnit = parseFloat(prod.valor_unitario) || 0;
        const vTotal = qty * vUnit;

        produtosNode.ele('produto')
            .ele('item').txt(String(idx + 1)).up()
            .ele('codigo').txt(String(prod.codigo || prod['código'] || '').toUpperCase()).up()
            .ele('descricao').txt(String(prod.descricao || prod['descrição'] || '')).up()
            .ele('embalagem').txt(String(prod.embalagem || 'Bobina')).up()
            .ele('lances').txt(String(prod.lances || '')).up()
            .ele('quantidade').txt(qty.toFixed(2)).up()
            .ele('valor-unitario').txt(vUnit.toFixed(2)).up()
            .ele('valor-total').txt(vTotal.toFixed(2)).up()
            // Campos extras para aba PRODUÇÃO
            .ele('codigo-cores').txt(String(prod.codigo_cores || '')).up()
            .ele('peso-liquido').txt(String(prod.peso_liquido || '')).up()
            .ele('lote').txt(String(prod.lote || '')).up()
        .up();
    });

    // Totais
    doc.ele('totais')
        .ele('total-geral').txt(totalGeral.toFixed(2)).up()
    .up();

    // Pagamento
    const pagamentoNode = doc.ele('pagamento');
    formasPagamento.forEach((fp, idx) => {
        const perc = parseFloat(fp.percentual) || 0;
        const valor = totalGeral * (perc / 100);
        pagamentoNode.ele('forma', { index: String(idx + 1) })
            .ele('tipo').txt(String(fp.forma || '')).up()
            .ele('percentual').txt(String(perc)).up()
            .ele('metodo').txt(String(fp.metodo || '')).up()
            .ele('valor').txt(valor.toFixed(2)).up()
        .up();
    });

    // Observações
    doc.ele('observacoes')
        .ele('geral').txt(String(dados.observacoes || dados.observacoes_pedido || '')).up()
        .ele('entrega').txt(String(dados.observacoes_entrega || '')).up()
        .ele('status-entrega').txt(String(dados.status_entrega || 'COMPLETO')).up()
    .up();

    return doc.end({ prettyPrint: true });
}

function formatarData(date) {
    const d = date instanceof Date ? date : new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

module.exports = { gerarOrdemXML, formatarData };
