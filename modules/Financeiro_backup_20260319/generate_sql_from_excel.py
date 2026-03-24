#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para analisar arquivo Excel de Contas a Pagar
e gerar script SQL para importação no ALUFORCE
"""

import pandas as pd
import sqlite3
import os
from datetime import datetime
import re

def clean_currency(value):
    """Limpa valores monetários para conversão"""
    if pd.isna(value) or value == '':
        return 0.0
    
    # Converter para string se não for
    value_str = str(value)
    
    # Remover símbolos de moeda e espaços
    cleaned = re.sub(r'[R$\s]', '', value_str)
    
    # Substituir vírgula por ponto para decimais
    cleaned = cleaned.replace('.', '').replace(',', '.')
    
    try:
        return float(cleaned)
    except:
        return 0.0

def clean_date(value):
    """Limpa e formata datas"""
    if pd.isna(value) or value == '':
        return None
    
    try:
        # Se já é datetime
        if isinstance(value, datetime):
            return value.strftime('%Y-%m-%d')
        
        # Tentar converter string
        date_str = str(value)
        
        # Formatos possíveis
        formats = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%y']
        
        for fmt in formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except:
                continue
        
        return None
    except:
        return None

def analyze_excel_file(file_path):
    """Analisa o arquivo Excel e retorna informações sobre sua estrutura"""
    
    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return None
    
    try:
        # Ler o arquivo Excel
        print(f"📊 Analisando arquivo: {file_path}")
        
        # Tentar ler todas as planilhas
        excel_file = pd.ExcelFile(file_path)
        
        print(f"📋 Planilhas encontradas: {excel_file.sheet_names}")
        
        # Ler a primeira planilha (ou planilha específica)
        df = pd.read_excel(file_path, sheet_name=0)
        
        print(f"📈 Dimensões: {df.shape[0]} linhas x {df.shape[1]} colunas")
        print(f"📝 Colunas encontradas:")
        
        for i, col in enumerate(df.columns):
            print(f"  {i+1}. {col}")
        
        # Mostrar primeiras linhas
        print(f"\n📄 Primeiras 3 linhas:")
        print(df.head(3).to_string())
        
        return df
        
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {str(e)}")
        return None

def generate_sql_script(df, table_name='contas_pagar'):
    """Gera script SQL baseado no DataFrame"""
    
    if df is None or df.empty:
        return None
    
    # Mapear colunas comuns
    column_mapping = {
        # Possíveis nomes de colunas -> nome padronizado
        'FORNECEDOR': 'fornecedor',
        'DESCRIÇÃO': 'descricao',
        'DESCRIÇAO': 'descricao',
        'DESCRICAO': 'descricao',
        'VALOR': 'valor',
        'VENCIMENTO': 'data_vencimento',
        'DATA VENCIMENTO': 'data_vencimento',
        'DATA_VENCIMENTO': 'data_vencimento',
        'EMISSÃO': 'data_emissao',
        'EMISSAO': 'data_emissao',
        'DATA EMISSÃO': 'data_emissao',
        'DATA_EMISSAO': 'data_emissao',
        'STATUS': 'status',
        'SITUAÇÃO': 'status',
        'SITUACAO': 'status',
        'DOCUMENTO': 'numero_documento',
        'NUM DOCUMENTO': 'numero_documento',
        'NF': 'numero_documento',
        'NOTA FISCAL': 'numero_documento',
        'CATEGORIA': 'categoria',
        'CENTRO DE CUSTO': 'centro_custo',
        'CENTRO_CUSTO': 'centro_custo',
        'OBSERVAÇÕES': 'observacoes',
        'OBSERVACOES': 'observacoes',
        'OBS': 'observacoes'
    }
    
    # Normalizar nomes das colunas
    df_normalized = df.copy()
    df_normalized.columns = df_normalized.columns.str.upper().str.strip()
    
    # Aplicar mapeamento
    for old_col, new_col in column_mapping.items():
        if old_col in df_normalized.columns:
            df_normalized = df_normalized.rename(columns={old_col: new_col})
    
    # Script SQL
    sql_script = f"""-- Script de Importação: Contas a Pagar
-- Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
-- Sistema: ALUFORCE v2.0

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS {table_name} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fornecedor TEXT NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    data_vencimento DATE,
    data_emissao DATE,
    numero_documento TEXT,
    categoria TEXT,
    centro_custo TEXT,
    status TEXT DEFAULT 'PENDENTE',
    observacoes TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Limpar dados anteriores (opcional - comentar se quiser manter)
