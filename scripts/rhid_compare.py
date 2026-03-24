import json, urllib.request, ssl, subprocess
ctx = ssl.create_default_context()

# Login
req = urllib.request.Request(
    'https://www.rhid.com.br/v2/login.svc/',
    data=json.dumps({'email':'adm@laboreletric.com.br','password':'7865'}).encode(),
    headers={'Content-Type':'application/json'}
)
token = json.loads(urllib.request.urlopen(req, context=ctx).read())['accessToken']

# Get persons
req2 = urllib.request.Request(
    'https://www.rhid.com.br/v2/customerdb/person.svc/a',
    headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'}
)
raw_data = json.loads(urllib.request.urlopen(req2, context=ctx).read())
persons = raw_data.get('data', raw_data) if isinstance(raw_data, dict) else raw_data

total = len(persons) if isinstance(persons, list) else 0
active = [p for p in persons if p.get('status') == 1] if isinstance(persons, list) else []
inactive = [p for p in persons if p.get('status') != 1] if isinstance(persons, list) else []

print(f"TOTAL RHID: {total} | Ativos: {len(active)} | Inativos: {len(inactive)}")
print(f"recordsInDB: {raw_data.get('recordsInDB','?')} | userLimit: {raw_data.get('userLimit','?')}")
print("="*120)
print(f"{'ID':>5} | {'NOME':<40} | {'PIS':<15} | {'CPF':<15} | {'REG':<10} | STATUS")
print("-"*120)
for p in sorted(persons, key=lambda x: x.get('name','')):
    pid = str(p.get('id',''))
    name = p.get('name','')[:40]
    pis = str(p.get('pis','')) if p.get('pis') else ''
    cpf = str(p.get('cpf','')) if p.get('cpf') else ''
    reg = str(p.get('registration','')) if p.get('registration') else ''
    status = 'Ativo' if p.get('status') == 1 else 'Inativo'
    print(f"{pid:>5} | {name:<40} | {pis:<15} | {cpf:<15} | {reg:<10} | {status}")

# Get today's marcacoes from RHiD
print("\n\n" + "="*120)
print("MARCACOES RHID HOJE (2026-03-06)")
print("="*120)
active_ids = [p['id'] for p in active]
req3 = urllib.request.Request(
    'https://www.rhid.com.br/v2/report.svc/apuracao_ponto',
    data=json.dumps({
        'idPerson': active_ids,
        'ini': '20260306',
        'fim': '20260306'
    }).encode(),
    headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'}
)
marc_raw = json.loads(urllib.request.urlopen(req3, context=ctx).read())
marc_list = marc_raw if isinstance(marc_raw, list) else marc_raw.get('data', marc_raw.get('result', []))

total_marc = 0
for day in marc_list:
    name = day.get('name','?')
    pis = str(day.get('pis',''))
    punches = day.get('listAfdtManutencao', [])
    visible = [pp for pp in punches if not pp.get('oculto')]
    if visible:
        for punch in visible:
            dt = punch.get('dateTimeStr','')
            total_marc += 1
            es = punch.get('_typeEntradaSaida','')
            tipo = 'Entrada' if es == 'E' else 'Saida' if es == 'S' else es
            print(f"  {name:<35} | PIS: {pis:<15} | {dt:<25} | {tipo}")
    else:
        print(f"  {name:<35} | PIS: {pis:<15} | SEM MARCACOES HOJE")

print(f"\nTotal marcacoes RHiD hoje: {total_marc}")

# Check local DB marcacoes
result = subprocess.run([
    'mysql', '-u', 'aluforce', '-pAluforce2026VpsDB', 'aluforce_vendas', '-N', '-e',
    "SELECT pm.id, f.nome_completo, pm.pis, pm.data, pm.hora, pm.tipo, pm.origem FROM ponto_marcacoes pm LEFT JOIN funcionarios f ON pm.funcionario_id = f.id WHERE pm.data = '2026-03-06' ORDER BY pm.hora;"
], capture_output=True, text=True)
print("\n\n" + "="*120)
print("MARCACOES LOCAIS HOJE (banco aluforce_vendas)")
print("="*120)
lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
print(f"Total no banco local: {len(lines)}")
for line in lines:
    print(f"  {line}")

# Check local employees count
result2 = subprocess.run([
    'mysql', '-u', 'aluforce', '-pAluforce2026VpsDB', 'aluforce_vendas', '-N', '-e',
    "SELECT COUNT(*) as total, SUM(CASE WHEN ativo=1 AND (status='Ativo' OR status='ativo') THEN 1 ELSE 0 END) as ativos FROM funcionarios;"
], capture_output=True, text=True)
print("\n\n" + "="*120)
print("FUNCIONARIOS LOCAIS")
print("="*120)
print(f"  {result2.stdout.strip()}")

result3 = subprocess.run([
    'mysql', '-u', 'aluforce', '-pAluforce2026VpsDB', 'aluforce_vendas', '-N', '-e',
    "SELECT id, nome_completo, pis_pasep, status, ativo FROM funcionarios WHERE ativo=1 ORDER BY nome_completo;"
], capture_output=True, text=True)
local_lines = result3.stdout.strip().split('\n') if result3.stdout.strip() else []
print(f"  Funcionarios ativos locais: {len(local_lines)}")
for line in local_lines:
    print(f"  {line}")
