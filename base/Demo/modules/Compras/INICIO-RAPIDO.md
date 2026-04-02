# 🚀 GUIA DE INÍCIO RÁPIDO - MÓDULO DE COMPRAS

## ⚡ 5 MINUTOS PARA COMEÇAR

### 1️⃣ **INSTALAR** (1 minuto)
```bash
cd Compras
npm install
```

### 2️⃣ **INICIAR** (30 segundos)
```bash
npm start
```

### 3️⃣ **ACESSAR** (10 segundos)
Abra o navegador: **http://localhost:3002**

---

## 📚 PRIMEIROS PASSOS

### **PASSO 1: Cadastrar Fornecedores**
1. Menu lateral → **Fornecedores**
2. Botão **➕ Novo Fornecedor**
3. Preencher dados obrigatórios:
   - ✅ Razão Social
   - ✅ CNPJ
4. **Salvar**

### **PASSO 2: Criar sua Primeira Requisição**
1. Menu lateral → **Requisições**
2. Botão **➕ Nova Requisição**
3. Preencher:
   - Solicitante (seu nome)
   - Departamento
   - Prioridade
   - Justificativa
4. **➕ Adicionar Item**
5. **📧 Enviar para Aprovação**

### **PASSO 3: Aprovar a Requisição**
1. Clicar na requisição criada
2. Botão **👁️ Visualizar**
3. Botão **✅ Aprovar**
4. Pronto! Pode converter em pedido

### **PASSO 4: Criar um Pedido**
1. Menu lateral → **Pedidos**
2. Botão **➕ Novo Pedido**
3. Selecionar fornecedor
4. Adicionar itens com preços
5. **💾 Salvar Pedido**

### **PASSO 5: Explorar o Dashboard**
1. Menu lateral → **Dashboard de Compras**
2. Visualize:
   - 📊 Métricas em tempo real
   - 📈 Gráficos
   - 📋 Pedidos recentes
   - 💰 Valores

---

## 🎯 CASOS DE USO RÁPIDOS

### **Caso 1: Compra Urgente**
```
Requisição → Prioridade: URGENTE → Aprovação Rápida → Pedido Direto
```

### **Caso 2: Melhor Preço**
```
Requisição → Cotação → 3 Fornecedores → Comparar → Selecionar Menor Preço → Pedido
```

### **Caso 3: Reposição de Estoque**
```
Alerta de Estoque Baixo → Requisição Automática → Aprovação → Pedido
```

---

## 🔑 ATALHOS ÚTEIS

| Ação | Caminho Rápido |
|------|----------------|
| Nova Requisição | Requisições → ➕ |
| Novo Pedido | Pedidos → ➕ |
| Nova Cotação | Cotações → ➕ |
| Novo Fornecedor | Fornecedores → ➕ |
| Ver Dashboard | Início → Dashboard |
| Buscar Pedido | Pedidos → 🔍 Buscar |

---

## 💡 DICAS PRO

✅ Use **prioridades** nas requisições (Urgente = resposta rápida)  
✅ Sempre faça **cotação** para compras acima de R$ 5.000  
✅ Configure **estoque mínimo** para alertas automáticos  
✅ Use **tags/categorias** para organizar fornecedores  
✅ Exporte relatórios em **CSV** para análises no Excel  

---

## ❓ PERGUNTAS FREQUENTES

### **Como aprovar uma requisição?**
Requisições → Clicar na requisição → Visualizar → Aprovar

### **Como comparar preços de cotação?**
Cotações → Abrir cotação → Analisar Propostas → Comparação automática

### **Como cadastrar um fornecedor?**
Fornecedores → Novo Fornecedor → Preencher dados → Salvar

### **Como gerar um relatório?**
Relatórios → Selecionar tipo → Filtrar período → Gerar

### **Como ver histórico de um pedido?**
Pedidos → Visualizar pedido → Aba "Histórico"

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

### **Problema: Servidor não inicia**
```bash
# Verificar se a porta 3002 está em uso
netstat -ano | findstr :3002

# Se estiver, mudar a porta no server.js
# ou matar o processo
```

### **Problema: Banco de dados não cria**
```bash
# Deletar arquivo compras.db e reiniciar
rm compras.db
npm start
```

### **Problema: Não aparecem dados**
- Limpar cache do navegador (Ctrl + F5)
- Verificar localStorage
- Recarregar a página

---

## 📱 PRÓXIMOS RECURSOS

- [ ] App Mobile
- [ ] Assinatura Digital
- [ ] Portal do Fornecedor
- [ ] BI Avançado

---

## 🎉 PRONTO!

Agora você tem um **sistema completo de compras** funcionando!

**Qualquer dúvida:** Consulte o `README-MODULO-COMPRAS.md`

---

**Boas compras! 🛒**
