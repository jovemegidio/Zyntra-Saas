# AUDITORIA VPS — ZYNTRA/ALUFORCE ERP
**Data:** 17 de março de 2026  
**VPS:** 31.97.64.102  
**OS:** Ubuntu 22.04.5 LTS (Jammy Jellyfish)  
**Hardware:** 1 vCPU / 3.8 GB RAM / 49 GB Disco  

---

## RESUMO EXECUTIVO

| Categoria | Status |
|-----------|--------|
| **Disponibilidade** | ⚠️ DEGRADADA — Load average 15x acima do ideal |
| **Estabilidade** | 🔴 CRÍTICA — WhatsApp bot: 600.513 restarts, App: 77 restarts |
| **Memória** | 🔴 CRÍTICA — 76% usada (2.9/3.8 GB), sem Swap, Heap 90% |
| **Disco** | ⚠️ ATENÇÃO — 77% usado (37/49 GB) |
| **Segurança** | ⚠️ ATENÇÃO — NODE_ENV inconsistente, app como root, fail2ban inativo |
| **SSL** | ⚠️ Cert expira em 33 dias (auto-renew configurado) |
| **Nginx** | ✅ OK — Configuração válida |
| **Redis** | ✅ OK — Respondendo (PONG) |
| **MySQL** | ✅ OK — v8.0.45, ouvindo em 127.0.0.1:3306 |
| **Node.js** | ✅ OK — v20.20.0 / NPM 10.8.2 |

---

## 🔴 PROBLEMAS CRÍTICOS (Ação Imediata)

### 1. WhatsApp Bot em crash loop infinito
| Detalhe | Valor |
|---------|-------|
| Restarts | **600.513** (recorde catastrófico) |
| Uptime | 2-3 segundos antes de crashar novamente |
| Processos Chrome | **70 processos** consumindo CPU/RAM |

**Impacto:** Cada restart spawna processos Chrome/Puppeteer que não morrem corretamente, causando leak massivo de memória e CPU. Essa é a causa raiz de praticamente todos os problemas de performance da VPS.

**Ação:**
```bash
# 1. Parar IMEDIATAMENTE o bot
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot

# 2. Matar processos Chrome órfãos
pkill -f chrome
pkill -f chromium

# 3. Verificar causa do crash antes de reiniciar
# NÃO reiniciar até corrigir o bug
```

---

### 2. Load Average extremamente alta (15.37 / 12.66 / 10.70)
- **Ideal para 1 vCPU:** < 1.0
- **Atual:** 15x o máximo recomendado
- **Processos em fila:** 32 de 1058 total

**Causa raiz:** WhatsApp bot crashando + 70 processos Chrome + `pm2 monit --no-daemon` consumindo CPU.

**Ação:** Resolver itens 1 e 5 primeiro. Load vai normalizar drasticamente.

---

### 3. Memória saturada — Sem Swap
| Métrica | Valor |
|---------|-------|
| Total | 3.8 GB |
| Usada | 2.9 GB (76%) |
| Livre | 167 MB |
| Disponível | 623 MB |
| Swap | **0 B** (não configurado) |

**Top consumidores:**
| Processo | %MEM | RSS |
|----------|------|-----|
| MySQL | 19.4% | 779 MB |
| n8n | 6.2% | 249 MB |
| PM2 God Daemon | 4.8% | 193 MB |
| aluforce-dashboard | 4.5% | 183 MB |
| zyntra-demo | 3.7% | 149 MB |
| pm2 monit | 2.1% | 85 MB |
| Xorg | 2.0% | 81 MB |
| + Chrome (70 procs) | ~15%+ | estimado ~600 MB |

