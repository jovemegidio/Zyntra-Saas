// =============================================
// ENDPOINT: Gerar Ordem de Produção em Excel
// =============================================
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Função para formatar CPF/CNPJ com pontuação
function formatarCpfCnpjExcel(valor) {
    if (!valor) return '';
    
    // Remove tudo que não é número
    const numeros = String(valor).replace(/\D/g, '');
    
    if (numeros.length === 11) {
        // CPF: 000.000.000-00
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numeros.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    // Se já tiver Formatação ou tamanho inválido, retorna como está
    return valor;
}

app.post('/api/gerar-ordem-excel', async (req, res) => {
    try {
        const dados = req.body;
        logger.info('[GERAR ORDEM EXCEL] Recebendo dados:', { num_pedido: dados.num_pedido, produtos: dados.produtos?.length });
        
        // Validações básicas
        if (!dados.num_pedido) {
            return res.status(400).json({ message: 'Número do pedido é obrigatório' });
        }
        
        if (!dados.produtos || dados.produtos.length === 0) {
            return res.status(400).json({ message: 'Adicione pelo menos um produto' });
        }
        
        // Carregar template Excel
        const templatePath = path.join(__dirname, 'Ordem de Produção.xlsx');
        
        if (!fs.existsSync(templatePath)) {
            logger.error('[GERAR ORDEM EXCEL] Template não encontrado:', templatePath);
            return res.status(500).json({ message: 'Template Excel não encontrado no servidor' });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
            return res.status(500).json({ message: 'Planilha inválida no template' });
        }
        
        // ============================================
        // MAPEAMENTO DOS DADOS NAS CÉLULAS
        // ============================================
        
        // Dados Principais (Linha 4)
        worksheet.getCell('C4').value = dados.num_orcamento || '';      // Orçamento
        worksheet.getCell('D4').value = dados.revisao || '';            // Revisão
        worksheet.getCell('G4').value = dados.num_pedido || '';         // Pedido
        
        // Data Liberação (Linha 4, coluna J)
        if (dados.data_liberacao) {
            const dataLib = new Date(dados.data_liberacao + 'T00:00:00');
            worksheet.getCell('J4').value = dataLib;
            worksheet.getCell('J4').numFmt = 'dd/mm/yyyy';
        }
        
        // Vendedor (Linha 6)
        worksheet.getCell('C6').value = dados.vendedor || '';
        worksheet.getCell('D6').value = dados.vendedor || '';
        worksheet.getCell('E6').value = dados.vendedor || '';
        
        // Prazo de Entrega (Linha 6)
        if (dados.prazo_entrega) {
            const dataPrazo = new Date(dados.prazo_entrega + 'T00:00:00');
            worksheet.getCell('H6').value = dataPrazo;
            worksheet.getCell('I6').value = dataPrazo;
            worksheet.getCell('J6').value = dataPrazo;
            worksheet.getCell('H6').numFmt = 'dd/mm/yyyy';
            worksheet.getCell('I6').numFmt = 'dd/mm/yyyy';
            worksheet.getCell('J6').numFmt = 'dd/mm/yyyy';
        }
        
        // Cliente (Linha 7)
        worksheet.getCell('C7').value = dados.cliente || '';
        worksheet.getCell('D7').value = dados.cliente || '';
        worksheet.getCell('E7').value = dados.cliente || '';
        worksheet.getCell('F7').value = dados.cliente || '';
        worksheet.getCell('G7').value = dados.cliente || '';
        worksheet.getCell('H7').value = dados.cliente || '';
        worksheet.getCell('I7').value = dados.cliente || '';
        worksheet.getCell('J7').value = dados.cliente || '';
        
        // Contato (Linha 8)
        worksheet.getCell('C8').value = dados.contato_cliente || '';
        worksheet.getCell('D8').value = dados.contato_cliente || '';
        worksheet.getCell('E8').value = dados.contato_cliente || '';
        worksheet.getCell('F8').value = dados.contato_cliente || '';
        
        // Fone Cliente (Linha 8)
        worksheet.getCell('H8').value = dados.fone_cliente || '';
        worksheet.getCell('I8').value = dados.fone_cliente || '';
        worksheet.getCell('J8').value = dados.fone_cliente || '';
        
        // Email Cliente (Linha 9)
        worksheet.getCell('C9').value = dados.email_cliente || '';
        worksheet.getCell('D9').value = dados.email_cliente || '';
        worksheet.getCell('E9').value = dados.email_cliente || '';
        worksheet.getCell('F9').value = dados.email_cliente || '';
        worksheet.getCell('G9').value = dados.email_cliente || '';
        
        // Tipo de Frete (Linha 9)
        worksheet.getCell('J9').value = dados.tipo_frete || '';
        
        // Transportadora (Linha 12)
        // Fone Transportadora
        worksheet.getCell('H12').value = dados.transportadora_fone || '';
        worksheet.getCell('I12').value = dados.transportadora_fone || '';
        worksheet.getCell('J12').value = dados.transportadora_fone || '';
        
        // CEP (Linha 13)
        worksheet.getCell('C13').value = dados.cep || '';
        worksheet.getCell('D13').value = dados.cep || '';
        
        // Endereço (Linha 13)
        worksheet.getCell('F13').value = dados.endereco || '';
        worksheet.getCell('G13').value = dados.endereco || '';
        worksheet.getCell('H13').value = dados.endereco || '';
        worksheet.getCell('I13').value = dados.endereco || '';
        worksheet.getCell('J13').value = dados.endereco || '';
        
        // CPF/CNPJ (Linha 15) - Com Formatação
        const cpfCnpjFormatado = formatarCpfCnpjExcel(dados.cpf_cnpj || '');
        worksheet.getCell('C15').value = cpfCnpjFormatado;
        worksheet.getCell('D15').value = cpfCnpjFormatado;
        worksheet.getCell('E15').value = cpfCnpjFormatado;
        
        // Email NF-e (Linha 15)
        worksheet.getCell('G15').value = dados.email_nfe || '';
        worksheet.getCell('H15').value = dados.email_nfe || '';
        worksheet.getCell('I15').value = dados.email_nfe || '';
        worksheet.getCell('J15').value = dados.email_nfe || '';
        
        // ============================================
        // PRODUTOS (Linhas 18-32)
        // ============================================
        let linhaAtual = 18;
        let totalGeral = 0;
        
        for (const produto of dados.produtos) {
            if (linhaAtual > 32) {
                logger.warn('[GERAR ORDEM EXCEL] Limite de produtos (15) atingido');
                break;
            }
            
            // Coluna B: Código
            worksheet.getCell(`B${linhaAtual}`).value = produto.codigo || '';
            
            // Colunas C, D, E: Produto/Descrição (usar descricao ou nome)
            const nomeProduto = produto.descricao || produto.nome || produto.produto || '';
            worksheet.getCell(`C${linhaAtual}`).value = nomeProduto;
            worksheet.getCell(`D${linhaAtual}`).value = nomeProduto;
            worksheet.getCell(`E${linhaAtual}`).value = nomeProduto;
            
            // Coluna F: Embalagem
            worksheet.getCell(`F${linhaAtual}`).value = produto.embalagem || '';
            
            // Coluna G: Lances
            worksheet.getCell(`G${linhaAtual}`).value = produto.lances || '';
            
            // Coluna H: Quantidade
            worksheet.getCell(`H${linhaAtual}`).value = produto.quantidade || 0;
            
            // Coluna I: Valor Unitário
            worksheet.getCell(`I${linhaAtual}`).value = produto.valor_unitario || 0;
            worksheet.getCell(`I${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            // Coluna J: Valor Total
            worksheet.getCell(`J${linhaAtual}`).value = produto.valor_total || 0;
            worksheet.getCell(`J${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            totalGeral += produto.valor_total || 0;
            linhaAtual++;
        }
        
        // Total do Pedido (Linhas 34-35)
        worksheet.getCell('I35').value = totalGeral;
        worksheet.getCell('J35').value = totalGeral;
        worksheet.getCell('I35').numFmt = 'R$ #,##0.00';
        worksheet.getCell('J35').numFmt = 'R$ #,##0.00';
        
        // ============================================
        // OBSERVAÇÕES (Linha 36)
        // ============================================
        if (dados.observacoes) {
            worksheet.getCell('I36').value = dados.observacoes;
            worksheet.getCell('J36').value = dados.observacoes;
        }
        
        // ============================================
        // CONDIÇÕES DE PAGAMENTO (Linhas 44-46)
        // ============================================
        
        // Linha 45: Forma de Pagamento
        worksheet.getCell('A45').value = dados.forma_pagamento || '';
        worksheet.getCell('B45').value = dados.forma_pagamento || '';
        worksheet.getCell('C45').value = dados.forma_pagamento || '';
        worksheet.getCell('D45').value = dados.forma_pagamento || '';
        
        // Percentual
        worksheet.getCell('E45').value = dados.percentual_pagamento || 1;
        
        // Método de Pagamento
        worksheet.getCell('F45').value = dados.metodo_pagamento || '';
        worksheet.getCell('G45').value = dados.metodo_pagamento || '';
        worksheet.getCell('H45').value = dados.metodo_pagamento || '';
        
        // Valor Total do Pagamento
        const valorPagamento = totalGeral * (dados.percentual_pagamento || 1);
        worksheet.getCell('I45').value = valorPagamento;
        worksheet.getCell('J45').value = valorPagamento;
        worksheet.getCell('I45').numFmt = 'R$ #,##0.00';
        worksheet.getCell('J45').numFmt = 'R$ #,##0.00';
        
        // ============================================
        // GERAR ARQUIVO E ENVIAR
        // ============================================
        
        const buffer = await workbook.xlsx.writeBuffer();
        const nomeArquivo = `Ordem_Producao_${dados.num_pedido}_${Date.now()}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.setHeader('Content-Length', buffer.length);
        
        logger.info('[GERAR ORDEM EXCEL] Arquivo gerado com sucesso:', nomeArquivo);
        res.send(buffer);
        
    } catch (error) {
        logger.error('[GERAR ORDEM EXCEL] Erro ao gerar arquivo:', error);
        res.status(500).json({ 
            message: 'Erro ao gerar ordem de Produção em Excel', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});





