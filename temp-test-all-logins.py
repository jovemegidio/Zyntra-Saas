#!/usr/bin/env python3
"""
Test all 58 users against the login API with password alu0103.
Users marked ativo=0 are expected to return 403 (inactive).
ti@ is a special case (unknown original password).
"""
import urllib.request, json, ssl, time, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URL = 'https://aluforce.api.br/api/auth/login'
SENHA = 'alu0103'

# All users: (email, ativo)
USERS = [
    ('adm@aluforce.ind.br', 1),
    ('aluforce@aluforce.ind.br', 1),
    ('ana.nascimento@aluforce.ind.br', 1),
    ('ariel.leandro@aluforce.ind.br', 0),
    ('augusto.santos@aluforce.ind.br', 1),
    ('bruno.freitas@aluforce.ind.br', 1),
    ('christian.santos@aluforce.ind.br', 1),
    ('clayton.costa@aluforce.ind.br', 1),
    ('cleiton@aluforce.ind.br', 1),
    ('compras@aluforce.ind.br', 1),
    ('cristian@aluforce.ind.br', 1),
    ('daniel.brito@aluforce.ind.br', 1),
    ('diego.lucena@lumiereassessoria.com.br', 1),
    ('fabiano.oliveira@aluforce.ind.br', 1),
    ('fabiola.souza@aluforce.ind.br', 1),
    ('felipe.santos@aluforce.ind.br', 0),
    ('fernando.kofugi@aluforce.ind.br', 1),
    ('financeiro2@aluforce.ind.br', 1),
    ('financeiro3@aluforce.ind.br', 1),
    ('flavio.bezerra@aluforce.ind.br', 0),
    ('jamerson.ribeiro@lumiereassessoria.com.br', 1),
    ('joao.victor@aluforce.ind.br', 1),
    ('kissia@aluforce.ind.br', 0),
    ('lais.luna@aluforce.ind.br', 0),
    ('leo@aluforce.ind.br', 1),
    ('leonardo.freitas@aluforce.ind.br', 1),
    ('logistica@aluforce.ind.br', 1),
    ('lorena@aluforce.ind.br', 1),
    ('lucio.silva@aluforce.ind.br', 1),
    ('luizhenrique@aluforce.ind.br', 1),
    ('marcos.filho@aluforce.ind.br', 1),
    ('mauricio.torrolho@lumiereassessoria.com.br', 1),
    ('miqueias.abrantes@temp.com', 1),
    ('nicolas.santana@aluforce.ind.br', 0),
    ('paula.souza@aluforce.ind.br', 1),
    ('pcp@aluforce.ind.br', 1),
    ('qacompras@aluforce.ind.br', 1),
    ('qafinanceiro@aluforce.ind.br', 1),
    ('qanfe@aluforce.ind.br', 1),
    ('qapainel@aluforce.ind.br', 1),
    ('qapcp@aluforce.ind.br', 1),
    ('qarh@aluforce.ind.br', 1),
    ('qavendas@aluforce.ind.br', 1),
    ('ramon.lima@aluforce.ind.br', 1),
    ('regina.ballotti@aluforce.ind.br', 1),
    ('rh@aluforce.ind.br', 1),
    ('robson.goncalves@aluforce.ind.br', 1),
    ('ronaldo.santana@aluforce.ind.br', 1),
    ('ronaldo.torres@aluforce.ind.br', 1),
    ('sarah@aluforce.ind.br', 0),
    ('sergio@aluforce.ind.br', 1),
    ('silvio.nascimento@aluforce.ind.br', 1),
    ('thaina.freitas@aluforce.ind.br', 0),
    ('ti@aluforce.ind.br', 1),
    ('vendas4@aluforce.ind.br', 1),
    ('vera.souza@aluforce.ind.br', 1),
    ('willian.silva@aluforce.ind.br', 1),
]

results = {'ok': [], 'inactive': [], 'wrong_pass': [], 'error': []}

print(f"{'EMAIL':<48} {'STATUS':<8} {'RESULT'}", flush=True)
print("=" * 90, flush=True)

for email, ativo in USERS:
    payload = json.dumps({'email': email, 'password': SENHA}).encode()
    req = urllib.request.Request(URL, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            body = json.loads(r.read())
            user = body.get('user', body)
            nome = user.get('nome', '')[:30]
            role = user.get('role', user.get('cargo', ''))
            tag = '[OK]'
            results['ok'].append(email)
            print(f"{email:<48} {'ativo' if ativo else 'inativo':<8} {tag}  {nome} ({role})")
    except urllib.error.HTTPError as e:
        body_str = e.read().decode()[:120]
        try:
            msg = json.loads(body_str).get('message', body_str)
        except Exception:
            msg = body_str
        if e.code == 403:
            tag = f'[INATIVO {e.code}]'
            results['inactive'].append(email)
        elif e.code == 401:
            tag = f'[SENHA ERRADA {e.code}]'
            results['wrong_pass'].append(email)
        else:
            tag = f'[HTTP {e.code}]'
            results['error'].append(email)
        expected = '(esperado)' if (e.code == 403 and not ativo) else ''
        print(f"{email:<48} {'ativo' if ativo else 'inativo':<8} {tag} {msg[:50]} {expected}")
    except Exception as ex:
        tag = f'[ERR] {ex}'
        results['error'].append(email)
        print(f"{email:<48} {'ativo' if ativo else 'inativo':<8} {tag}")
    time.sleep(0.15)  # gentle rate limiting

print("=" * 90)
print(f"\nSUMARIO:")
print(f"  [OK]      Login OK:      {len(results['ok'])}")
print(f"  [INATIVO] Conta inativa: {len(results['inactive'])}")
print(f"  [FAIL]    Senha errada:  {len(results['wrong_pass'])}")
print(f"  [ERR]     Outros erros:  {len(results['error'])}")
print(f"  TOTAL testado:    {len(USERS)}")

if results['wrong_pass']:
    print(f"\n[FAIL] Usuarios com senha errada (precisam de atencao):")
    for e in results['wrong_pass']:
        print(f"   - {e}")

if results['error']:
    print(f"\n[ERR] Erros inesperados:")
    for e in results['error']:
        print(f"   - {e}")

inactive_but_should_login = [e for e in results['inactive'] if dict(USERS).get(e, 1) == 1]
if inactive_but_should_login:
    print(f"\n[WARN] Ativos no DB mas retornaram 403 (conta inativa no sistema):")
    for e in inactive_but_should_login:
        print(f"   - {e}")
