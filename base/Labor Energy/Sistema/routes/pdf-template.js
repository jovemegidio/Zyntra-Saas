/**
 * PDF Template Engine — Zyntra ERP
 * Header e utilitários compartilhados para geração de PDF via pdfkit.
 *
 * Uso:
 *   const { defaultPDFHeader, COMPANY, COLORS } = require('./pdf-template');
 *   const PDFDocument = require('pdfkit');
 *   const doc = new PDFDocument({ size: 'A4', margins: { top: 28, bottom: 28, left: 42, right: 42 } });
 *   const y = defaultPDFHeader(doc, { titulo: 'ORDEM DE PRODUÇÃO', subtitulo: 'OP-2025/00001' });
 *   // continuar desenhando a partir de `y`
 */

const path = require('path');
const fs   = require('fs');

// ─── Dados da empresa (fonte única de verdade) ───────────────────────────────
const COMPANY = Object.freeze({
    razao: 'I. M. DOS REIS - ALUFORCE INDUSTRIA E COMERCIO DE CONDUTORES',
    cnpj:  '08.192.479/0001-60',
    ie:    '103.385.861-110',
    end:   'Rua Ernestina, 270 - Vila Sao Joao',
    cidUf: 'Ferraz de Vasconcelos/SP',
    cep:   '08527-400',
    tel:   '(11) 94723-8729',
    email: 'contato@aluforce.com.br'
});

// ─── Paleta corporativa ──────────────────────────────────────────────────────
const COLORS = Object.freeze({
    navy:        '#0b2842',
    gold:        '#18b6c8',
    text:        '#1A202C',
    textMid:     '#4A5568',
    textLight:   '#718096',
    bg:          '#F8FAFC',
    border:      '#CBD5E0',
    borderLight: '#E2E8F0',
    white:       '#FFFFFF',
    red:         '#C53030',
    green:       '#276749'
});

// ─── Logo path ───────────────────────────────────────────────────────────────
const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'Logo Monocromatico - Azul - Aluforce.png');

/**
 * Formata uma data para dd/mm/aaaa
 */
function fmtData(d) {
    if (!d) return '--';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '--';
    return dt.toLocaleDateString('pt-BR');
}

/**
 * Formata data + hora  dd/mm/aaaa HH:MM
 */
function fmtDataHora(d) {
    if (!d) return '--';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '--';
    return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Desenha o header padrão corporativo em um PDFDocument (A4 portrait).
 *
 * @param {PDFDocument} doc  - Instância do pdfkit já criada
 * @param {Object}      opts
 * @param {string}      opts.titulo      - Título do documento ("ORDEM DE PRODUÇÃO", "ORÇAMENTO", etc.)
 * @param {string}     [opts.subtitulo]  - Número ou ID exibido em destaque (ex.: "N. 142")
 * @param {Object[]}   [opts.meta]       - Array de { label, value } para barra de metadados (max 4)
 * @param {boolean}    [opts.semLogo]    - true para omitir o logo (etiquetas pequenas)
 * @param {number}     [opts.marginLeft] - Margem esquerda (default 42)
 * @param {number}     [opts.pageWidth]  - Largura da página (default 595 = A4 portrait)
 *
 * @returns {number} posição Y após o header (pronto para desenhar conteúdo)
 */
function defaultPDFHeader(doc, opts = {}) {
    const {
        titulo     = 'DOCUMENTO',
        subtitulo  = '',
        meta       = [],
        semLogo    = false,
        marginLeft = 42,
        pageWidth  = 595
    } = opts;

    const ML = marginLeft;
    const MR = pageWidth - marginLeft;
    const MW = MR - ML;
    const C  = COLORS;
    let y = 0;

    // ── Faixa superior premium ───────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 8).fillColor(C.navy).fill();
    doc.rect(0, 8, pageWidth, 1.5).fillColor(C.gold).fill();
    y = 20;

    // ── Logo + Dados da empresa ──────────────────────────────────────────────
    if (!semLogo && fs.existsSync(LOGO_PATH)) {
        try { doc.image(LOGO_PATH, ML, y, { width: 70 }); } catch (_) { /* logo não carregou */ }
    }

    const exL = semLogo ? ML : ML + 78;
    doc.fontSize(6.8).fillColor(C.navy).font('Helvetica-Bold')
       .text(COMPANY.razao, exL, y + 2, { width: 260 });
    doc.fontSize(5.5).fillColor(C.textMid).font('Helvetica')
       .text(`CNPJ: ${COMPANY.cnpj}  |  IE: ${COMPANY.ie}`, exL, y + 18)
       .text(`${COMPANY.end} - ${COMPANY.cidUf} - CEP: ${COMPANY.cep}`, exL, y + 26)
       .text(`${COMPANY.tel}  |  ${COMPANY.email}`, exL, y + 34);

    // ── Caixa título/número (lado direito) ───────────────────────────────────
    const dbW = 138;
    const dbX = MR - dbW;
    const dbH = 44;

    doc.roundedRect(dbX + 1, y, dbW, dbH, 4).fillColor(C.borderLight).fill();
    doc.roundedRect(dbX, y - 1, dbW, dbH, 4).fillColor(C.navy).fill();
    doc.roundedRect(dbX, y - 1, dbW, 4, 4).fillColor(C.gold).fill();
    doc.rect(dbX, y + 1, dbW, 2).fillColor(C.gold).fill();

    doc.fontSize(9.5).fillColor(C.white).font('Helvetica-Bold')
       .text(titulo, dbX, y + 8, { width: dbW, align: 'center' });

    if (subtitulo) {
        doc.fontSize(18).fillColor(C.gold).font('Helvetica-Bold')
           .text(subtitulo, dbX, y + 21, { width: dbW, align: 'center' });
    }

    y += 52;

    // ── Separador dourado ────────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(MR, y).strokeColor(C.gold).lineWidth(1.5).stroke();
    doc.moveTo(ML, y + 3).lineTo(MR, y + 3).strokeColor(C.borderLight).lineWidth(0.3).stroke();
    y += 9;

    // ── Barra de metadados (opcional) ────────────────────────────────────────
    if (meta.length > 0) {
        const metaH = 24;
        doc.rect(ML, y, MW, metaH).fillColor(C.bg).fill();
        doc.rect(ML, y, MW, metaH).strokeColor(C.border).lineWidth(0.3).stroke();

        const mColW = MW / Math.min(meta.length, 4);
        meta.slice(0, 4).forEach((f, i) => {
            const fx = ML + mColW * i + 12;
            doc.fontSize(5).fillColor(C.textLight).font('Helvetica-Bold')
               .text(f.label, fx, y + 4);
            doc.fontSize(7).fillColor(C.text).font('Helvetica')
               .text(f.value || '--', fx, y + 13);
            if (i > 0) {
                const dx = ML + mColW * i;
                doc.moveTo(dx, y + 4).lineTo(dx, y + metaH - 4)
                   .strokeColor(C.borderLight).lineWidth(0.3).stroke();
            }
        });

        y += metaH + 6;
    }

    // ── Timestamp discreto ───────────────────────────────────────────────────
    doc.fontSize(5).fillColor(C.textLight).font('Helvetica')
       .text(`Gerado em ${fmtDataHora(new Date())}`, ML, y, { width: MW, align: 'right' });
    y += 10;

    return y;
}

module.exports = {
    defaultPDFHeader,
    COMPANY,
    COLORS,
    LOGO_PATH,
    fmtData,
    fmtDataHora
};