-- DELETE FROM {table_name};

-- Inserir dados
"""
    
    # Gerar INSERTs
    insert_count = 0
    
    for index, row in df_normalized.iterrows():
        try:
            # Extrair valores com fallbacks
            fornecedor = str(row.get('fornecedor', '')).strip()
            if not fornecedor or fornecedor == 'nan':
                fornecedor = f'Fornecedor {index + 1}'
            
            descricao = str(row.get('descricao', '')).strip()
            if descricao == 'nan':
                descricao = ''
            
            # Limpar valor monetário
            valor = clean_currency(row.get('valor', 0))
            
            # Limpar datas
            data_vencimento = clean_date(row.get('data_vencimento'))
            data_emissao = clean_date(row.get('data_emissao'))
            
            numero_documento = str(row.get('numero_documento', '')).strip()
            if numero_documento == 'nan':
                numero_documento = ''
            
            categoria = str(row.get('categoria', '')).strip()
            if categoria == 'nan':
                categoria = 'Geral'
            
            centro_custo = str(row.get('centro_custo', '')).strip()
            if centro_custo == 'nan':
                centro_custo = ''
            
            status = str(row.get('status', 'PENDENTE')).strip().upper()
            if status == 'nan' or not status:
                status = 'PENDENTE'
            
            observacoes = str(row.get('observacoes', '')).strip()
            if observacoes == 'nan':
                observacoes = ''
            
            # Gerar INSERT
            sql_script += f"""
INSERT INTO {table_name} (
    fornecedor, descricao, valor, data_vencimento, data_emissao,
    numero_documento, categoria, centro_custo, status, observacoes
) VALUES (
    '{fornecedor.replace("'", "''")}',
    '{descricao.replace("'", "''")}',
    {valor},
    {f"'{data_vencimento}'" if data_vencimento else 'NULL'},
    {f"'{data_emissao}'" if data_emissao else 'NULL'},
    '{numero_documento.replace("'", "''")}',
    '{categoria.replace("'", "''")}',
    '{centro_custo.replace("'", "''")}',
    '{status}',
    '{observacoes.replace("'", "''")}'
);"""
            
            insert_count += 1
            
        except Exception as e:
            sql_script += f"\n-- ERRO na linha {index + 1}: {str(e)}"
            continue
    
    # Estatísticas finais
    sql_script += f"""

-- Estatísticas da Importação
-- Total de registros processados: {len(df_normalized)}
-- Total de registros inseridos: {insert_count}
-- Data da importação: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

-- Verificar dados importados
SELECT 
    COUNT(*) as total_registros,
    SUM(valor) as valor_total,
    COUNT(DISTINCT fornecedor) as total_fornecedores,
    COUNT(DISTINCT categoria) as total_categorias
FROM {table_name};

-- Relatório por status
SELECT 
    status,
    COUNT(*) as quantidade,
    SUM(valor) as valor_total
FROM {table_name}
GROUP BY status
ORDER BY quantidade DESC;

-- Relatório por fornecedor
SELECT 
    fornecedor,
    COUNT(*) as quantidade,
    SUM(valor) as valor_total
FROM {table_name}
GROUP BY fornecedor
ORDER BY valor_total DESC
LIMIT 10;
"""
    
    return sql_script

def main():
    """Função principal"""
    file_path = r"C:\Users\Administrator\Documents\Sistema - Aluforce v.2 - BETA\modules\Financeiro\CONTAS A PAGAR.xlsx"
    
    print("🚀 ALUFORCE v2.0 - Gerador de Script SQL")
    print("=" * 50)
    
    # Analisar arquivo
    df = analyze_excel_file(file_path)
    
    if df is not None:
        # Gerar SQL
        print("\n📝 Gerando script SQL...")
        sql_script = generate_sql_script(df)
        
        if sql_script:
            # Salvar arquivo SQL
            output_file = file_path.replace('.xlsx', '_import.sql')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(sql_script)
            
            print(f"✅ Script SQL gerado com sucesso!")
            print(f"📁 Arquivo salvo em: {output_file}")
            
            # Mostrar preview
            print(f"\n📄 Preview do script:")
            print("=" * 50)
            lines = sql_script.split('\n')
            for i, line in enumerate(lines[:30]):  # Primeiras 30 linhas
                print(line)
            
            if len(lines) > 30:
                print(f"... (+{len(lines) - 30} linhas)")
        
        else:
            print("❌ Erro ao gerar script SQL")
    
    print("\n🏁 Processamento concluído!")

if __name__ == "__main__":
    main()