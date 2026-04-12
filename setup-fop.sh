#!/bin/bash
# ============================================================
# Setup Apache FOP para Zyntra ERP - Geração de PDF via XSL-FO
# Execute como root no VPS: bash setup-fop.sh
# ============================================================

set -e

echo "============================================"
echo " Instalação Apache FOP - Zyntra ERP"
echo "============================================"

# Verifica se já está instalado
if command -v fop &> /dev/null; then
    echo "✅ Apache FOP já está instalado:"
    fop -version 2>/dev/null || echo "(versão não disponível)"
    exit 0
fi

# Detectar distribuição
if [ -f /etc/debian_version ]; then
    echo "📦 Detectado Debian/Ubuntu - Instalando via apt..."
    apt-get update -y
    apt-get install -y fop default-jre-headless
    echo "✅ FOP instalado via apt"

elif [ -f /etc/redhat-release ]; then
    echo "📦 Detectado CentOS/RHEL - Instalando via yum..."
    yum install -y java-11-openjdk-headless
    # Download manual do FOP
    FOP_VERSION="2.9"
    cd /tmp
    wget "https://dlcdn.apache.org/xmlgraphics/fop/binaries/fop-${FOP_VERSION}-bin.tar.gz"
    tar xzf "fop-${FOP_VERSION}-bin.tar.gz"
    mv "fop-${FOP_VERSION}" /opt/fop
    ln -sf /opt/fop/fop/fop /usr/local/bin/fop
    chmod +x /opt/fop/fop/fop
    rm "fop-${FOP_VERSION}-bin.tar.gz"
    echo "✅ FOP ${FOP_VERSION} instalado em /opt/fop"

else
    echo "📦 Distribuição não reconhecida - Instalação manual..."
    # Requer Java
    if ! command -v java &> /dev/null; then
        echo "❌ Java não encontrado. Instale Java 11+ primeiro."
        exit 1
    fi
    FOP_VERSION="2.9"
    cd /tmp
    wget "https://dlcdn.apache.org/xmlgraphics/fop/binaries/fop-${FOP_VERSION}-bin.tar.gz"
    tar xzf "fop-${FOP_VERSION}-bin.tar.gz"
    mv "fop-${FOP_VERSION}" /opt/fop
    ln -sf /opt/fop/fop/fop /usr/local/bin/fop
    chmod +x /opt/fop/fop/fop
    rm "fop-${FOP_VERSION}-bin.tar.gz"
    echo "✅ FOP ${FOP_VERSION} instalado em /opt/fop"
fi

# Verificar instalação
echo ""
echo "============================================"
echo " Verificação"
echo "============================================"
if command -v fop &> /dev/null; then
    echo "✅ FOP está no PATH"
    fop -version 2>/dev/null || true
    echo ""
    echo "Opcional: adicione ao .env do Zyntra:"
    echo "  FOP_PATH=$(which fop)"
else
    echo "⚠️ FOP não está no PATH, mas pode estar em /opt/fop/fop/fop"
    echo "Adicione ao .env do Zyntra:"
    echo "  FOP_PATH=/opt/fop/fop/fop"
fi

echo ""
echo "============================================"
echo " Setup concluído!"
echo " Rotas disponíveis:"
echo "   POST /api/gerar-ordem-pdf   → Gerar PDF"
echo "   POST /api/gerar-ordem-xml   → Exportar XML"
echo "   GET  /api/ordem-pdf/status  → Status do FOP"
echo "============================================"
