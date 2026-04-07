#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conversor Excel para SQL - Contas a Pagar
Sistema ALUFORCE v2.0
"""

import os
import csv
import re
from datetime import datetime

def excel_to_csv_instructions():
    """
    Gera instruções para conversão manual do Excel
    """
    
    instructions = """
# 📋 INSTRUÇÕES: CONVERTER EXCEL PARA CSV

## Passo a Passo:

1. **Abra seu arquivo Excel:** CONTAS A PAGAR.xlsx

2. **Organize as colunas na seguinte ordem:**
   - Coluna A: FORNECEDOR
   - Coluna B: DESCRIÇÃO  
   - Coluna C: VALOR
   - Coluna D: VENCIMENTO
   - Coluna E: DOCUMENTO (opcional)
   - Coluna F: CATEGORIA (opcional)
   - Coluna G: STATUS (opcional)

3. **Ajuste os dados:**
   - Datas no formato DD/MM/YYYY
   - Valores com vírgula decimal
   - Remove linhas vazias

4. **Salvar como CSV:**
   - Arquivo > Salvar Como
   - Formato: CSV (separado por vírgulas)
   - Nome: contas_pagar.csv
   - Salvar na mesma pasta

5. **Execute o próximo script:** 
   python convert_csv_to_sql.py

"""
    return instructions

def create_csv_converter():
    """
    Cria script para converter CSV em SQL
    """
    
    converter_script = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conversor CSV para SQL - Contas a Pagar
"""

import csv
import re
from datetime import datetime

def clean_currency(value):
    """Limpa valores monetários"""
    if not value or value.strip() == '':
        return 0.0
    
    # Remove símbolos e converte vírgula em ponto
    cleaned = re.sub(r'[R$\\s]', '', str(value))
    cleaned = cleaned.replace('.', '').replace(',', '.')
    
    try:
        return float(cleaned)
    except:
        return 0.0

