# SECURITY — Aluforce ERP

> **Atenção operacional:** este documento contém procedimentos que afetam a
> segurança do sistema em produção. Leia cada seção completamente antes de
> executar qualquer passo.

---

## 1. Rotação de Secrets (JWT, DB, SMTP)

Execute este procedimento sempre que:
- Um colaborador com acesso à VPS sai da empresa  
- Uma credencial for exposta (acidentalmente commitada, log, Slack, etc.)  
- A cada **6 meses** como manutenção preventiva

### 1.1 JWT_SECRET

O `JWT_SECRET` é usado para assinar todos os tokens de autenticação.

```bash
# 1. Gerar novo secret (256-bit hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Conectar na VPS
ssh root@31.97.64.102

# 3. Editar .env
nano /var/www/aluforce/.env
# Alterar: JWT_SECRET=<novo_valor>

# 4. Reiniciar com nova variável (forçar reload do .env)
cd /var/www/aluforce
pm2 restart all --update-env

# 5. EFEITO: todos os tokens emitidos antes da rotação são invalidados.
#    Usuários precisarão fazer login novamente.
```

### 1.2 REFRESH_SECRET

Mesmo procedimento do `JWT_SECRET`. Gere um valor diferente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Alterar REFRESH_SECRET no .env da VPS
# pm2 restart all --update-env
```

### 1.3 DB_PASSWORD (MySQL)

```bash
# 1. Alterar senha no MySQL (execute como root)
mysql -u root -p
ALTER USER 'aluforce'@'localhost' IDENTIFIED BY '<NOVA_SENHA>';
FLUSH PRIVILEGES;
EXIT;

# 2. Atualizar .env
nano /var/www/aluforce/.env
# DB_PASSWORD=<NOVA_SENHA>

# 3. Reiniciar app
pm2 restart all --update-env

# 4. Verificar conexão
curl -k https://localhost:3000/health
```

### 1.4 SMTP_PASS

```bash
# 1. Revogar app password antiga no provedor de email (Gmail/Outlook)
# 2. Gerar nova app password
# 3. Atualizar no .env
nano /var/www/aluforce/.env
# SMTP_PASS=<NOVA_SENHA>
pm2 restart all --update-env
```

### 1.5 VPS Root Password

```bash
# Na VPS, como root:
passwd
# Digitar nova senha duas vezes

# IMPORTANTE: atualizar referência local
# - Remover entradas salvas no seu gerenciador de senhas
# - Variável de ambiente LOCAL (para scripts de deploy):
#   Editar ~/.bash_profile ou ~/.zshrc:
#   export VPS_PASSWORD='<NOVA_SENHA>'
```

> **Histórico git comprometido**: a senha `Aluforce@2026#Vps` foi commitada
> anteriormente. Troque **imediatamente** e considere o histórico público.
> Para sanitizar o histórico: `git filter-repo --replace-text <(echo 'SenhaAntiga==>REMOVIDO')`
> — porém isso reescreve o histórico e requer force-push.

---

## 2. NF-e: Transição para Produção

### 2.1 Pré-requisitos

| Item | Como obter |
|------|-----------|
| Certificado digital A1 (`.pfx` ou `.p12`) | Contabilidade / Certisign / Serasa |
| CNPJ do emitente habilitado na SEFAZ | Verificar no portal da Secretaria de Fazenda do estado |
| Contador/responsável fiscal | Para homologar o ambiente SEFAZ |

### 2.2 Passos para ativar em produção

```bash
# Na VPS, como root:

# 1. Copiar certificado para diretório seguro
mkdir -p /var/www/aluforce/certs
chmod 700 /var/www/aluforce/certs
cp certificado.p12 /var/www/aluforce/certs/
chmod 600 /var/www/aluforce/certs/certificado.p12

# 2. Configurar .env
nano /var/www/aluforce/.env
# NFE_AMBIENTE=producao
# NFE_CERT_PATH=/var/www/aluforce/certs/certificado.p12
# NFE_CERT_PASSWORD=senha_do_certificado
# NFE_CNPJ_EMITENTE=00000000000000    (sem pontuação)
# NFE_SERVICE_URL=http://localhost:3003  (porta do serviço NF-e interno)

# 3. Testar com 1 NF-e em HOMOLOGAÇÃO antes de mudar NFE_AMBIENTE
#    (mude de volta para homologacao para o teste, depois producao)

# 4. Reiniciar
pm2 restart all --update-env
```

### 2.3 Verificação pós-ativação

```bash
# Checar logs do serviço NF-e
pm2 logs --lines 50 | grep -i nfe

# Tentar faturar um pedido de baixo valor para confirmar
# A resposta deve conter: "nfe_gerada": true, "nfe_chave": "...44 dígitos..."
```

### 2.4 Rollback rápido

Se a NF-e em produção falhar:

```bash
# O sistema já está configurado para continuar sem NF-e (degraded mode).
# O pedido é faturado normalmente; a chave NF-e fica nula.
# Para forçar homologação imediata:
nano /var/www/aluforce/.env
# NFE_AMBIENTE=homologacao
pm2 restart all --update-env
```

---

## 3. Redis — Ativar Cache Distribuído

Necessário quando PM2 roda com `instances > 1` (cluster mode).

```bash
# Na VPS:

# 1. Instalar Redis
apt update && apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 2. Verificar que está escutando só localhost (padrão seguro)
grep "^bind" /etc/redis/redis.conf
# Deve ter: bind 127.0.0.1 ::1

# 3. Configurar .env
nano /var/www/aluforce/.env
# REDIS_URL=redis://localhost:6379

# 4. Instalar pacotes Node
cd /var/www/aluforce
npm install redis rate-limit-redis --save

# 5. Reiniciar PM2
pm2 restart all --update-env

# 6. Verificar no log
pm2 logs --lines 20 | grep -i redis
# Deve aparecer: "⚡ Cache Redis distribuído ativo"
#               "⚡ Rate limiting Redis distribuído ativo"
```

---

## 4. Backup de Certificados e Secrets

Faça backup **criptografado** dos seguintes itens:

```
/var/www/aluforce/.env
/var/www/aluforce/certs/certificado.p12
```

```bash
# Exemplo: backup criptografado com GPG
tar czf secrets-backup-$(date +%Y%m%d).tar.gz \
    /var/www/aluforce/.env \
    /var/www/aluforce/certs/

gpg --symmetric --cipher-algo AES256 \
    secrets-backup-$(date +%Y%m%d).tar.gz

# Guardar o .tar.gz.gpg em local seguro FORA da VPS
# (pen drive criptografado, cofre, gerenciador de senhas corporativo)
```

---

## 5. Checklist de Segurança — Pré-Deploy Produção

- [ ] `.env` não está versionado no git (`git status` não mostra `.env`)
- [ ] `JWT_SECRET` tem ≥ 64 caracteres aleatórios
- [ ] `DB_PASSWORD` não é padrão de instalação  
- [ ] `CORS_ORIGIN` aponta para domínios HTTPS válidos (sem `*`)
- [ ] `NODE_ENV=production`
- [ ] `SKIP_MIGRATIONS=0`
- [ ] Redis configurado (se PM2 cluster mode)
- [ ] Backup MySQL rodando (crontab: `crontab -l`)
- [ ] Certificado SSL HTTPS válido (Let's Encrypt)
- [ ] `NFE_AMBIENTE=homologacao` até obter certificado A1

---

*Última revisão: 2026-03-26*
