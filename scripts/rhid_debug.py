import json, urllib.request, ssl
ctx = ssl.create_default_context()

req = urllib.request.Request(
    'https://www.rhid.com.br/v2/login.svc/',
    data=json.dumps({'email':'adm@laboreletric.com.br','password':'7865'}).encode(),
    headers={'Content-Type':'application/json'}
)
token = json.loads(urllib.request.urlopen(req, context=ctx).read())['accessToken']

req2 = urllib.request.Request(
    'https://www.rhid.com.br/v2/customerdb/person.svc/a',
    headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'}
)
raw = urllib.request.urlopen(req2, context=ctx).read()
data = json.loads(raw)

print('TYPE:', type(data))
print('LEN:', len(data))
if isinstance(data, list) and len(data) > 0:
    first = data[0]
    print('FIRST TYPE:', type(first))
    if isinstance(first, dict):
        print('KEYS:', list(first.keys())[:20])
        print('FIRST:', json.dumps(first, indent=2, ensure_ascii=False)[:500])
    elif isinstance(first, str):
        print('FIRST:', first[:200])
        # Maybe it's a flat list with alternating keys/values
        for i, item in enumerate(data[:20]):
            print(f'  [{i}]: {type(item).__name__} = {str(item)[:100]}')
elif isinstance(data, dict):
    print('KEYS:', list(data.keys())[:20])
    for k in list(data.keys())[:5]:
        v = data[k]
        print(f'  {k}: {type(v).__name__} = {str(v)[:200]}')
