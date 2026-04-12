<?xml version="1.0" encoding="UTF-8"?>
<!--
  XSL-FO Template para Ordem de Produção - Aluforce / Zyntra ERP
  Transforma XML da OP em XSL-FO para processamento via Apache FOP → PDF
  Layout baseado no template Excel "Ordem de Produção.xlsx"
-->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:fo="http://www.w3.org/1999/XSL/Format"
    xmlns:op="http://zyntra.com.br/ordem-producao">

  <xsl:output method="xml" indent="yes"/>

  <!-- ======================== ROOT TEMPLATE ======================== -->
  <xsl:template match="/op:ordem-producao">
    <fo:root>

      <!-- Layout da página A4 paisagem (como o Excel original) -->
      <fo:layout-master-set>
        <fo:simple-page-master master-name="ordem-pagina"
            page-width="297mm" page-height="210mm"
            margin-top="8mm" margin-bottom="8mm"
            margin-left="10mm" margin-right="10mm">
          <fo:region-body margin-top="5mm" margin-bottom="12mm"/>
          <fo:region-after extent="10mm"/>
        </fo:simple-page-master>
      </fo:layout-master-set>

      <!-- ============ ABA 1: VENDAS / PCP ============ -->
      <fo:page-sequence master-reference="ordem-pagina">

        <!-- Rodapé -->
        <fo:static-content flow-name="xsl-region-after">
          <fo:block font-size="7pt" color="#666" text-align="center" border-top="0.5pt solid #999" padding-top="2mm">
            ALUFORCE LTDA. — Documento gerado automaticamente pelo Zyntra ERP
          </fo:block>
        </fo:static-content>

        <fo:flow flow-name="xsl-region-body">

          <!-- ===== CABEÇALHO EMPRESA ===== -->
          <fo:block-container border="1.5pt solid #2E7D32" padding="3mm" margin-bottom="3mm"
              background-color="#F1F8E9">
            <fo:block font-size="14pt" font-weight="bold" color="#2E7D32" text-align="center">
              <xsl:value-of select="op:empresa/op:nome"/>
            </fo:block>
            <fo:block font-size="9pt" text-align="center" color="#333">
              <xsl:value-of select="op:empresa/op:endereco"/>
              <xsl:text> - </xsl:text>
              <xsl:value-of select="op:empresa/op:cep"/>
              <xsl:text> - </xsl:text>
              <xsl:value-of select="op:empresa/op:cidade"/>
            </fo:block>
          </fo:block-container>

          <!-- ===== DADOS DA ORDEM ===== -->
          <fo:table table-layout="fixed" width="100%" border="1pt solid #2E7D32" margin-bottom="3mm">
            <fo:table-column column-width="22%"/>
            <fo:table-column column-width="12%"/>
            <fo:table-column column-width="16%"/>
            <fo:table-column column-width="12%"/>
            <fo:table-column column-width="18%"/>
            <fo:table-column column-width="20%"/>
            <fo:table-body>
              <fo:table-row background-color="#C8E6C9" height="8mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" font-weight="bold">Orçamento:
                    <fo:inline font-weight="normal"><xsl:text> </xsl:text><xsl:value-of select="op:cabecalho/op:numero-orcamento"/></fo:inline>
                  </fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" font-weight="bold">Revisão:
                    <fo:inline font-weight="normal"><xsl:text> </xsl:text><xsl:value-of select="op:cabecalho/op:revisao"/></fo:inline>
                  </fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" font-weight="bold">Pedido:
                    <fo:inline font-weight="normal"><xsl:text> </xsl:text><xsl:value-of select="op:cabecalho/op:numero-pedido"/></fo:inline>
                  </fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" number-columns-spanned="2">
                  <fo:block font-size="8pt" font-weight="bold">Dt. liberação:
                    <fo:inline font-weight="normal"><xsl:text> </xsl:text><xsl:value-of select="op:cabecalho/op:data-liberacao"/></fo:inline>
                  </fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" font-weight="bold">Prazo:
                    <fo:inline font-weight="normal"><xsl:text> </xsl:text><xsl:value-of select="op:cabecalho/op:prazo-entrega"/></fo:inline>
                  </fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-body>
          </fo:table>

          <!-- ===== VENDEDOR / CLIENTE / CONTATO ===== -->
          <fo:table table-layout="fixed" width="100%" border="1pt solid #2E7D32" margin-bottom="3mm">
            <fo:table-column column-width="15%"/>
            <fo:table-column column-width="45%"/>
            <fo:table-column column-width="15%"/>
            <fo:table-column column-width="25%"/>
            <fo:table-body>
              <!-- Vendedor -->
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">VENDEDOR:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" number-columns-spanned="3">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cabecalho/op:vendedor"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <!-- Cliente -->
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Cliente:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" number-columns-spanned="3">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:nome"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <!-- Contato / Fone -->
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Contato:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:contato"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Fone:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:telefone"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <!-- Email / Frete -->
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Email:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" color="#1565C0"><xsl:value-of select="op:cliente/op:email"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Frete:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" font-weight="bold"><xsl:value-of select="op:cliente/op:frete"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-body>
          </fo:table>

          <!-- ===== TRANSPORTADORA ===== -->
          <fo:table table-layout="fixed" width="100%" border="1pt solid #2E7D32" margin-bottom="3mm">
            <fo:table-column column-width="18%"/>
            <fo:table-column column-width="32%"/>
            <fo:table-column column-width="10%"/>
            <fo:table-column column-width="40%"/>
            <fo:table-body>
              <fo:table-row background-color="#C8E6C9" height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" number-columns-spanned="4">
                  <fo:block font-size="8pt" font-weight="bold" text-align="center">Dados da transportadora:</fo:block>
                </fo:table-cell>
              </fo:table-row>
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Nome:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:transportadora/op:nome"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Fone:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:transportadora/op:telefone"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Cep:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:transportadora/op:cep"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">Endereço:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:transportadora/op:endereco"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">CPF/CNPJ:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt"><xsl:value-of select="op:transportadora/op:cpf-cnpj"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" background-color="#E8F5E9">
                  <fo:block font-size="8pt" font-weight="bold">E-mail NFe:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                  <fo:block font-size="8pt" color="#1565C0"><xsl:value-of select="op:transportadora/op:email-nfe"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-body>
          </fo:table>

          <!-- ===== TABELA DE PRODUTOS ===== -->
          <fo:table table-layout="fixed" width="100%" border="1.5pt solid #2E7D32" margin-bottom="3mm">
            <fo:table-column column-width="5%"/>   <!-- # -->
            <fo:table-column column-width="10%"/>  <!-- Cod -->
            <fo:table-column column-width="33%"/>  <!-- Produto -->
            <fo:table-column column-width="10%"/>  <!-- Embal -->
            <fo:table-column column-width="8%"/>   <!-- Lances -->
            <fo:table-column column-width="10%"/>  <!-- Qtd -->
            <fo:table-column column-width="12%"/>  <!-- V.Un -->
            <fo:table-column column-width="12%"/>  <!-- V.Total -->
            <fo:table-header>
              <fo:table-row background-color="#2E7D32" height="8mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="center">#</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="center">Cod.</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white">Produto</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="center">Embalagem</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="center">Lance(s)</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="right">Qtd.</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="right">V. Un. R$</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #1B5E20">
                  <fo:block font-size="8pt" font-weight="bold" color="white" text-align="right">V. Total R$</fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-header>
            <fo:table-body>
              <xsl:for-each select="op:produtos/op:produto">
                <fo:table-row height="7mm">
                  <xsl:attribute name="background-color">
                    <xsl:choose>
                      <xsl:when test="position() mod 2 = 0">#E8F5E9</xsl:when>
                      <xsl:otherwise>#FFFFFF</xsl:otherwise>
                    </xsl:choose>
                  </xsl:attribute>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:item"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="center" font-weight="bold"><xsl:value-of select="op:codigo"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="7.5pt"><xsl:value-of select="op:descricao"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:embalagem"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:lances"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="right">
                      <xsl:value-of select="format-number(op:quantidade, '#.##0,00')"/>
                    </fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="right">
                      R$ <xsl:value-of select="format-number(op:valor-unitario, '#.##0,00')"/>
                    </fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9" display-align="center">
                    <fo:block font-size="8pt" text-align="right" font-weight="bold">
                      R$ <xsl:value-of select="format-number(op:valor-total, '#.##0,00')"/>
                    </fo:block>
                  </fo:table-cell>
                </fo:table-row>
              </xsl:for-each>

              <!-- Linha de TOTAL -->
              <fo:table-row background-color="#C8E6C9" height="8mm">
                <fo:table-cell padding="1.5mm" border="1pt solid #2E7D32" number-columns-spanned="7" display-align="center">
                  <fo:block font-size="9pt" font-weight="bold" text-align="right" padding-right="3mm">
                    TOTAL GERAL:
                  </fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="1pt solid #2E7D32" display-align="center">
                  <fo:block font-size="9pt" font-weight="bold" text-align="right">
                    R$ <xsl:value-of select="format-number(op:totais/op:total-geral, '#.##0,00')"/>
                  </fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-body>
          </fo:table>

          <!-- ===== CONDIÇÕES DE PAGAMENTO ===== -->
          <xsl:if test="op:pagamento/op:forma">
            <fo:table table-layout="fixed" width="100%" border="1pt solid #2E7D32" margin-bottom="3mm">
              <fo:table-column column-width="25%"/>
              <fo:table-column column-width="15%"/>
              <fo:table-column column-width="30%"/>
              <fo:table-column column-width="30%"/>
              <fo:table-header>
                <fo:table-row background-color="#C8E6C9" height="7mm">
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32" number-columns-spanned="4">
                    <fo:block font-size="8pt" font-weight="bold" text-align="center">Condições de Pagamento</fo:block>
                  </fo:table-cell>
                </fo:table-row>
                <fo:table-row background-color="#E8F5E9" height="7mm">
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                    <fo:block font-size="7pt" font-weight="bold">Forma</fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                    <fo:block font-size="7pt" font-weight="bold" text-align="center">%</fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                    <fo:block font-size="7pt" font-weight="bold">Método</fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #2E7D32">
                    <fo:block font-size="7pt" font-weight="bold" text-align="right">Valor R$</fo:block>
                  </fo:table-cell>
                </fo:table-row>
              </fo:table-header>
              <fo:table-body>
                <xsl:for-each select="op:pagamento/op:forma">
                  <fo:table-row height="7mm">
                    <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9">
                      <fo:block font-size="8pt"><xsl:value-of select="op:tipo"/></fo:block>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9">
                      <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:percentual"/>%</fo:block>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9">
                      <fo:block font-size="8pt"><xsl:value-of select="op:metodo"/></fo:block>
                    </fo:table-cell>
                    <fo:table-cell padding="1.5mm" border="0.5pt solid #C8E6C9">
                      <fo:block font-size="8pt" text-align="right" font-weight="bold">
                        R$ <xsl:value-of select="format-number(op:valor, '#.##0,00')"/>
                      </fo:block>
                    </fo:table-cell>
                  </fo:table-row>
                </xsl:for-each>
              </fo:table-body>
            </fo:table>
          </xsl:if>

          <!-- ===== OBSERVAÇÕES ===== -->
          <xsl:if test="op:observacoes/op:geral != '' or op:observacoes/op:entrega != ''">
            <fo:block-container border="1pt solid #2E7D32" padding="3mm" margin-bottom="3mm">
              <fo:block font-size="8pt" font-weight="bold" color="#2E7D32" margin-bottom="1mm">Observações:</fo:block>
              <xsl:if test="op:observacoes/op:geral != ''">
                <fo:block font-size="7.5pt" margin-bottom="1mm"><xsl:value-of select="op:observacoes/op:geral"/></fo:block>
              </xsl:if>
              <xsl:if test="op:observacoes/op:entrega != ''">
                <fo:block font-size="7.5pt" font-weight="bold">Entrega: <fo:inline font-weight="normal"><xsl:value-of select="op:observacoes/op:entrega"/></fo:inline></fo:block>
              </xsl:if>
              <fo:block font-size="7.5pt" margin-top="1mm">
                Status entrega: <fo:inline font-weight="bold"><xsl:value-of select="op:observacoes/op:status-entrega"/></fo:inline>
              </fo:block>
            </fo:block-container>
          </xsl:if>

        </fo:flow>
      </fo:page-sequence>

      <!-- ============ ABA 2: PRODUÇÃO ============ -->
      <fo:page-sequence master-reference="ordem-pagina">

        <fo:static-content flow-name="xsl-region-after">
          <fo:block font-size="7pt" color="#666" text-align="center" border-top="0.5pt solid #999" padding-top="2mm">
            PRODUÇÃO — ALUFORCE LTDA. — Zyntra ERP
          </fo:block>
        </fo:static-content>

        <fo:flow flow-name="xsl-region-body">

          <!-- Cabeçalho Produção -->
          <fo:block-container border="1.5pt solid #1565C0" padding="3mm" margin-bottom="3mm"
              background-color="#E3F2FD">
            <fo:block font-size="12pt" font-weight="bold" color="#1565C0" text-align="center">
              ORDEM DE PRODUÇÃO
            </fo:block>
            <fo:block font-size="9pt" text-align="center" color="#333">
              <xsl:value-of select="op:empresa/op:nome"/>
              <xsl:text> — OP </xsl:text>
              <xsl:value-of select="op:cabecalho/op:numero-orcamento"/>
              <xsl:text> / Pedido </xsl:text>
              <xsl:value-of select="op:cabecalho/op:numero-pedido"/>
            </fo:block>
          </fo:block-container>

          <!-- Info resumida -->
          <fo:table table-layout="fixed" width="100%" border="1pt solid #1565C0" margin-bottom="3mm">
            <fo:table-column column-width="20%"/>
            <fo:table-column column-width="30%"/>
            <fo:table-column column-width="20%"/>
            <fo:table-column column-width="30%"/>
            <fo:table-body>
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" background-color="#E3F2FD">
                  <fo:block font-size="8pt" font-weight="bold">VENDEDOR:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cabecalho/op:vendedor"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" background-color="#E3F2FD">
                  <fo:block font-size="8pt" font-weight="bold">Cliente:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:nome"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
              <fo:table-row height="7mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" background-color="#E3F2FD">
                  <fo:block font-size="8pt" font-weight="bold">Fone:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:telefone"/></fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" background-color="#E3F2FD">
                  <fo:block font-size="8pt" font-weight="bold">Frete:</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9">
                  <fo:block font-size="8pt"><xsl:value-of select="op:cliente/op:frete"/></fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-body>
          </fo:table>

          <!-- Tabela de Produção detalhada -->
          <fo:table table-layout="fixed" width="100%" border="1.5pt solid #1565C0">
            <fo:table-column column-width="5%"/>   <!-- # -->
            <fo:table-column column-width="10%"/>  <!-- Cod -->
            <fo:table-column column-width="27%"/>  <!-- Produto -->
            <fo:table-column column-width="10%"/>  <!-- Cod.Cores -->
            <fo:table-column column-width="10%"/>  <!-- P.Líquido -->
            <fo:table-column column-width="10%"/>  <!-- Lote -->
            <fo:table-column column-width="8%"/>   <!-- Embal -->
            <fo:table-column column-width="8%"/>   <!-- Lances -->
            <fo:table-column column-width="12%"/>  <!-- Qtd -->
            <fo:table-header>
              <fo:table-row background-color="#1565C0" height="8mm">
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">#</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">Cod.</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white">Produto</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">Cod. Cores</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">P.Líquido</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">Lote</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">Embal.</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="center">Lance(s)</fo:block>
                </fo:table-cell>
                <fo:table-cell padding="1.5mm" border="0.5pt solid #0D47A1">
                  <fo:block font-size="7pt" font-weight="bold" color="white" text-align="right">Quantidade</fo:block>
                </fo:table-cell>
              </fo:table-row>
            </fo:table-header>
            <fo:table-body>
              <xsl:for-each select="op:produtos/op:produto">
                <fo:table-row height="7mm">
                  <xsl:attribute name="background-color">
                    <xsl:choose>
                      <xsl:when test="position() mod 2 = 0">#E3F2FD</xsl:when>
                      <xsl:otherwise>#FFFFFF</xsl:otherwise>
                    </xsl:choose>
                  </xsl:attribute>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:item"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center" font-weight="bold"><xsl:value-of select="op:codigo"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="7.5pt"><xsl:value-of select="op:descricao"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:codigo-cores"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:peso-liquido"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:lote"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:embalagem"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="center"><xsl:value-of select="op:lances"/></fo:block>
                  </fo:table-cell>
                  <fo:table-cell padding="1.5mm" border="0.5pt solid #90CAF9" display-align="center">
                    <fo:block font-size="8pt" text-align="right" font-weight="bold">
                      <xsl:value-of select="format-number(op:quantidade, '#.##0,00')"/>
                    </fo:block>
                  </fo:table-cell>
                </fo:table-row>
              </xsl:for-each>
            </fo:table-body>
          </fo:table>

        </fo:flow>
      </fo:page-sequence>

    </fo:root>
  </xsl:template>

</xsl:stylesheet>
