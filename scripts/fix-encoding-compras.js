'use strict';
const fs = require('fs');

const fixes = [
  // Section headers / all caps
  ['FUN????ES DE VALIDA????O E EXTRA????O DE CHAVE NF-e', 'FUNÇÕES DE VALIDAÇÃO E EXTRAÇÃO DE CHAVE NF-e'],
  ['==================== COTA????ES ====================', '==================== COTAÇÕES ===================='],
  ['==================== NOTIFICA????ES ====================', '==================== NOTIFICAÇÕES ===================='],
  ['==================== RELAT??RIOS ====================', '==================== RELATÓRIOS ===================='],
  ['ROTAS DO M??DULO DE COMPRAS', 'ROTAS DO MÓDULO DE COMPRAS'],
  // Comments
  ['Valida????o de CNPJ', 'Validação de CNPJ'],
  ['Valida????o dos d??gitos verificadores', 'Validação dos dígitos verificadores'],
  ['Fun????o para criar notifica????o', 'Função para criar notificação'],
  ['Erro ao criar notifica????o:', 'Erro ao criar notificação:'],
  ['Validar chave de acesso NF-e (44 d??gitos + DV)', 'Validar chave de acesso NF-e (44 dígitos + DV)'],
  ['Calcular d??gito verificador usando m??dulo 11', 'Calcular dígito verificador usando módulo 11'],
  ['Fun????o helper para extrair valor', 'Função helper para extrair valor'],
  ['Dados do destinat??rio', 'Dados do destinatário'],
  ['Pedidos por status (??ltimos 30 dias)', 'Pedidos por status (últimos 30 dias)'],
  ['Buscar ??ltimas avalia????es', 'Buscar últimas avaliações'],
  ['Buscar ??ltimos pedidos', 'Buscar últimos pedidos'],
  ['Recalcular m??dias do fornecedor', 'Recalcular médias do fornecedor'],
  ['Buscar workflow de aprova????es', 'Buscar workflow de aprovações'],
  ['Gerar n??mero do pedido', 'Gerar número do pedido'],
  ['Verificar se precisa de aprova????o', 'Verificar se precisa de aprovação'],
  ['Buscar aprovadores necess??rios', 'Buscar aprovadores necessários'],
  ['Criar workflow de aprova????o', 'Criar workflow de aprovação'],
  ['Criar notifica????o para aprovador', 'Criar notificação para aprovador'],
  ['Pedido aguardando aprova????o', 'Pedido aguardando aprovação'],
  ['aguarda sua aprova????o.', 'aguarda sua aprovação.'],
  ['Buscar workflow pendente do usu??rio', 'Buscar workflow pendente do usuário'],
  ['Verificar se h?? mais aprova????es pendentes', 'Verificar se há mais aprovações pendentes'],
  ['Todas as aprova????es conclu??das', 'Todas as aprovações concluídas'],
  ['Erro ao processar aprova????o', 'Erro ao processar aprovação'],
  ['Listar cota????es', 'Listar cotações'],
  ['Erro ao listar cota????es:', 'Erro ao listar cotações:'],
  ['Erro ao buscar cota????es', 'Erro ao buscar cotações'],
  ['Criar cota????o', 'Criar cotação'],
  ['Gerar n??mero da cota????o', 'Gerar número da cotação'],
  ['Inserir cota????o', 'Inserir cotação'],
  ['Aqui voc?? pode implementar envio de email para fornecedor', 'Aqui você pode implementar envio de email para fornecedor'],
  ['Cota????o criada:', 'Cotação criada:'],
  ['Erro ao criar cota????o:', 'Erro ao criar cotação:'],
  ['Erro ao criar cota????o', 'Erro ao criar cotação'],
  ['FLUXO: Cota????o ??? Fornecedor ??? Pedido de Compra', 'FLUXO: Cotação -> Fornecedor -> Pedido de Compra'],
  ['1. Buscar a cota????o', '1. Buscar a cotação'],
  ['2. Buscar itens da cota????o (tabela pode n??o existir ainda)', '2. Buscar itens da cotação (tabela pode não existir ainda)'],
  ['Tabela cotacoes_itens pode n??o existir - continuar sem itens', 'Tabela cotacoes_itens pode não existir - continuar sem itens'],
  ['Tabela cotacoes_itens n??o encontrada, continuando sem itens', 'Tabela cotacoes_itens não encontrada, continuando sem itens'],
  ['6. Gerar n??mero do pedido de compra', '6. Gerar número do pedido de compra'],
  ['Buscar pre??o da proposta (se houver) ou usar pre??o de refer??ncia', 'Buscar preço da proposta (se houver) ou usar preço de referência'],
  ['Tabela pode n??o existir', 'Tabela pode não existir'],
  ['Pedido gerado a partir da cota????o', 'Pedido gerado a partir da cotação'],
  ['10. Atualizar status da cota????o para aprovada', '10. Atualizar status da cotação para aprovada'],
  ['12. Log da a????o', '12. Log da ação'],
  ['aprovada ??? Pedido', 'aprovada -> Pedido'],
  ['Erro ao aprovar cota????o e gerar pedido:', 'Erro ao aprovar cotação e gerar pedido:'],
  ['Buscar detalhes de uma cota????o espec??fica', 'Buscar detalhes de uma cotação específica'],
  ['Buscar cota????o', 'Buscar cotação'],
  ['Erro ao buscar cota????o:', 'Erro ao buscar cotação:'],
  ['Erro ao buscar cota????o', 'Erro ao buscar cotação'],
  ['Gerar n??mero do recebimento', 'Gerar número do recebimento'],
  ['Atualizar status do recebimento se houver diverg??ncia', 'Atualizar status do recebimento se houver divergência'],
  ['Listar notifica????es do usu??rio', 'Listar notificações do usuário'],
  ['Erro ao listar notifica????es:', 'Erro ao listar notificações:'],
  ['Erro ao buscar notifica????es', 'Erro ao buscar notificações'],
  ['Marcar notifica????o como lida', 'Marcar notificação como lida'],
  ['Erro ao marcar notifica????o:', 'Erro ao marcar notificação:'],
  ['Erro ao marcar notifica????o', 'Erro ao marcar notificação'],
  ['Validar formato da chave (44 d??gitos)', 'Validar formato da chave (44 dígitos)'],
  ['Chave de acesso inv??lida. Deve conter 44 d??gitos.', 'Chave de acesso inválida. Deve conter 44 dígitos.'],
  ['Validar d??gito verificador', 'Validar dígito verificador'],
  ['Chave de acesso inv??lida. D??gito verificador incorreto.', 'Chave de acesso inválida. Dígito verificador incorreto.'],
  ['Extrair informa????es da chave de acesso', 'Extrair informações da chave de acesso'],
  ['NF-e n??o encontrada ou n??o autorizada', 'NF-e não encontrada ou não autorizada'],
  ['retornar dados extra??dos da chave', 'retornar dados extraídos da chave'],
  ['N??o foi poss??vel consultar o SEFAZ. Dados extra??dos da chave de acesso.', 'Não foi possível consultar o SEFAZ. Dados extraídos da chave de acesso.'],
  ['D??gito verificador da chave ?? inv??lido', 'Dígito verificador da chave é inválido'],
  ['Relat??rio de compras por per??odo', 'Relatório de compras por período'],
  ['Erro ao gerar relat??rio:', 'Erro ao gerar relatório:'],
  ['Erro ao gerar relat??rio', 'Erro ao gerar relatório'],
  ['Relat??rio de top fornecedores', 'Relatório de top fornecedores'],
  // user-visible error messages
  ['Raz??o social ?? obrigat??ria', 'Razão social é obrigatória'],
  ['CNPJ ?? obrigat??rio', 'CNPJ é obrigatório'],
  ['CNPJ inv??lido', 'CNPJ inválido'],
  ['Telefone ?? obrigat??rio', 'Telefone é obrigatório'],
  ['Email inv??lido', 'Email inválido'],
  ['CNPJ j?? existe', 'CNPJ já existe'],
  ['CNPJ j?? cadastrado', 'CNPJ já cadastrado'],
  ['Gerar c??digo do fornecedor', 'Gerar código do fornecedor'],
  ['Fornecedor n??o encontrado', 'Fornecedor não encontrado'],
  ['Pedido n??o encontrado', 'Pedido não encontrado'],
  ['Fornecedor e itens s??o obrigat??rios', 'Fornecedor e itens são obrigatórios'],
  ['Voc?? n??o tem permiss??o para aprovar este pedido', 'Você não tem permissão para aprovar este pedido'],
  ['Cota????o n??o encontrada', 'Cotação não encontrada'],
  ['Fornecedor ?? obrigat??rio', 'Fornecedor é obrigatório'],
  ['Chave de acesso n??o informada', 'Chave de acesso não informada'],
];

const fixesRoutes = [
  ['relat??rios, centros de custo)', 'relatórios, centros de custo)'],
  ['est??o em compras-extended.js', 'estão em compras-extended.js'],
  ['RELAT??RIOS DE COMPRAS', 'RELATÓRIOS DE COMPRAS'],
  ['Relat??rio de gastos por per??odo', 'Relatório de gastos por período'],
  ['Estat??sticas de Recebimento', 'Estatísticas de Recebimento'],
  ['estat??sticas de recebimento:', 'estatísticas de recebimento:'],
  ['Produ????o', 'Produção'],
];

function applyFixes(file, fixList) {
  let content = fs.readFileSync(file, 'utf8');
  const before = (content.match(/\?\?/g) || []).length;
  for (const [from, to] of fixList) {
    content = content.split(from).join(to);
  }
  const after = (content.match(/\?\?/g) || []).length;
  fs.writeFileSync(file, content, 'utf8');
  console.log(`${require('path').basename(file)}: antes=${before} restantes=${after}`);
}

applyFixes('src/routes/compras.js', fixes);
applyFixes('routes/compras-routes.js', fixesRoutes);
console.log('Done.');
