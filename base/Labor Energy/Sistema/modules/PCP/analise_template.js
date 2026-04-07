const ExcelJS = require('exceljs');

(async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('Ordem de Produção Aluforce - Copia.xlsx');
    const ws = wb.getWorksheet('VENDAS_PCP');
    
    console.log('=== VERIFICAÇÃO DE FÓRMULAS NAS LINHAS DE PRODUTOS ===');
    console.log('');

    // Verificar linhas 18-22 (primeiras 5 linhas de produtos)
    for (let row = 18; row <= 22; row++) {
        console.log('--- Linha ' + row + ' ---');
        ['B', 'C', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
            const cell = ws.getCell(col + row);
            const info = cell.formula 
                ? '[FORMULA: ' + cell.formula + ']' 
                : cell.value || '(vazio)';
            console.log(col + row + ': ' + info);
        });
        console.log('');
    }
    
    console.log('');
    console.log('=== CATÁLOGO DE PRODUTOS (N18:O25) ===');
    for (let row = 18; row <= 25; row++) {
        const codCell = ws.getCell('N' + row);
        const descCell = ws.getCell('O' + row);
        console.log('N' + row + ': ' + (codCell.value || '(vazio)') + ' | O' + row + ': ' + (descCell.value || '(vazio)'));
    }
    
    console.log('');
    console.log('=== RESUMO DE CÉLULAS COM FÓRMULAS ===');
    
    const formulaCells = [
        'H6', 'H12', 'G15',
        'C18', 'C19', 'C20', 'C21', 'C22',
        'J18', 'J19', 'J20', 'J21', 'J22',
        'I35', 'I45', 'E46'
    ];
    
    formulaCells.forEach(addr => {
        const cell = ws.getCell(addr);
        if (cell.formula) {
            console.log(addr + ': ' + cell.formula);
        }
    });
})();