**Ação:**
```bash
# Criar swap de 4GB (URGENTE)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

---

### 4. NODE_ENV inconsistente (Produção com config Dev)
| Arquivo .env | PM2 show |
|-------------|----------|
| `NODE_ENV=production` | `node env: development` ← **ERRADO** |

**Impacto direto:**
- Rate limiting em modo dev (5000 req vs 3000 req em prod)
- Auth rate limit: 100 tentativas vs 5 em prod
- `console.log` não silenciado (logs volumosos)
- Watch mode habilitado (causa restarts desnecessários)
- Sem validação obrigatória de JWT_SECRET

**Causa:** PM2 foi iniciado sem `--env production`. O .env define `NODE_ENV=production` mas o PM2 usa o default `env` que é `development`.

**Ação:**
```bash
# Corrigir NODE_ENV no PM2
pm2 delete aluforce-dashboard
pm2 start ecosystem.config.js --env production
pm2 save
```

---

### 5. Heap Usage a 90% — Risco de OOM Kill
| Métrica | Valor |
|---------|-------|
| Used Heap | 92.66 MiB |
| Total Heap | 102.78 MiB |
| Heap Usage | **90.15%** |
| Event Loop P95 | 182.33 ms |
| HTTP P95 Latency | **603.8 ms** |

O `--max-old-space-size=4096` (4GB) está alocado mas a instância só tem 3.8GB de RAM total.

**Ação:** Reduzir para 1024MB e usar cluster mode.

---

## ⚠️ PROBLEMAS DE ALTA PRIORIDADE

### 6. Aplicação rodando como `root`
Todos os processos PM2 rodam como user `root`. Em caso de exploit, o atacante ganha acesso total.

**Ação:**
```bash
# Criar usuário dedicado
useradd -m -s /bin/bash aluforce
chown -R aluforce:aluforce /var/www/aluforce
# Atualizar PM2 para rodar como aluforce
```

---

### 7. Fork mode em produção (sem cluster / sem HA)
| Configuração | Valor |
|-------------|-------|
| exec_mode | `fork_mode` |
| instances | 1 |
| watch | **enabled** em produção |

O `ecosystem.production.config.js` define 4 instâncias em cluster, mas **não é usado**.
Em fork mode, um crash = downtime total até o restart.

**Ação:** Migrar para cluster mode com 2 instâncias (1 vCPU permite 2 via hyperthreading):
```bash
pm2 delete aluforce-dashboard
pm2 start ecosystem.production.config.js --env production
pm2 save
```

---

### 8. Processo `pm2 monit --no-daemon` rodando 24/7
- PID 1860460, rodando desde 10/Mar
- Consumindo **2.1% RAM** (85 MB) e **2.6% CPU**
- É um monitor interativo, **não deve rodar como daemon**

**Ação:**
```bash
kill 1860460
```

---

### 9. Fail2ban inativo / não instalado
SSH exposto na porta 22 sem proteção contra brute-force.

**Ação:**
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

### 10. Porta 3000 exposta diretamente na internet
A aplicação Node.js ouve em `0.0.0.0:3000`, acessível sem passar pelo Nginx.
Nginx já faz proxy, então 3000 deveria ser apenas `127.0.0.1`.

**Ação:** No server.js, alterar `HOST` para `127.0.0.1` em produção, ou adicionar ao UFW:
```bash
ufw deny 3000
ufw deny 3003
```

---

### 11. SSL Certificate expira em 33 dias (20/Abr/2026)
| Domínio | Expira | Status |
|---------|--------|--------|
| aluforce.api.br | 20/04/2026 | VALID (33 dias) |
| n8n.aluforce.api.br | 04/06/2026 | VALID (78 dias) |

Crontab de renovação está configurado: `0 3 * * * certbot renew --quiet`
Porém, verificar se a renovação está de fato funcionando:
```bash
certbot renew --dry-run
```

---

## ⚠️ PROBLEMAS MÉDIOS

### 12. Disco 77% usado — 12 GB livres
| Conteúdo | Tamanho |
|----------|---------|
| /var/www/aluforce/ | **8.0 GB** |
| ↳ node_modules/ | 1.2 GB |
| ↳ logs/ | 51 MB |
| ↳ uploads/ | 1 MB |
| PM2 logs (/root/.pm2/logs/) | **423 MB** |
| **Resto do disco** | ~29 GB (sistema, MySQL, Docker, etc.) |

**Ação:**
```bash
# Limpar logs PM2 antigos
pm2 flush

# Limpar caches npm
npm cache clean --force

