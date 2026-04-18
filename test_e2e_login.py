import json, urllib.request, ssl, http.cookiejar

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ctx)
)

# Step 1: Login
print("=== STEP 1: Login ===")
data = json.dumps({"email": "ti@laboreletric.com.br", "password": "Labor@2026#Eletric"}).encode()
req = urllib.request.Request(
    "https://aluforce.api.br/labor-eletric/api/login",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    resp = opener.open(req)
    body = json.loads(resp.read())
    print(f"STATUS: {resp.status}")
    print(f"redirectTo: {body.get('redirectTo', 'N/A')}")
    print(f"user.email: {body.get('user', {}).get('email', 'N/A')}")
    print(f"success: {body.get('success', 'N/A')}")
    
    # Show cookies
    print(f"\nCookies set:")
    for c in cj:
        print(f"  {c.name} = {c.value[:30]}... (path={c.path}, domain={c.domain})")
    
    # Step 2: Access /api/me with the cookies
    print("\n=== STEP 2: /api/me ===")
    req2 = urllib.request.Request(
        "https://aluforce.api.br/labor-eletric/api/me",
        headers={"Accept": "application/json"},
        method="GET"
    )
    resp2 = opener.open(req2)
    body2 = json.loads(resp2.read())
    print(f"STATUS: {resp2.status}")
    print(f"user.email: {body2.get('email', 'N/A')}")
    print(f"user.nome: {body2.get('nome', 'N/A')}")
    
    # Step 3: Access dashboard
    print("\n=== STEP 3: Dashboard ===")
    req3 = urllib.request.Request(
        "https://aluforce.api.br/labor-eletric/dashboard",
        method="GET"
    )
    resp3 = opener.open(req3)
    print(f"STATUS: {resp3.status}")
    print(f"URL: {resp3.url}")
    html = resp3.read().decode('utf-8', errors='replace')[:500]
    if 'login' in html.lower():
        print("WARNING: Dashboard page contains 'login' - may be redirecting to login")
    if '<title>' in html:
        title = html.split('<title>')[1].split('</title>')[0]
        print(f"Title: {title}")
    
except urllib.error.HTTPError as e:
    body = json.loads(e.read())
    print(f"STATUS: {e.code}")
    print(f"message: {body.get('message', 'N/A')}")
    print(f"code: {body.get('code', 'N/A')}")
except Exception as e:
    print(f"ERROR: {e}")
