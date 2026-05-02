const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');

// Serviço de configurações da empresa
const { resolverCaminhoLogo } = require('../../_shared/services/empresa-config.service');

// Canvas é opcional - usado para código de barras no DANFE
let createCanvas = null;
try {
    createCanvas = require('canvas').createCanvas;
} catch (e) {
    console.warn('⚠️  Módulo canvas não instalado - Código de barras no DANFE não disponível');
}

/**
 * SERVIÇO DE GERAÇÃO DE DANFE
 * Gera DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) em PDF
 */

class DanfeService {

    /**
     * Gerar DANFE em PDF
     */
    async gerarDANFE(dadosNFe, caminhoSaida) {
        const dadosNormalizados = this.normalizarDadosNFe(dadosNFe || {});
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 10, bottom: 10, left: 10, right: 10 }
        });

        const stream = fs.createWriteStream(caminhoSaida);
        doc.pipe(stream);

        // Cabeçalho
        await this.desenharCabecalho(doc, dadosNormalizados);

        // Destinatário/Remetente
        this.desenharDestinatario(doc, dadosNormalizados);

        // Dados do produto/serviço
        this.desenharItens(doc, dadosNormalizados.itens);

        // Cálculo do imposto
        this.desenharImpostos(doc, dadosNormalizados.totais);

        // Transportador
        this.desenharTransportador(doc, dadosNormalizados.transporte);

        // Dados adicionais
        this.desenharDadosAdicionais(doc, dadosNormalizados.informacoesAdicionais);

        // Rodapé
        this.desenharRodape(doc);

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(caminhoSaida));
            stream.on('error', reject);
        });
    }

    /**
     * Desenhar cabeçalho do DANFE
     */
    async desenharCabecalho(doc, dados) {
        const { emitente, chaveAcesso, numeroNFe, serie, dataEmissao } = dados;
        const emitenteData = emitente && typeof emitente === 'object'
            ? emitente
            : {
                razaoSocial: dados?.razaoSocial || dados?.empresa_razao_social || dados?.empresa_nome || 'Emitente não informado',
                logo_url: dados?.logo_url || dados?.emitenteLogoUrl || '',
                logo: dados?.logo || dados?.logoPath || '',
                logradouro: dados?.logradouro || dados?.endereco || '',
                numero: dados?.numero || '',
                complemento: dados?.complemento || '',
                bairro: dados?.bairro || '',
                municipio: dados?.municipio || dados?.cidade || '',
                uf: dados?.uf || '',
                cep: dados?.cep || '',
                telefone: dados?.telefone || ''
            };

        // Retângulo principal
        doc.rect(10, 10, 575, 140).stroke();

        // Logo da empresa - Priorizar logo das configurações
        const basePath = path.join(__dirname, '..', '..', '..', 'public');
        let logoCarregada = false;

        // 1. Tentar logo das configurações (se emitente tiver logo_url)
        if (emitenteData?.logo_url) {
            const logoConfig = resolverCaminhoLogo({ logo_url: emitenteData.logo_url }, basePath);
            if (logoConfig && fs.existsSync(logoConfig)) {
                try {
                    doc.image(logoConfig, 15, 15, { width: 100, height: 80 });
                    logoCarregada = true;
                } catch (e) {
                    console.log('[DANFE] Erro ao carregar logo das configurações:', e.message);
                }
            }
        }

        // 2. Tentar logo do emitente (caminho direto)
        if (!logoCarregada && emitenteData?.logo && fs.existsSync(emitenteData.logo)) {
            try {
                doc.image(emitenteData.logo, 15, 15, { width: 100, height: 80 });
                logoCarregada = true;
            } catch (e) {
                console.log('[DANFE] Erro ao carregar logo do emitente:', e.message);
            }
        }

        // 3. Fallback para logo padrão
        if (!logoCarregada) {
            const logoPadrao = resolverCaminhoLogo({}, basePath);
            if (logoPadrao) {
                try {
                    doc.image(logoPadrao, 15, 15, { width: 100, height: 80 });
                } catch (e) {
                    console.log('[DANFE] Erro ao carregar logo padrão:', e.message);
                }
            }
        }

        // Dados do emitente
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(emitenteData.razaoSocial || 'Emitente não informado', 120, 20, { width: 220 });

        doc.fontSize(8).font('Helvetica');
        const enderecoBase = [emitenteData.logradouro, emitenteData.numero].filter(Boolean).join(', ');
        const enderecoEmitente = `${enderecoBase || 'Endereço não informado'}${emitenteData.complemento ? ' - ' + emitenteData.complemento : ''}`;
        doc.text(enderecoEmitente, 120, 40, { width: 220 });
        doc.text(`${emitenteData.bairro || '-'} - ${emitenteData.municipio || '-'}/${emitenteData.uf || '-'}`, 120, 52);
        doc.text(`CEP: ${this.formatarCEP(emitenteData.cep || '')}`, 120, 64);
        doc.text(`Fone: ${emitenteData.telefone || 'N/A'}`, 120, 76);

        // Box DANFE
        doc.rect(350, 10, 235, 80).stroke();
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('DANFE', 420, 20);
        doc.fontSize(8).font('Helvetica');
        doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', 360, 35, { width: 215, align: 'center' });

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Nº ${String(numeroNFe || dados.numero || dados.numero_nfe || '0').padStart(9, '0')}`, 360, 50, { width: 215, align: 'center' });
        doc.text(`Série ${String(serie || dados.serie || '1').padStart(3, '0')}`, 360, 63, { width: 215, align: 'center' });

        // Tipo de operação
        doc.rect(350, 95, 235, 25).stroke();
        doc.fontSize(8);
        doc.text('0 - ENTRADA', 360, 100);
        doc.text('1 - SAÍDA', 470, 100);

        // Checkbox tipo operação
        const tipoOp = dados.tipoOperacao === 1 ? 470 : 360;
        doc.fontSize(12).text('X', tipoOp + 60, 98);

        // Chave de acesso
        doc.rect(10, 95, 340, 55).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('CHAVE DE ACESSO', 15, 100);

        doc.fontSize(11).font('Courier');
        const chaveFormatada = this.formatarChaveAcesso(chaveAcesso);
        doc.text(chaveFormatada, 15, 112, { width: 330 });

        // QR Code
        try {
            const qrCodeDataURL = await QRCode.toDataURL(chaveAcesso);
            const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
            doc.image(qrBuffer, 495, 100, { width: 80, height: 80 });
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
        }

        // Natureza da operação
        doc.rect(10, 155, 280, 20).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('NATUREZA DA OPERAÇÃO', 15, 160);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(dados.naturezaOperacao || 'Venda de Mercadoria', 15, 168);

        // Protocolo de autorização
        doc.rect(295, 155, 290, 20).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', 300, 160);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(dados.numeroProtocolo || 'PENDENTE', 300, 168);

        // Inscrições
        doc.rect(10, 180, 190, 20).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('INSCRIÇÃO ESTADUAL', 15, 185);
        doc.fontSize(9);
        doc.text(emitenteData.ie || 'ISENTO', 15, 193);

        doc.rect(205, 180, 190, 20).stroke();
        doc.fontSize(7);
        doc.text('INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO', 210, 185);

        doc.rect(400, 180, 185, 20).stroke();
        doc.fontSize(7);
        doc.text('CNPJ', 405, 185);
        doc.fontSize(9);
        doc.text(this.formatarCNPJ(emitenteData.cnpj || ''), 405, 193);
    }

    normalizarDadosNFe(dadosNFe = {}) {
        const emitente = dadosNFe.emitente || {
            razaoSocial: dadosNFe.razaoSocial || dadosNFe.empresa_razao_social || dadosNFe.empresa_nome || 'Emitente não informado',
            cnpj: dadosNFe.cnpj || dadosNFe.empresa_cnpj || '',
            ie: dadosNFe.ie || dadosNFe.empresa_ie || '',
            logradouro: dadosNFe.logradouro || dadosNFe.endereco || dadosNFe.empresa_endereco || '',
            numero: dadosNFe.numero || '',
            complemento: dadosNFe.complemento || '',
            bairro: dadosNFe.bairro || dadosNFe.empresa_bairro || '',
            municipio: dadosNFe.municipio || dadosNFe.cidade || dadosNFe.empresa_cidade || '',
            uf: dadosNFe.uf || dadosNFe.empresa_uf || '',
            cep: dadosNFe.cep || dadosNFe.empresa_cep || '',
            telefone: dadosNFe.telefone || dadosNFe.empresa_telefone || '',
            logo_url: dadosNFe.logo_url || dadosNFe.emitenteLogoUrl || '',
            logo: dadosNFe.logo || dadosNFe.logoPath || ''
        };

        const destinatario = dadosNFe.destinatario || {
            nome: dadosNFe.destinatario || dadosNFe.cli_razao_social || dadosNFe.cli_nome || dadosNFe.cliente_nome || 'Destinatário não informado',
            cnpj: dadosNFe.cli_cnpj || dadosNFe.cliente_cnpj || '',
            cpf: dadosNFe.cli_cpf || dadosNFe.cliente_cpf || '',
            ie: dadosNFe.cli_ie || dadosNFe.cliente_ie || '',
            logradouro: dadosNFe.cli_endereco || dadosNFe.endereco_destinatario || dadosNFe.cliente_endereco || '',
            numero: dadosNFe.numero_destinatario || '',
            bairro: dadosNFe.cli_bairro || dadosNFe.cliente_bairro || '',
            municipio: dadosNFe.cli_cidade || dadosNFe.cliente_cidade || '',
            uf: dadosNFe.cli_uf || dadosNFe.cliente_estado || '',
            cep: dadosNFe.cli_cep || dadosNFe.cliente_cep || '',
            telefone: dadosNFe.cli_telefone || dadosNFe.cliente_telefone || ''
        };

        const itens = Array.isArray(dadosNFe.itens) ? dadosNFe.itens : [];
        const totais = dadosNFe.totais || {
            baseCalculoICMS: parseFloat(dadosNFe.base_calculo_icms || 0),
            valorICMS: parseFloat(dadosNFe.valor_icms || 0),
            baseCalculoST: parseFloat(dadosNFe.base_calculo_st || 0),
            valorST: parseFloat(dadosNFe.valor_icms_st || 0),
            valorProdutos: parseFloat(dadosNFe.valor_produtos || dadosNFe.valor || dadosNFe.valor_total || 0),
            valorFrete: parseFloat(dadosNFe.valor_frete || dadosNFe.frete || 0),
            valorSeguro: parseFloat(dadosNFe.valor_seguro || 0),
            valorDesconto: parseFloat(dadosNFe.valor_desconto || dadosNFe.desconto || 0),
            valorOutros: parseFloat(dadosNFe.outras_despesas || 0),
            valorIPI: parseFloat(dadosNFe.valor_ipi || 0),
            valorTotal: parseFloat(dadosNFe.valor_total || dadosNFe.valor || 0)
        };

        const transporte = dadosNFe.transporte || {
            modalidade: String(dadosNFe.modalidade_frete || dadosNFe.tipo_frete || '9'),
            placa: dadosNFe.placa_veiculo || '',
            transportadora: {
                nome: dadosNFe.transportadora_nome || dadosNFe.transportadora || ''
            }
        };

        return {
            ...dadosNFe,
            emitente,
            destinatario,
            itens,
            totais,
            transporte,
            chaveAcesso: dadosNFe.chaveAcesso || dadosNFe.chave_acesso || '',
            numeroNFe: dadosNFe.numeroNFe || dadosNFe.numero || dadosNFe.numero_nfe || '',
            serie: dadosNFe.serie || '1',
            dataEmissao: dadosNFe.dataEmissao || dadosNFe.data_emissao || new Date(),
            tipoOperacao: dadosNFe.tipoOperacao || dadosNFe.tipo_operacao || 1,
            naturezaOperacao: dadosNFe.naturezaOperacao || dadosNFe.natureza_operacao || 'Venda de Mercadoria',
            numeroProtocolo: dadosNFe.numeroProtocolo || dadosNFe.numero_protocolo || '',
            informacoesAdicionais: typeof dadosNFe.informacoesAdicionais === 'object'
                ? dadosNFe.informacoesAdicionais
                : { complementar: dadosNFe.informacoesAdicionais || dadosNFe.informacoes_complementares || dadosNFe.observacao || '' }
        };
    }

    /**
     * Desenhar dados do destinatário
     */
    desenharDestinatario(doc, dados) {
        const destinatario = dados.destinatario || {};
        let y = 205;

        // Título
        doc.rect(10, y, 575, 15).fill('#CCCCCC').stroke();
        doc.fillColor('#000000');
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('DESTINATÁRIO / REMETENTE', 15, y + 4);

        y += 15;

        // Nome/Razão Social
        doc.rect(10, y, 385, 18).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('NOME / RAZÃO SOCIAL', 15, y + 2);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(destinatario.nome || 'Destinatário não informado', 15, y + 10);

        // CNPJ/CPF
        doc.rect(400, y, 100, 18).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('CNPJ / CPF', 405, y + 2);
        doc.fontSize(9);
        const cnpjCpf = destinatario.cnpj ? this.formatarCNPJ(destinatario.cnpj) : this.formatarCPF(destinatario.cpf);
        doc.text(cnpjCpf, 405, y + 10);

        // Data de emissão
        doc.rect(505, y, 80, 18).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('DATA DE EMISSÃO', 510, y + 2);
        doc.fontSize(9);
        doc.text(this.formatarData(dados.dataEmissao), 510, y + 10);

        y += 18;

        // Endereço
        doc.rect(10, y, 385, 18).stroke();
        doc.fontSize(7).font('Helvetica');
        doc.text('ENDEREÇO', 15, y + 2);
        doc.fontSize(9);
        doc.text(`${destinatario.logradouro || 'Endereço não informado'}${destinatario.numero ? `, ${destinatario.numero}` : ''}`, 15, y + 10);

        // Bairro
        doc.rect(400, y, 100, 18).stroke();
        doc.fontSize(7);
        doc.text('BAIRRO / DISTRITO', 405, y + 2);
        doc.fontSize(9);
        doc.text(destinatario.bairro || '', 405, y + 10);

        // CEP
        doc.rect(505, y, 80, 18).stroke();
        doc.fontSize(7);
        doc.text('CEP', 510, y + 2);
        doc.fontSize(9);
        doc.text(this.formatarCEP(destinatario.cep), 510, y + 10);

        y += 18;

        // Município
        doc.rect(10, y, 270, 18).stroke();
        doc.fontSize(7);
        doc.text('MUNICÍPIO', 15, y + 2);
        doc.fontSize(9);
        doc.text(destinatario.municipio || '', 15, y + 10);

        // UF
        doc.rect(285, y, 30, 18).stroke();
        doc.fontSize(7);
        doc.text('UF', 290, y + 2);
        doc.fontSize(9);
        doc.text(destinatario.uf || '', 290, y + 10);
        // Telefone
        doc.rect(320, y, 100, 18).stroke();
        doc.fontSize(7);
        doc.text('TELEFONE', 325, y + 2);
        doc.fontSize(9);
        doc.text(destinatario.telefone || 'N/A', 325, y + 10);

        // IE
        doc.rect(425, y, 160, 18).stroke();
        doc.fontSize(7);
        doc.text('INSCRIÇÃO ESTADUAL', 430, y + 2);
        doc.fontSize(9);
        doc.text(destinatario.ie || 'ISENTO', 430, y + 10);
    }

    /**
     * Desenhar itens da nota
     */
    desenharItens(doc, itens = []) {
        let y = 287;

        // Cabeçalho da tabela
        doc.rect(10, y, 575, 15).fill('#CCCCCC').stroke();
        doc.fillColor('#000000');
        doc.fontSize(7).font('Helvetica-Bold');

        doc.text('CÓDIGO', 12, y + 4, { width: 50 });
        doc.text('DESCRIÇÃO', 65, y + 4, { width: 180 });
        doc.text('NCM', 250, y + 4, { width: 50 });
        doc.text('CFOP', 305, y + 4, { width: 30 });
        doc.text('UN', 340, y + 4, { width: 25 });
        doc.text('QUANT', 370, y + 4, { width: 40 });
        doc.text('VALOR UNIT', 415, y + 4, { width: 50 });
        doc.text('VALOR TOTAL', 470, y + 4, { width: 55 });
        doc.text('BC ICMS', 530, y + 4, { width: 50 });

        y += 15;

        // Itens
        doc.fontSize(7).font('Helvetica');
        itens.forEach((itemCalc) => {
            const item = itemCalc?.item || itemCalc || {};
            const totaisItem = itemCalc?.totais || {
                valorProduto: item.valorProduto || item.valor_total || item.subtotal || ((parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario || item.valor_unitario || item.preco_unitario) || 0))
            };
            const icmsItem = itemCalc?.icms || {
                baseCalculo: item.baseCalculoICMS || item.base_calculo_icms || 0
            };

            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            const altura = 18;
            doc.rect(10, y, 575, altura).stroke();

            // Linhas verticais
            doc.moveTo(62, y).lineTo(62, y + altura).stroke();
            doc.moveTo(247, y).lineTo(247, y + altura).stroke();
            doc.moveTo(302, y).lineTo(302, y + altura).stroke();
            doc.moveTo(337, y).lineTo(337, y + altura).stroke();
            doc.moveTo(367, y).lineTo(367, y + altura).stroke();
            doc.moveTo(412, y).lineTo(412, y + altura).stroke();
            doc.moveTo(467, y).lineTo(467, y + altura).stroke();
            doc.moveTo(527, y).lineTo(527, y + altura).stroke();

            doc.text(String(item.codigo || '').substring(0, 12), 12, y + 5, { width: 48 });
            doc.text(String(item.descricao || '').substring(0, 50), 65, y + 5, { width: 180 });
            doc.text(item.ncm || '', 250, y + 5);
            doc.text(item.cfop || '', 305, y + 5);
            doc.text(item.unidade || 'UN', 340, y + 5);
            doc.text(this.formatarNumero(item.quantidade, 2), 370, y + 5);
            doc.text(this.formatarMoeda(item.valorUnitario || item.valor_unitario || item.preco_unitario), 415, y + 5);
            doc.text(this.formatarMoeda(totaisItem.valorProduto), 470, y + 5);
            doc.text(this.formatarMoeda(icmsItem.baseCalculo || 0), 530, y + 5);

            y += altura;
        });
    }

    /**
     * Desenhar cálculo dos impostos
     */
    desenharImpostos(doc, totais = {}) {
        let y = doc.y + 10;

        if (y > 650) {
            doc.addPage();
            y = 50;
        }

        // Cabeçalho
        doc.rect(10, y, 575, 15).fill('#CCCCCC').stroke();
        doc.fillColor('#000000');
        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('CÁLCULO DO IMPOSTO', 15, y + 4);

        y += 15;

        // Valores
        doc.fontSize(8).font('Helvetica');
        const larguraColuna = 95;

        doc.rect(10, y, larguraColuna, 18).stroke();
        doc.text('BASE DE CÁLCULO DO ICMS', 12, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.baseCalculoICMS), 12, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna, y, larguraColuna, 18).stroke();
        doc.text('VALOR DO ICMS', 12 + larguraColuna, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorICMS), 12 + larguraColuna, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 2, y, larguraColuna, 18).stroke();
        doc.text('BASE DE CÁLCULO ICMS ST', 12 + larguraColuna * 2, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.baseCalculoST || 0), 12 + larguraColuna * 2, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 3, y, larguraColuna, 18).stroke();
        doc.text('VALOR DO ICMS ST', 12 + larguraColuna * 3, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorST || 0), 12 + larguraColuna * 3, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 4, y, larguraColuna, 18).stroke();
        doc.text('VALOR TOTAL DOS PRODUTOS', 12 + larguraColuna * 4, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorProdutos), 12 + larguraColuna * 4, y + 10);

        doc.rect(10 + larguraColuna * 5, y, larguraColuna, 18).stroke();
        doc.fontSize(8).font('Helvetica');
        doc.text('VALOR DO FRETE', 12 + larguraColuna * 5, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorFrete || 0), 12 + larguraColuna * 5, y + 10);

        y += 18;

        // Segunda linha
        doc.fontSize(8).font('Helvetica');
        doc.rect(10, y, larguraColuna, 18).stroke();
        doc.text('VALOR DO SEGURO', 12, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorSeguro || 0), 12, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna, y, larguraColuna, 18).stroke();
        doc.text('DESCONTO', 12 + larguraColuna, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorDesconto || 0), 12 + larguraColuna, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 2, y, larguraColuna, 18).stroke();
        doc.text('OUTRAS DESPESAS', 12 + larguraColuna * 2, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorOutros || 0), 12 + larguraColuna * 2, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 3, y, larguraColuna, 18).stroke();
        doc.text('VALOR DO IPI', 12 + larguraColuna * 3, y + 2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorIPI || 0), 12 + larguraColuna * 3, y + 10);

        doc.fontSize(8).font('Helvetica');
        doc.rect(10 + larguraColuna * 4, y, larguraColuna * 2, 18).stroke();
        doc.text('VALOR TOTAL DA NOTA', 12 + larguraColuna * 4, y + 2);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(this.formatarMoeda(totais.valorTotal), 12 + larguraColuna * 4, y + 8);
    }

    /**
     * Desenhar dados do transportador
     */
    desenharTransportador(doc, transporte) {
        let y = doc.y + 10;

        doc.rect(10, y, 575, 15).fill('#CCCCCC').stroke();
        doc.fillColor('#000000');
        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('TRANSPORTADOR / VOLUMES TRANSPORTADOS', 15, y + 4);

        y += 15;

        if (transporte && transporte.transportadora) {
            doc.fontSize(8).font('Helvetica');
            doc.rect(10, y, 300, 18).stroke();
            doc.text('RAZÃO SOCIAL', 12, y + 2);
            doc.fontSize(9);
            doc.text(transporte.transportadora.nome, 12, y + 10);

            doc.fontSize(8);
            doc.rect(315, y, 130, 18).stroke();
            doc.text('FRETE POR CONTA', 317, y + 2);
            doc.fontSize(9);
            const frete = transporte.modalidade === '0' ? '0-Emitente' :
                         transporte.modalidade === '1' ? '1-Destinatário' : '9-Sem Frete';
            doc.text(frete, 317, y + 10);

            doc.fontSize(8);
            doc.rect(450, y, 135, 18).stroke();
            doc.text('PLACA DO VEÍCULO', 452, y + 2);
            doc.fontSize(9);
            doc.text(transporte.placa || 'N/A', 452, y + 10);
        }
    }

    /**
     * Desenhar dados adicionais
     */
    desenharDadosAdicionais(doc, informacoes) {
        let y = doc.y + 10;

        doc.rect(10, y, 575, 15).fill('#CCCCCC').stroke();
        doc.fillColor('#000000');
        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('DADOS ADICIONAIS', 15, y + 4);

        y += 15;

        doc.fontSize(7).font('Helvetica');
        doc.rect(10, y, 575, 40).stroke();

        if (informacoes && informacoes.complementar) {
            doc.text(informacoes.complementar, 15, y + 5, { width: 560 });
        }
    }

    /**
     * Desenhar rodapé
     */
    desenharRodape(doc) {
        const y = 780;
        doc.fontSize(6).font('Helvetica');
        doc.text('Emitido via sistema Zyntra ERP', 10, y, {
            width: 575,
            align: 'center'
        });
    }

    // ============================================================
    // MÉTODOS AUXILIARES DE FORMATAÇÍO
    // ============================================================

    formatarChaveAcesso(chave) {
        return String(chave || '').replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/,
                            '$1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11');
    }

    formatarCNPJ(cnpj) {
        return String(cnpj || '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    formatarCPF(cpf) {
        return String(cpf || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    formatarCEP(cep) {
        return String(cep || '').replace(/(\d{5})(\d{3})/, '$1-$2');
    }

    formatarData(data) {
        const d = new Date(data);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(valor) || 0);
    }

    formatarNumero(valor, casas = 2) {
        return (parseFloat(valor) || 0).toFixed(casas);
    }
}

module.exports = new DanfeService();
