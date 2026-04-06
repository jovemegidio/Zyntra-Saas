/**
 * API de Documentos Fiscais Eletrônicos
 * ZYNTRA ERP v2.4.0 — Integração SEFAZ Real
 * 
 * Módulos:
 * - NFC-e (Nota Fiscal de Consumidor Eletrônica)
 * - CT-e (Conhecimento de Transporte Eletrônico)
 * - MDF-e (Manifesto Eletrônico de Documentos Fiscais)
 * 
 * Usa sefaz.service.js para comunicação SOAP real com certificado digital.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const builder = require('xmlbuilder2');

// Serviços reais
const sefazService = require('../modules/Faturamento/services/sefaz.service');
const certificadoService = require('../modules/Faturamento/services/certificado.service');
const nfeConfig = require('../modules/Faturamento/config/nfe.config');

// Middleware de autenticação — verifica se req.user foi populado pelo auth-central
// Em produção, authenticateToken do auth-central.js é aplicado globalmente pelo server.js
const authenticateToken = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autenticado. Token não fornecido ou inválido.', code: 'AUTH_MISSING' });
    }
    next();
};

// ==========================================
// INICIALIZAÇÃO DO CERTIFICADO
// ==========================================
let certificadoOk = false;
let certificadoErro = null;

async function inicializarCertificado() {
    const certPath = process.env.NFE_CERT_PATH;
    const certPassword = process.env.NFE_CERT_PASSWORD;
    
    if (!certPath || !certPassword) {
        certificadoErro = 'NFE_CERT_PATH e/ou NFE_CERT_PASSWORD não configurados no .env';
        console.warn('[DOCS-FISCAIS] ⚠ Certificado digital não configurado:', certificadoErro);
        return;
    }
    
    try {
        const fullPath = path.isAbsolute(certPath) ? certPath : path.join(process.cwd(), certPath);
        const info = await certificadoService.carregarCertificadoA1(fullPath, certPassword);
        certificadoOk = true;
        console.log('[DOCS-FISCAIS] ✓ Certificado digital carregado:', info.subject?.find(a => a.name === 'commonName')?.value || 'OK');
        console.log('[DOCS-FISCAIS]   Validade:', new Date(info.validade.inicio).toLocaleDateString('pt-BR'), '→', new Date(info.validade.fim).toLocaleDateString('pt-BR'));
    } catch (error) {
        certificadoErro = error.message;
        console.error('[DOCS-FISCAIS] ✗ Erro ao carregar certificado:', error.message);
    }
}

// Carregar certificado ao importar o módulo
inicializarCertificado();

// Middleware que verifica certificado para rotas que precisam de SEFAZ
function requireCertificado(req, res, next) {
    if (!certificadoOk) {
        return res.status(503).json({
            success: false,
            message: 'Certificado digital não disponível',
            erro: certificadoErro || 'Certificado não foi carregado',
            nota: 'Configure NFE_CERT_PATH e NFE_CERT_PASSWORD no arquivo .env'
        });
    }
    next();
}

// Obter UF da empresa (do .env ou req)
function getUF(req) {
    return req.body?.uf || req.query?.uf || process.env.NFE_UF || 'SP';
}

// Obter CNPJ do emitente
function getCNPJ() {
    return (process.env.NFE_CNPJ || '').replace(/\D/g, '');
}

// Obter ambiente textual
function getAmbienteText() {
    return parseInt(nfeConfig.ambiente) === 1 ? 'producao' : 'homologacao';
}

// ==========================================
// NFC-e - NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
// ==========================================

/**
 * Emitir NFC-e
 * Documento fiscal para vendas ao consumidor final (varejo)
 * Substitui o cupom fiscal (ECF)
 */
