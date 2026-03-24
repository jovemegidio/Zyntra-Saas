"""Test logins with updated password alu0103"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URL = 'https://aluforce.api.br/api/auth/login'

tests = [
    ('ana.nascimento@aluforce.ind.br', 'alu0103'),
    ('ariel.leandro@aluforce.ind.br', 'alu0103'),
    ('augusto.santos@aluforce.ind.br', 'alu0103'),
    ('bruno.freitas@aluforce.ind.br', 'alu0103'),
    ('ti@aluforce.ind.br', 'Aluforce2026'),   # ti@ should use original password
    ('ti@aluforce.ind.br', 'alu0103'),         # should FAIL
]

print("=" * 70)
for email, senha in tests:
    payload = json.dumps({'email': email, 'password': senha}).encode()
    req = urllib.request.Request(URL, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            body = json.loads(r.read())
            user = body.get('user', body)
            nome = user.get('nome', '?')
            role = user.get('role', user.get('cargo', '?'))
            print(f"[OK {r.status}] {email:<40} senha={senha:<20} nome={nome} role={role}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:100]
        print(f"[FAIL {e.code}] {email:<40} senha={senha:<20} -> {body}")
    except Exception as ex:
        print(f"[ERR]  {email:<40} -> {ex}")
print("=" * 70)