def clean_date(value):
    """Converte datas para formato SQL"""
    if not value or value.strip() == '':
        return None
    
    try:
        # Tenta vários formatos
        formats = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%y']
        
        for fmt in formats:
            try:
                parsed_date = datetime.strptime(str(value).strip(), fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except:
                continue
        
        return None
    except:
        return None

def clean_text(value):
    """Limpa texto para SQL"""
    if not value:
        return ''
    return str(value).strip().replace("'", "''")

def convert_csv_to_sql(csv_file):
    """Converte CSV para SQL"""
    
    if not os.path.exists(csv_file):
        print(f"❌ Arquivo não encontrado: {csv_file}")
        return False
    
    sql_inserts = []
    errors = []
    success_count = 0
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Detectar delimitador
            sample = file.read(1024)
            file.seek(0)
            
            delimiter = ',' if sample.count(',') > sample.count(';') else ';'
            
            reader = csv.reader(file, delimiter=delimiter)
            
            # Pular cabeçalho se existir
            first_row = next(reader, None)
            if first_row and any('fornecedor' in str(cell).lower() for cell in first_row):
                print("📋 Cabeçalho detectado, pulando primeira linha...")
            else:
                # Primeira linha são dados, processar
                file.seek(0)
                reader = csv.reader(file, delimiter=delimiter)
            
            row_number = 1
            
            for row in reader:
                try:
                    if len(row) < 3:  # Mínimo: fornecedor, descrição, valor
                        continue
                    
                    # Mapear colunas (ajustar conforme sua planilha)
                    fornecedor = clean_text(row[0] if len(row) > 0 else '')
                    descricao = clean_text(row[1] if len(row) > 1 else '')
                    valor = clean_currency(row[2] if len(row) > 2 else 0)
                    data_vencimento = clean_date(row[3] if len(row) > 3 else '')
                    documento = clean_text(row[4] if len(row) > 4 else '')
                    categoria = clean_text(row[5] if len(row) > 5 else 'Geral')
                    status = clean_text(row[6] if len(row) > 6 else 'PENDENTE').upper()
                    
                    # Validações
                    if not fornecedor:
                        fornecedor = f'Fornecedor {row_number}'
                    
                    if not descricao:
                        descricao = 'Conta a pagar'
                    
                    if valor <= 0:
                        errors.append(f"Linha {row_number}: Valor inválido ({valor})")
                        continue
                    
                    if not data_vencimento:
                        errors.append(f"Linha {row_number}: Data de vencimento inválida")
                        continue
                    
                    if status not in ['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA']:
                        status = 'PENDENTE'
                    
                    # Gerar INSERT
                    sql_insert = f"""INSERT INTO contas_pagar (
    fornecedor_nome, descricao, valor_original, data_vencimento,
    numero_documento, categoria, status
) VALUES (
    '{fornecedor}',
    '{descricao}',
    {valor},
    '{data_vencimento}',
    '{documento}',
    '{categoria}',
    '{status}'
);"""
                    
                    sql_inserts.append(sql_insert)
                    success_count += 1
                    
                except Exception as e:
                    errors.append(f"Linha {row_number}: {str(e)}")
                
                row_number += 1
    
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {str(e)}")
        return False
    
    # Gerar arquivo SQL
    sql_file = csv_file.replace('.csv', '_import.sql')
    
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(f"""-- =====================================================
-- IMPORTAÇÃO AUTOMÁTICA: CONTAS A PAGAR
-- Arquivo origem: {csv_file}
-- Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
-- =====================================================

-- Registros processados: {success_count}
-- Erros encontrados: {len(errors)}

""")
        
        # Escrever INSERTs
        for insert in sql_inserts:
            f.write(insert + "\\n\\n")
        
        # Escrever erros como comentários
        if errors:
            f.write("\\n-- =====================================================\\n")
            f.write("-- ERROS ENCONTRADOS:\\n")
            f.write("-- =====================================================\\n")
            for error in errors:
                f.write(f"-- {error}\\n")
        
        # Verificação final
        f.write(f"""
-- =====================================================
-- VERIFICAÇÃO PÓS-IMPORTAÇÃO
-- =====================================================

-- Contar registros importados
SELECT COUNT(*) as registros_importados FROM contas_pagar;

-- Verificar últimas inserções
SELECT * FROM contas_pagar 
ORDER BY data_criacao DESC 
LIMIT 10;

-- Resumo por status
SELECT status, COUNT(*) as quantidade, SUM(valor_original) as valor_total
FROM contas_pagar 
GROUP BY status;
""")
    
    # Relatório
    print(f"✅ Conversão concluída!")
    print(f"📁 Arquivo SQL gerado: {sql_file}")
    print(f"📊 Registros processados: {success_count}")
    print(f"❌ Erros encontrados: {len(errors)}")
    
    if errors:
        print(f"\\n🔍 Primeiros erros:")
        for error in errors[:5]:
            print(f"  • {error}")
    
    return True

if __name__ == "__main__":
    csv_file = "contas_pagar.csv"
    
    print("🚀 ALUFORCE v2.0 - Conversor CSV para SQL")
    print("=" * 50)
    
    if os.path.exists(csv_file):
        convert_csv_to_sql(csv_file)
    else:
        print(f"❌ Arquivo {csv_file} não encontrado!")
        print("💡 Primeiro exporte seu Excel para CSV com o nome 'contas_pagar.csv'")
'''
    
    return converter_script

def main():
    """Função principal"""
    print("🔧 ALUFORCE v2.0 - Utilitários de Conversão")
    print("=" * 50)
    
    base_path = r"C:\Users\Administrator\Documents\Sistema - Aluforce v.2 - BETA\modules\Financeiro"
    
    # Criar instruções
    instructions_file = os.path.join(base_path, "INSTRUCOES_EXCEL_CSV.md")
    instructions = excel_to_csv_instructions()
    
    with open(instructions_file, 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print(f"✅ Instruções salvas em: {instructions_file}")
    
    # Criar conversor CSV
    converter_file = os.path.join(base_path, "convert_csv_to_sql.py")
    converter_script = create_csv_converter()
    
    with open(converter_file, 'w', encoding='utf-8') as f:
        f.write(converter_script)
    
    print(f"✅ Conversor salvo em: {converter_file}")
    
    print(f"\n📋 Próximos passos:")
    print(f"  1. Leia as instruções em: INSTRUCOES_EXCEL_CSV.md")
    print(f"  2. Converta seu Excel para CSV manualmente")
    print(f"  3. Execute: python convert_csv_to_sql.py")
    print(f"  4. Execute o SQL gerado no seu banco")
    
    print(f"\n🎯 Arquivos criados:")
    print(f"  ✅ contas_pagar_complete.sql (estrutura completa)")
    print(f"  ✅ contas_pagar_import_template.sql (template manual)")
    print(f"  ✅ MANUAL_IMPORTACAO_CONTAS_PAGAR.md (manual completo)")
    print(f"  ✅ INSTRUCOES_EXCEL_CSV.md (conversão Excel)")
    print(f"  ✅ convert_csv_to_sql.py (conversor automático)")

if __name__ == "__main__":
    main()