router.post('/nfce/emitir', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const {
            cliente_cpf,
            cliente_nome,
            itens,
            forma_pagamento,
            valor_total,
            valor_desconto,
            valor_troco
        } = req.body;
        
        // Validações básicas
        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Itens são obrigatórios para emissão de NFC-e'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        if (!cnpj) {
            return res.status(400).json({
                success: false,
                message: 'CNPJ do emitente não configurado (NFE_CNPJ no .env)'
            });
        }
        
        // Gerar número da NFC-e
        const numeroNFCe = Date.now().toString().slice(-8);
        const serie = '1';
        const chaveAcesso = gerarChaveAcesso('nfce', numeroNFCe, serie, uf, cnpj);
        
        // Construir XML da NFC-e
        const xmlNFCe = construirXmlNFCe({
            chaveAcesso, numeroNFCe, serie, cnpj, uf,
            cliente_cpf, cliente_nome, itens,
            forma_pagamento, valor_total, valor_desconto, valor_troco
        });
        
        // Enviar à SEFAZ
        const resultado = await sefazService.autorizarNFe(xmlNFCe, uf);
        
        // Gerar QR Code URL real
        const qrcodeUrl = gerarQRCodeNFCe(chaveAcesso, uf);
        
        res.status(201).json({
            success: resultado.autorizado,
            message: resultado.autorizado ? 'NFC-e autorizada pela SEFAZ' : `NFC-e rejeitada: ${resultado.motivo}`,
            nfce: {
                numero: numeroNFCe,
                serie: serie,
                chave_acesso: resultado.chaveAcesso || chaveAcesso,
                protocolo: resultado.numeroProtocolo,
                status: resultado.autorizado ? 'autorizada' : 'rejeitada',
                codigo_status: resultado.codigoStatus,
                motivo: resultado.motivo,
                qrcode_url: qrcodeUrl,
                danfce_url: null,
                cliente: { cpf: cliente_cpf, nome: cliente_nome },
                valor_total: valor_total,
                data_emissao: new Date().toISOString(),
                ambiente: getAmbienteText()
            }
        });
        
    } catch (error) {
        console.error('Erro ao emitir NFC-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * Cancelar NFC-e
 */
router.post('/nfce/:chave/cancelar', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const { chave } = req.params;
        const { justificativa, protocolo } = req.body;
        
        if (!justificativa || justificativa.length < 15) {
            return res.status(400).json({
                success: false,
                message: 'Justificativa deve ter no mínimo 15 caracteres'
            });
        }
        
        if (!protocolo) {
            return res.status(400).json({
                success: false,
                message: 'Número do protocolo de autorização é obrigatório para cancelamento'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        const resultado = await sefazService.cancelarNFe(chave, protocolo, justificativa, uf, cnpj);
        
        res.json({
            success: resultado.sucesso,
            message: resultado.sucesso ? 'NFC-e cancelada com sucesso' : `Cancelamento rejeitado: ${resultado.motivo}`,
            protocolo: resultado.numeroProtocolo,
            chave_acesso: chave,
            codigo_status: resultado.codigoStatus,
            motivo: resultado.motivo,
            ambiente: getAmbienteText()
        });
        
    } catch (error) {
        console.error('Erro ao cancelar NFC-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ==========================================
// CT-e - CONHECIMENTO DE TRANSPORTE ELETRÔNICO
// ==========================================

/**
 * Emitir CT-e
 * Documento fiscal para prestação de serviço de transporte
 */
router.post('/cte/emitir', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const {
            remetente,
            destinatario,
            tomador,
            nfes_referenciadas,
            modal,
            tipo_servico,
            municipio_inicio,
            municipio_fim,
            valor_prestacao,
            peso_bruto,
            quantidade_volumes
        } = req.body;
        
        // Validações
        if (!remetente || !destinatario || !valor_prestacao) {
            return res.status(400).json({
                success: false,
                message: 'Remetente, destinatário e valor são obrigatórios'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        if (!cnpj) {
            return res.status(400).json({
                success: false,
                message: 'CNPJ do emitente não configurado (NFE_CNPJ no .env)'
            });
        }
        
        const numeroCTe = Date.now().toString().slice(-8);
        const serie = '1';
        const chaveAcesso = gerarChaveAcesso('cte', numeroCTe, serie, uf, cnpj);
        
        // Construir XML do CT-e
        const xmlCTe = construirXmlCTe({
            chaveAcesso, numeroCTe, serie, cnpj, uf,
            remetente, destinatario, tomador,
            nfes_referenciadas, modal, tipo_servico,
            municipio_inicio, municipio_fim,
            valor_prestacao, peso_bruto, quantidade_volumes
        });
        
        // Enviar à SEFAZ (CT-e usa o mesmo webservice de autorização)
        const resultado = await sefazService.autorizarNFe(xmlCTe, uf);
        
        res.status(201).json({
            success: resultado.autorizado,
            message: resultado.autorizado ? 'CT-e autorizado pela SEFAZ' : `CT-e rejeitado: ${resultado.motivo}`,
            cte: {
                numero: numeroCTe,
                serie: serie,
                chave_acesso: resultado.chaveAcesso || chaveAcesso,
                protocolo: resultado.numeroProtocolo,
                status: resultado.autorizado ? 'autorizado' : 'rejeitado',
                codigo_status: resultado.codigoStatus,
                motivo: resultado.motivo,
                modal: modal || 'rodoviario',
                tipo_servico: tipo_servico || 'normal',
                remetente: remetente,
                destinatario: destinatario,
                tomador: tomador || 'remetente',
                valor: valor_prestacao,
                peso: peso_bruto,
                volumes: quantidade_volumes,
                nfes: nfes_referenciadas || [],
                data_emissao: new Date().toISOString(),
                ambiente: getAmbienteText()
            }
        });
        
    } catch (error) {
        console.error('Erro ao emitir CT-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * Cancelar CT-e
 */
router.post('/cte/:chave/cancelar', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const { chave } = req.params;
        const { justificativa, protocolo } = req.body;
        
        if (!justificativa || justificativa.length < 15) {
            return res.status(400).json({
                success: false,
                message: 'Justificativa deve ter no mínimo 15 caracteres'
            });
        }
        
        if (!protocolo) {
            return res.status(400).json({
                success: false,
                message: 'Protocolo de autorização é obrigatório para cancelamento'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        const resultado = await sefazService.cancelarNFe(chave, protocolo, justificativa, uf, cnpj);
        
        res.json({
            success: resultado.sucesso,
            message: resultado.sucesso ? 'CT-e cancelado com sucesso' : `Cancelamento rejeitado: ${resultado.motivo}`,
            protocolo: resultado.numeroProtocolo,
            chave_acesso: chave,
            codigo_status: resultado.codigoStatus,
            motivo: resultado.motivo,
            ambiente: getAmbienteText()
        });
        
    } catch (error) {
        console.error('Erro ao cancelar CT-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ==========================================
// MDF-e - MANIFESTO ELETRÔNICO DE DOCUMENTOS FISCAIS
// ==========================================

/**
 * Emitir MDF-e
 * Documento fiscal que vincula documentos fiscais transportados
 */
router.post('/mdfe/emitir', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const {
            uf_inicio,
            uf_fim,
            municipio_carregamento,
            municipio_descarregamento,
            veiculo_placa,
            veiculo_rntrc,
            condutor_cpf,
            condutor_nome,
            documentos,
            valor_carga,
            peso_bruto
        } = req.body;
        
        // Validações
        if (!uf_inicio || !uf_fim || !veiculo_placa) {
            return res.status(400).json({
                success: false,
                message: 'UF início/fim e placa do veículo são obrigatórios'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        if (!cnpj) {
            return res.status(400).json({
                success: false,
                message: 'CNPJ do emitente não configurado (NFE_CNPJ no .env)'
            });
        }
        
        const numeroMDFe = Date.now().toString().slice(-8);
        const serie = '1';
        const chaveAcesso = gerarChaveAcesso('mdfe', numeroMDFe, serie, uf, cnpj);
        
        // Construir XML do MDF-e
        const xmlMDFe = construirXmlMDFe({
            chaveAcesso, numeroMDFe, serie, cnpj, uf,
            uf_inicio, uf_fim,
            municipio_carregamento, municipio_descarregamento,
            veiculo_placa, veiculo_rntrc,
            condutor_cpf, condutor_nome,
            documentos, valor_carga, peso_bruto
        });
        
        // Enviar à SEFAZ
        const resultado = await sefazService.autorizarNFe(xmlMDFe, uf);
        
        res.status(201).json({
            success: resultado.autorizado,
            message: resultado.autorizado ? 'MDF-e autorizado pela SEFAZ' : `MDF-e rejeitado: ${resultado.motivo}`,
            mdfe: {
                numero: numeroMDFe,
                serie: serie,
                chave_acesso: resultado.chaveAcesso || chaveAcesso,
                protocolo: resultado.numeroProtocolo,
                status: resultado.autorizado ? 'autorizado' : 'rejeitado',
                codigo_status: resultado.codigoStatus,
                motivo: resultado.motivo,
                uf_inicio: uf_inicio,
                uf_fim: uf_fim,
                municipio_carregamento: municipio_carregamento,
                municipio_descarregamento: municipio_descarregamento,
                veiculo: {
                    placa: veiculo_placa,
                    rntrc: veiculo_rntrc
                },
                condutor: {
                    cpf: condutor_cpf,
                    nome: condutor_nome
                },
                documentos_vinculados: documentos?.length || 0,
                valor_carga: valor_carga,
                peso_bruto: peso_bruto,
                data_emissao: new Date().toISOString(),
                ambiente: getAmbienteText()
            }
        });
        
    } catch (error) {
        console.error('Erro ao emitir MDF-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * Encerrar MDF-e
 */
router.post('/mdfe/:chave/encerrar', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const { chave } = req.params;
        const { municipio_encerramento, uf_encerramento } = req.body;
        
        if (!municipio_encerramento || !uf_encerramento) {
            return res.status(400).json({
                success: false,
                message: 'Município e UF de encerramento são obrigatórios'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        const codigoUF = nfeConfig.estados[uf_encerramento]?.codigo || nfeConfig.estados[uf]?.codigo;
        
        // Construir evento de encerramento MDF-e
        const xmlEvento = construirEventoEncerramentoMDFe({
            chaveAcesso: chave, cnpj, codigoUF,
            municipio_encerramento, uf_encerramento
        });
        
        const resultado = await sefazService.enviarEvento(xmlEvento, uf);
        
        res.json({
            success: resultado.sucesso,
            message: resultado.sucesso ? 'MDF-e encerrado com sucesso' : `Encerramento rejeitado: ${resultado.motivo}`,
            protocolo: resultado.numeroProtocolo,
            chave_acesso: chave,
            codigo_status: resultado.codigoStatus,
            motivo: resultado.motivo,
            municipio: municipio_encerramento,
            uf: uf_encerramento,
            data_encerramento: new Date().toISOString(),
            ambiente: getAmbienteText()
        });
        
    } catch (error) {
        console.error('Erro ao encerrar MDF-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

/**
 * Cancelar MDF-e
 */
router.post('/mdfe/:chave/cancelar', authenticateToken, requireCertificado, async (req, res) => {
    try {
        const { chave } = req.params;
        const { justificativa, protocolo } = req.body;
        
        if (!justificativa || justificativa.length < 15) {
            return res.status(400).json({
                success: false,
                message: 'Justificativa deve ter no mínimo 15 caracteres'
            });
        }
        
        if (!protocolo) {
            return res.status(400).json({
                success: false,
                message: 'Protocolo de autorização é obrigatório para cancelamento'
            });
        }
        
        const uf = getUF(req);
        const cnpj = getCNPJ();
        
        const resultado = await sefazService.cancelarNFe(chave, protocolo, justificativa, uf, cnpj);
        
        res.json({
            success: resultado.sucesso,
            message: resultado.sucesso ? 'MDF-e cancelado com sucesso' : `Cancelamento rejeitado: ${resultado.motivo}`,
            protocolo: resultado.numeroProtocolo,
            chave_acesso: chave,
            codigo_status: resultado.codigoStatus,
            motivo: resultado.motivo,
            ambiente: getAmbienteText()
        });
        
    } catch (error) {
        console.error('Erro ao cancelar MDF-e:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ==========================================
// CONSULTAS
// ==========================================

router.get('/status-servico/:tipo', authenticateToken, requireCertificado, async (req, res) => {
    const { tipo } = req.params;
    const uf = getUF(req);
    
    try {
        const resultado = await sefazService.consultarStatusServico(uf);
        
        res.json({
            success: true,
            tipo: tipo.toUpperCase(),
            uf: uf,
            status: resultado.online ? 'disponivel' : 'indisponivel',
            codigo_status: resultado.codigoStatus,
            motivo: resultado.motivo,
            ambiente: getAmbienteText(),
            ultima_verificacao: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao consultar status:', error);
        res.json({
            success: false,
            tipo: tipo.toUpperCase(),
            uf: uf,
            status: 'erro',
            erro: error.message,
            ambiente: getAmbienteText(),
            ultima_verificacao: new Date().toISOString()
        });
    }
});

router.get('/consultar/:tipo/:chave', authenticateToken, requireCertificado, async (req, res) => {
    const { tipo, chave } = req.params;
    
    try {
        const uf = getUF(req);
        const resultado = await sefazService.consultarProtocolo(chave, uf);
        
        res.json({
            success: true,
            tipo: tipo.toUpperCase(),
            chave_acesso: chave,
            situacao: resultado.situacao || 'consultada',
            codigo_status: resultado.codigoStatus,
            protocolo: resultado.numeroProtocolo,
            ambiente: getAmbienteText()
        });
    } catch (error) {
        console.error('Erro ao consultar documento:', error);
        res.status(500).json({
            success: false,
            tipo: tipo.toUpperCase(),
            chave_acesso: chave,
            erro: error.message
        });
    }
});

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Gerar chave de acesso com formato oficial SEFAZ (44 dígitos)
 * Layout: cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + cDV
 */
function gerarChaveAcesso(tipo, numero, serie, uf, cnpj) {
    const estado = nfeConfig.estados[uf];
    const cuf = estado ? String(estado.codigo).padStart(2, '0') : '35';
    const now = new Date();
    const aamm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
    const cnpjLimpo = (cnpj || '').replace(/\D/g, '').padStart(14, '0');
    const mod = tipo === 'nfce' ? '65' : tipo === 'cte' ? '57' : tipo === 'mdfe' ? '58' : '55';
    const seriePad = String(serie).padStart(3, '0');
    const numPad = String(numero).padStart(9, '0');
    const tpEmis = '1'; // Emissão normal
    const cNF = String(crypto.randomInt(10000000, 99999999));
    
    const chaveSemDV = `${cuf}${aamm}${cnpjLimpo}${mod}${seriePad}${numPad}${tpEmis}${cNF}`;
    const dv = calcularDVChaveAcesso(chaveSemDV);
    
    return `${chaveSemDV}${dv}`;
}

/**
 * Calcular dígito verificador da chave de acesso (módulo 11)
 */
function calcularDVChaveAcesso(chave) {
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    let pesoIndex = 0;
    
    for (let i = chave.length - 1; i >= 0; i--) {
        soma += parseInt(chave[i]) * pesos[pesoIndex % pesos.length];
        pesoIndex++;
    }
    
    const resto = soma % 11;
    return resto < 2 ? '0' : String(11 - resto);
}

/**
 * Gerar QR Code URL para NFC-e (formato real por estado)
 */
function gerarQRCodeNFCe(chaveAcesso, uf) {
    const ambiente = parseInt(nfeConfig.ambiente);
    const cscId = process.env.NFE_CSC_ID || '1';
    const cscToken = process.env.NFE_CSC_TOKEN || '';
    
    // URLs de consulta NFC-e por estado (produção e homologação)
    const urlsConsultaNFCe = {
        producao: {
            'SP': 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica',
            'MG': 'https://nfce.fazenda.mg.gov.br/portalnfce',
            'RJ': 'https://www.nfce.fazenda.rj.gov.br/consulta',
            'RS': 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx',
            'PR': 'https://www.sefa.pr.gov.br/NFCE/NFCEValidator',
            'BA': 'https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx',
            'SC': 'https://sat.sef.sc.gov.br/nfce/consulta',
            'GO': 'https://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/consulta',
            'PE': 'https://nfce.sefaz.pe.gov.br/nfce/consulta',
            'CE': 'https://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html',
            'MT': 'https://www.sefaz.mt.gov.br/nfce/consultanfce',
            'MS': 'https://www.dfe.ms.gov.br/nfce'
        },
        homologacao: {
            'SP': 'https://homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica',
            'MG': 'https://hnfce.fazenda.mg.gov.br/portalnfce',
            'RJ': 'https://www.nfce.fazenda.rj.gov.br/consulta',
            'RS': 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx',
            'PR': 'https://homologacao.sefa.pr.gov.br/NFCE/NFCEValidator',
            'BA': 'https://hnfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx',
            'SC': 'https://hom.sat.sef.sc.gov.br/nfce/consulta',
            'GO': 'https://homolog.sefaz.go.gov.br/nfeweb/sites/nfce/consulta',
            'PE': 'https://nfcehomolog.sefaz.pe.gov.br/nfce/consulta',
            'CE': 'https://nfceh.sefaz.ce.gov.br/pages/ShowNFCe.html',
            'MT': 'https://homologacao.sefaz.mt.gov.br/nfce/consultanfce',
            'MS': 'https://hom.dfe.ms.gov.br/nfce'
        }
    };
    
    const ambienteKey = ambiente === 1 ? 'producao' : 'homologacao';
    const baseUrl = urlsConsultaNFCe[ambienteKey][uf] || urlsConsultaNFCe[ambienteKey]['SP'];
    
    // Gerar hash do QR Code: SHA-1(chave + versão QR + tpAmb + csc)
    const qrCodeData = `${chaveAcesso}|2|${ambiente}|${cscId}`;
    const hashQRCode = cscToken 
        ? crypto.createHash('sha1').update(qrCodeData + cscToken).digest('hex').toUpperCase()
        : '';
    
    return `${baseUrl}?p=${chaveAcesso}|2|${ambiente}|${cscId}|${hashQRCode}`;
}

/**
 * Construir XML simplificado de NFC-e (modelo 65)
 */
function construirXmlNFCe(dados) {
    const { chaveAcesso, numeroNFCe, serie, cnpj, uf, cliente_cpf, cliente_nome, itens, forma_pagamento, valor_total, valor_desconto, valor_troco } = dados;
    const codigoUF = nfeConfig.estados[uf]?.codigo || 35;
    const ambiente = parseInt(nfeConfig.ambiente);
    
    const root = builder.create({ version: '1.0', encoding: 'UTF-8' })
        .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
        .ele('infNFe', { versao: '4.00', Id: `NFe${chaveAcesso}` });
    
    // Identificação
    root.ele('ide')
        .ele('cUF').txt(String(codigoUF)).up()
        .ele('cNF').txt(chaveAcesso.slice(35, 43)).up()
        .ele('natOp').txt('VENDA AO CONSUMIDOR').up()
        .ele('mod').txt('65').up()
        .ele('serie').txt(serie).up()
        .ele('nNF').txt(numeroNFCe).up()
        .ele('dhEmi').txt(new Date().toISOString()).up()
        .ele('tpNF').txt('1').up()
        .ele('idDest').txt('1').up()
        .ele('cMunFG').txt('3550308').up() // São Paulo default
        .ele('tpImp').txt('4').up() // DANFCE
        .ele('tpEmis').txt('1').up()
        .ele('cDV').txt(chaveAcesso.slice(-1)).up()
        .ele('tpAmb').txt(String(ambiente)).up()
        .ele('finNFe').txt('1').up()
        .ele('indFinal').txt('1').up()
        .ele('indPres').txt('1').up()
        .ele('procEmi').txt('0').up()
        .ele('verProc').txt('ZYNTRA-2.4.0').up();
    
    // Emitente
    root.ele('emit')
        .ele('CNPJ').txt(cnpj).up()
        .ele('CRT').txt('3').up(); // Regime Normal
    
    // Destinatário (opcional para NFC-e até R$ 200)
    if (cliente_cpf) {
        const dest = root.ele('dest');
        dest.ele('CPF').txt(cliente_cpf.replace(/\D/g, '')).up();
        if (cliente_nome) dest.ele('xNome').txt(cliente_nome).up();
        dest.ele('indIEDest').txt('9').up(); // Não contribuinte
    }
    
    // Itens
    (itens || []).forEach((item, i) => {
        const det = root.ele('det', { nItem: String(i + 1) });
        det.ele('prod')
            .ele('cProd').txt(item.codigo || String(i + 1)).up()
            .ele('cEAN').txt(item.ean || 'SEM GTIN').up()
            .ele('xProd').txt(item.descricao || `Item ${i + 1}`).up()
            .ele('NCM').txt(item.ncm || '00000000').up()
            .ele('CFOP').txt(item.cfop || '5102').up()
            .ele('uCom').txt(item.unidade || 'UN').up()
            .ele('qCom').txt(String(item.quantidade || 1)).up()
            .ele('vUnCom').txt(String(item.valor_unitario || 0)).up()
            .ele('vProd').txt(String((item.quantidade || 1) * (item.valor_unitario || 0))).up()
            .ele('cEANTrib').txt(item.ean || 'SEM GTIN').up()
            .ele('uTrib').txt(item.unidade || 'UN').up()
            .ele('qTrib').txt(String(item.quantidade || 1)).up()
            .ele('vUnTrib').txt(String(item.valor_unitario || 0)).up()
            .ele('indTot').txt('1').up();
        
        det.ele('imposto')
            .ele('ICMS').ele('ICMS00')
            .ele('orig').txt('0').up()
            .ele('CST').txt('00').up()
            .ele('modBC').txt('0').up()
            .ele('vBC').txt(String((item.quantidade || 1) * (item.valor_unitario || 0))).up()
            .ele('pICMS').txt(String(item.aliq_icms || 0)).up()
            .ele('vICMS').txt('0.00').up();
    });
    
    // Totais
    root.ele('total').ele('ICMSTot')
        .ele('vBC').txt('0.00').up()
        .ele('vICMS').txt('0.00').up()
        .ele('vICMSDeson').txt('0.00').up()
        .ele('vFCP').txt('0.00').up()
        .ele('vBCST').txt('0.00').up()
        .ele('vST').txt('0.00').up()
        .ele('vFCPST').txt('0.00').up()
        .ele('vFCPSTRet').txt('0.00').up()
        .ele('vProd').txt(String(valor_total || 0)).up()
        .ele('vFrete').txt('0.00').up()
        .ele('vSeg').txt('0.00').up()
        .ele('vDesc').txt(String(valor_desconto || 0)).up()
        .ele('vII').txt('0.00').up()
        .ele('vIPI').txt('0.00').up()
        .ele('vIPIDevol').txt('0.00').up()
        .ele('vPIS').txt('0.00').up()
        .ele('vCOFINS').txt('0.00').up()
        .ele('vOutro').txt('0.00').up()
        .ele('vNF').txt(String(valor_total || 0)).up();
    
    // Pagamento
    const pag = root.ele('pag');
    const detPag = pag.ele('detPag');
    const tPag = forma_pagamento === 'dinheiro' ? '01' : forma_pagamento === 'cartao_credito' ? '03' : forma_pagamento === 'cartao_debito' ? '04' : forma_pagamento === 'pix' ? '17' : '01';
    detPag.ele('tPag').txt(tPag).up();
    detPag.ele('vPag').txt(String(valor_total || 0)).up();
    if (valor_troco) {
        pag.ele('vTroco').txt(String(valor_troco)).up();
    }
    
    return root.end({ prettyPrint: false });
}

/**
 * Construir XML simplificado de CT-e (modelo 57)
 */
function construirXmlCTe(dados) {
    const { chaveAcesso, numeroCTe, serie, cnpj, uf, remetente, destinatario, tomador, nfes_referenciadas, modal, tipo_servico, municipio_inicio, municipio_fim, valor_prestacao, peso_bruto, quantidade_volumes } = dados;
    const codigoUF = nfeConfig.estados[uf]?.codigo || 35;
    const ambiente = parseInt(nfeConfig.ambiente);
    
    const root = builder.create({ version: '1.0', encoding: 'UTF-8' })
        .ele('CTe', { xmlns: 'http://www.portalfiscal.inf.br/cte' })
        .ele('infCte', { versao: '4.00', Id: `CTe${chaveAcesso}` });
    
    root.ele('ide')
        .ele('cUF').txt(String(codigoUF)).up()
        .ele('cCT').txt(chaveAcesso.slice(35, 43)).up()
        .ele('CFOP').txt('5353').up() // Transporte de carga
        .ele('natOp').txt('PRESTACAO DE SERVICO DE TRANSPORTE').up()
        .ele('mod').txt('57').up()
        .ele('serie').txt(serie).up()
        .ele('nCT').txt(numeroCTe).up()
        .ele('dhEmi').txt(new Date().toISOString()).up()
        .ele('tpImp').txt('1').up()
        .ele('tpEmis').txt('1').up()
        .ele('cDV').txt(chaveAcesso.slice(-1)).up()
        .ele('tpAmb').txt(String(ambiente)).up()
        .ele('tpCTe').txt('0').up() // Normal
        .ele('procEmi').txt('0').up()
        .ele('verProc').txt('ZYNTRA-2.4.0').up()
        .ele('modal').txt(modal === 'rodoviario' ? '01' : modal === 'aereo' ? '02' : modal === 'aquaviario' ? '03' : modal === 'ferroviario' ? '04' : '01').up()
        .ele('tpServ').txt(tipo_servico === 'subcontratacao' ? '1' : tipo_servico === 'redespacho' ? '2' : '0').up();
    
    // Emitente
    root.ele('emit')
        .ele('CNPJ').txt(cnpj).up()
        .ele('CRT').txt('3').up();
    
    // Remetente
    if (remetente) {
        const rem = root.ele('rem');
        if (remetente.cnpj) rem.ele('CNPJ').txt(remetente.cnpj.replace(/\D/g, '')).up();
        if (remetente.nome) rem.ele('xNome').txt(remetente.nome).up();
    }
    
    // Destinatário
    if (destinatario) {
        const dest = root.ele('dest');
        if (destinatario.cnpj) dest.ele('CNPJ').txt(destinatario.cnpj.replace(/\D/g, '')).up();
        else if (destinatario.cpf) dest.ele('CPF').txt(destinatario.cpf.replace(/\D/g, '')).up();
        if (destinatario.nome) dest.ele('xNome').txt(destinatario.nome).up();
    }
    
    // Valores
    root.ele('vPrest')
        .ele('vTPrest').txt(String(valor_prestacao || 0)).up()
        .ele('vRec').txt(String(valor_prestacao || 0)).up();
    
    // Informações da carga
    root.ele('infCTeNorm')
        .ele('infCarga')
        .ele('vCarga').txt(String(valor_prestacao || 0)).up()
        .ele('proPred').txt('MERCADORIA').up()
        .ele('infQ')
        .ele('cUnid').txt('01').up() // KG
        .ele('tpMed').txt('PESO BRUTO').up()
        .ele('qCarga').txt(String(peso_bruto || 0)).up();
    
    // NF-es referenciadas
    if (nfes_referenciadas && nfes_referenciadas.length > 0) {
        const infDoc = root.ele('infDoc');
        nfes_referenciadas.forEach(chave => {
            infDoc.ele('infNFe').ele('chave').txt(chave).up();
        });
    }
    
    return root.end({ prettyPrint: false });
}

/**
 * Construir XML simplificado de MDF-e (modelo 58)
 */
function construirXmlMDFe(dados) {
    const { chaveAcesso, numeroMDFe, serie, cnpj, uf, uf_inicio, uf_fim, municipio_carregamento, municipio_descarregamento, veiculo_placa, veiculo_rntrc, condutor_cpf, condutor_nome, documentos, valor_carga, peso_bruto } = dados;
    const codigoUF = nfeConfig.estados[uf]?.codigo || 35;
    const codigoUFInicio = nfeConfig.estados[uf_inicio]?.codigo || codigoUF;
    const codigoUFFim = nfeConfig.estados[uf_fim]?.codigo || codigoUF;
    const ambiente = parseInt(nfeConfig.ambiente);
    
    const root = builder.create({ version: '1.0', encoding: 'UTF-8' })
        .ele('MDFe', { xmlns: 'http://www.portalfiscal.inf.br/mdfe' })
        .ele('infMDFe', { versao: '3.00', Id: `MDFe${chaveAcesso}` });
    
    root.ele('ide')
        .ele('cUF').txt(String(codigoUF)).up()
        .ele('tpAmb').txt(String(ambiente)).up()
        .ele('tpEmit').txt('1').up() // Prestador serviço transporte
        .ele('tpTransp').txt('1').up() // ETC
        .ele('mod').txt('58').up()
        .ele('serie').txt(serie).up()
        .ele('nMDF').txt(numeroMDFe).up()
        .ele('cMDF').txt(chaveAcesso.slice(35, 43)).up()
        .ele('cDV').txt(chaveAcesso.slice(-1)).up()
        .ele('modal').txt('1').up() // Rodoviário
        .ele('dhEmi').txt(new Date().toISOString()).up()
        .ele('tpEmis').txt('1').up()
        .ele('procEmi').txt('0').up()
        .ele('verProc').txt('ZYNTRA-2.4.0').up()
        .ele('UFIni').txt(uf_inicio).up()
        .ele('UFFim').txt(uf_fim).up();
    
    // Emitente
    root.ele('emit')
        .ele('CNPJ').txt(cnpj).up();
    
    // Informações do modal rodoviário
    const rodo = root.ele('infModal', { versaoModal: '3.00' })
        .ele('rodo');
    
    if (veiculo_rntrc) rodo.ele('RNTRC').txt(veiculo_rntrc).up();
    
    // Veículo de tração
    const veiTrac = rodo.ele('veicTracao');
    veiTrac.ele('placa').txt(veiculo_placa.replace(/\W/g, '')).up();
    if (veiculo_rntrc) veiTrac.ele('RNTRC').txt(veiculo_rntrc).up();
    veiTrac.ele('tpRod').txt('02').up(); // Truck
    veiTrac.ele('tpCar').txt('00').up(); // Não aplicável
    veiTrac.ele('UF').txt(uf).up();
    
    // Condutor
    if (condutor_cpf && condutor_nome) {
        veiTrac.ele('condutor')
            .ele('xNome').txt(condutor_nome).up()
            .ele('CPF').txt(condutor_cpf.replace(/\D/g, '')).up();
    }
    
    // Município de carregamento
    root.ele('infMunCarrega')
        .ele('cMunCarrega').txt(municipio_carregamento || '3550308').up()
        .ele('xMunCarrega').txt('SAO PAULO').up();
    
    // Documentos vinculados
    const infDoc = root.ele('infDoc');
    const munDescarga = infDoc.ele('infMunDescarga')
        .ele('cMunDescarga').txt(municipio_descarregamento || '3550308').up()
        .ele('xMunDescarga').txt('SAO PAULO').up();
    
    if (documentos && documentos.length > 0) {
        documentos.forEach(doc => {
            if (doc.chave) {
                munDescarga.ele('infNFe')
                    .ele('chNFe').txt(doc.chave).up();
            } else if (doc.chave_cte) {
                munDescarga.ele('infCTe')
                    .ele('chCTe').txt(doc.chave_cte).up();
            }
        });
    }
    
    // Totais
    root.ele('tot')
        .ele('qCTe').txt(String((documentos || []).filter(d => d.chave_cte).length)).up()
        .ele('qNFe').txt(String((documentos || []).filter(d => d.chave).length)).up()
        .ele('vCarga').txt(String(valor_carga || 0)).up()
        .ele('cUnid').txt('01').up() // KG
        .ele('qCarga').txt(String(peso_bruto || 0)).up();
    
    // Informações adicionais
    root.ele('infAdic')
        .ele('infCpl').txt('Documento emitido por ZYNTRA ERP').up();
    
    return root.end({ prettyPrint: false });
}

/**
 * Construir evento de encerramento MDF-e
 */
function construirEventoEncerramentoMDFe(dados) {
    const { chaveAcesso, cnpj, codigoUF, municipio_encerramento, uf_encerramento } = dados;
    const ambiente = parseInt(nfeConfig.ambiente);
    const now = new Date();
    const dhEvento = now.toISOString();
    
    const id = `ID110112${chaveAcesso}01`;
    
    return builder.create({ version: '1.0', encoding: 'UTF-8' })
        .ele('eventoMDFe', {
            versao: '3.00',
            xmlns: 'http://www.portalfiscal.inf.br/mdfe'
        })
        .ele('infEvento', { Id: id })
        .ele('cOrgao').txt(String(codigoUF)).up()
        .ele('tpAmb').txt(String(ambiente)).up()
        .ele('CNPJ').txt((cnpj || '').replace(/\D/g, '')).up()
        .ele('chMDFe').txt(chaveAcesso).up()
        .ele('dhEvento').txt(dhEvento).up()
        .ele('tpEvento').txt('110112').up()
        .ele('nSeqEvento').txt('1').up()
        .ele('detEvento', { versaoEvento: '3.00' })
        .ele('evEncMDFe')
        .ele('descEvento').txt('Encerramento').up()
        .ele('nProt').txt('').up()
        .ele('dtEnc').txt(now.toISOString().split('T')[0]).up()
        .ele('cUF').txt(String(nfeConfig.estados[uf_encerramento]?.codigo || codigoUF)).up()
        .ele('cMun').txt(municipio_encerramento).up()
        .end({ prettyPrint: false });
}

// ==========================================
// ROTA DE DIAGNÓSTICO
// ==========================================

/**
 * Verificar status do certificado e configuração
 */
router.get('/diagnostico', authenticateToken, async (req, res) => {
    const ambiente = parseInt(nfeConfig.ambiente);
    const cnpj = getCNPJ();
    
    let certInfo = null;
    try {
        if (certificadoOk) {
            certInfo = certificadoService.getInfoCertificado();
            const validade = certificadoService.verificarValidade();
            certInfo.diasRestantes = validade.diasRestantes;
        }
    } catch (e) {
        certInfo = { erro: e.message };
    }
    
    res.json({
        success: true,
        sistema: 'ZYNTRA ERP v2.4.0',
        modulo: 'Documentos Fiscais',
        configuracao: {
            ambiente: ambiente === 1 ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO',
            ambiente_codigo: ambiente,
            uf: process.env.NFE_UF || 'SP',
            cnpj_configurado: !!cnpj,
            cnpj_masked: cnpj ? cnpj.slice(0, 4) + '...' + cnpj.slice(-4) : null,
            certificado: {
                carregado: certificadoOk,
                erro: certificadoErro,
                info: certInfo
            },
            csc_configurado: !!(process.env.NFE_CSC_ID && process.env.NFE_CSC_TOKEN),
            debug: process.env.NFE_DEBUG === 'true'
        },
        webservices_disponiveis: ['NFC-e', 'CT-e', 'MDF-e'],
        endpoints: {
            'POST /nfce/emitir': 'Emitir NFC-e',
            'POST /nfce/:chave/cancelar': 'Cancelar NFC-e',
            'POST /cte/emitir': 'Emitir CT-e',
            'POST /cte/:chave/cancelar': 'Cancelar CT-e',
            'POST /mdfe/emitir': 'Emitir MDF-e',
            'POST /mdfe/:chave/encerrar': 'Encerrar MDF-e',
            'POST /mdfe/:chave/cancelar': 'Cancelar MDF-e',
            'GET /status-servico/:tipo': 'Status do serviço SEFAZ',
            'GET /consultar/:tipo/:chave': 'Consultar documento por chave',
            'GET /diagnostico': 'Este endpoint'
        }
    });
});

module.exports = router;