# Verificar diretórios pesados
du -sh /var/www/aluforce/*/ | sort -rh | head -20
```

---

### 13. `zyntra-demo` consumindo recursos desnecessariamente
- 149 MB de RAM / Porta 3003
- É um ambiente demo — necessário em produção?

---

### 14. Xorg (GUI) rodando no servidor
- Processo Xorg consumindo 81 MB
- Servidores não precisam de interface gráfica

---

### 15. AnyDesk na porta 7070
Acesso remoto via AnyDesk aberto externamente. Potencial vetor de ataque.

---

## ✅ PONTOS POSITIVOS

| Item | Status |
|------|--------|
| Nginx | Configuração válida, headers de segurança, rate limiting, SSL/TLS 1.2+ |
| Redis | Ativo e respondendo, bind localhost |
| MySQL | v8.0.45, bind localhost |
| UFW | Ativo com regras básicas |
| Let's Encrypt | Certificados válidos, cron de renovação configurado |
| Backup MySQL | Cron diário às 2h da manhã |
| WAF Application | Implementado (path traversal, SQLi, XSS, bot detection) |
| Security Middleware | Rate limiting multi-camada, sanitização, helmet, CSRF |
| Auth Central | JWT HS256, token blacklist, inactivity timeout |
| Circuit Breaker | Implementado para DB, SMTP, Discord, n8n |
| Prometheus Metrics | Endpoint /metrics com proteção de rede |
| Security Logger | Winston dedicado com rotação (10 MB x 10 files) |
| PII Sanitizer | Implementado para logs LGPD |
| Redis Rate Limiting | Store compartilhada para cluster mode |

---

## PLANO DE AÇÃO PRIORIZADO

### Fase 1 — Emergência (AGORA)
| # | Ação | Impacto |
|---|------|---------|
| 1 | Parar whatsapp-bot e matar processos Chrome | Libera ~1 GB RAM + reduz CPU 80% |
| 2 | Matar `pm2 monit --no-daemon` | Libera 85 MB RAM + 2.6% CPU |
| 3 | Criar swap de 4 GB | Previne OOM kill |
| 4 | Restartar app com `--env production` | Corrige NODE_ENV, ativa segurança produção |

**Resultado esperado:** Load average cai de 15 → 1-2, RAM livre > 1.5 GB.

### Fase 2 — Estabilização (Hoje/Amanhã)
| # | Ação | Impacto |
|---|------|---------|
| 5 | Cluster mode (2 instâncias) | Zero-downtime deploys, HA |
| 6 | Ajustar `--max-old-space-size=1024` | Previne heap overflow |
| 7 | Instalar fail2ban | Proteção brute-force SSH |
| 8 | Bloquear porta 3000/3003 no UFW | Forçar tráfego via Nginx |
| 9 | `pm2 flush` para limpar logs | Libera 423 MB de disco |

### Fase 3 — Hardening (Esta Semana)
| # | Ação | Impacto |
|---|------|---------|
| 10 | Criar usuário não-root para PM2 | Princípio do menor privilégio |
| 11 | Corrigir whatsapp-bot (bug raiz) | Automação WhatsApp funcional |
| 12 | Avaliar zyntra-demo em prod | Libera 150 MB se removido |
| 13 | Remover Xorg/GUI do servidor | Libera 81 MB + reduz superfície de ataque |
| 14 | Desabilitar AnyDesk ou fechar no UFW | Reduz superfície de ataque |
| 15 | Verificar `certbot renew --dry-run` | Garantir renovação automática SSL |

### Fase 4 — Otimização (Próxima Sprint)
| # | Ação | Impacto |
|---|------|---------|
| 16 | Configurar swappiness=10 | Menos swap thrashing |
| 17 | Docker compose migration (nginx+app) | Deploys reproduzíveis |
| 18 | Limpeza do diretório (8 GB → <3 GB?) | Mais espaço livre |
| 19 | Monitoramento externo (UptimeRobot) | Alertas de downtime |
| 20 | Backup offsite (S3/MinIO) | Disaster recovery |

---

## SCRIPT DE EMERGÊNCIA (Fase 1)

```bash
#!/bin/bash
# ZYNTRA — Script de Emergência VPS
# Executa Fase 1 do plano de ação

set -e

echo "🚨 [1/4] Parando whatsapp-bot..."
pm2 stop whatsapp-bot 2>/dev/null || true
pm2 delete whatsapp-bot 2>/dev/null || true

echo "🔪 [1.5/4] Matando processos Chrome órfãos..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true

echo "🔪 [2/4] Matando pm2 monit daemon..."
pkill -f "pm2 monit" 2>/dev/null || true

echo "💾 [3/4] Criando swap de 4GB..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "  Swap criado com sucesso!"
else
    echo "  Swap já existe."
fi

echo "🔄 [4/4] Reiniciando app em modo produção..."
pm2 delete aluforce-dashboard 2>/dev/null || true
cd /var/www/aluforce
pm2 start ecosystem.config.js --env production --name aluforce-dashboard
pm2 save

echo ""
echo "✅ Fase 1 concluída! Verificando status..."
sleep 5
free -h
echo ""
cat /proc/loadavg
echo ""
pm2 list
```

---

*Relatório gerado automaticamente por auditoria de infraestrutura em 17/03/2026.*
