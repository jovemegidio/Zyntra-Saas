import json, http.client, ssl, http.cookiejar
from urllib.request import Request, build_opener, HTTPCookieProcessor, HTTPSHandler

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

handler = HTTPSHandler(context=ctx)
cj = http.cookiejar.CookieJar()
opener = build_opener(HTTPCookieProcessor(cj), handler)

base = "https://aluforce.api.br"

# Step 1: Login through nginx
print("=== STEP 1: LOGIN ===")
body = json.dumps({"email": "ti@laboreletric.com.br", "password": "Aluforce@2024"}).encode()
req = Request(f"{base}/labor-eletric/api/login", data=body, method="POST")
req.add_header("Content-Type", "application/json")

try:
    resp = opener.open(req)
    data = json.loads(resp.read())
    print(f"Status: {resp.status}")
    print(f"redirectTo: {data.get('redirectTo', 'N/A')}")
    print(f"user: {data.get('user', {}).get('email', 'N/A')}")
    
    # Show cookies
    print("\nCookies after login:")
    for c in cj:
        print(f"  {c.name} = {c.value[:30]}... path={c.path} domain={c.domain} secure={c.secure}")
    
    # Step 2: Try /api/me through nginx  
    print("\n=== STEP 2: /api/me ===")
    req2 = Request(f"{base}/labor-eletric/api/me")
    resp2 = opener.open(req2)
    me_data = json.loads(resp2.read())
    print(f"Status: {resp2.status}")
    print(f"user: {me_data.get('email', me_data.get('nome', 'N/A'))}")

    # Step 3: Try dashboard through nginx
    print("\n=== STEP 3: /labor-eletric/dashboard ===")
    req3 = Request(f"{base}/labor-eletric/dashboard")
    resp3 = opener.open(req3)
    html = resp3.read().decode('utf-8', errors='replace')
    print(f"Status: {resp3.status}")
    print(f"Final URL: {resp3.url}")
    # Check if it contains login or dashboard content
    if 'login' in resp3.url.lower():
        print("PROBLEM: Redirected back to login!")
    if '<title>' in html:
        import re
        title = re.search(r'<title>(.*?)</title>', html)
        print(f"Title: {title.group(1) if title else 'N/A'}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    
    # Show cookies even on error
    print("\nCookies:")
    for c in cj:
        print(f"  {c.name} = {c.value[:30]}... path={c.path} domain={c.domain}")
import json, http.client, ssl, subprocess

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Get users from DB
result = subprocess.run(
    ["mysql", "-u", "aluforce", "-pAluforce2026VpsDB", "labor_eletric_vendas",
     "-N", "-e", "SELECT id, email, ativo FROM users WHERE email LIKE '%ti%' OR email LIKE '%admin%' LIMIT 5"],
    capture_output=True, text=True
)
print("=== USERS ===")
print(result.stdout.strip())

# Try login with common passwords
passwords = ["Aluforce@2024", "Aluforce@2026", "Labor@2024", "Labor@2026", "123456"]
for pwd in passwords:
    conn = http.client.HTTPConnection("127.0.0.1", 4001)
    body = json.dumps({"email": "ti@laboreletric.com.br", "password": pwd})
    conn.request("POST", "/api/login", body, {
        "Content-Type": "application/json",
        "X-Forwarded-Proto": "https",
        "Host": "aluforce.api.br"
    })
    resp = conn.getresponse()
    data_raw = resp.read()
    
    if resp.status == 200:
        data = json.loads(data_raw)
        print(f"\nLOGIN SUCCESS with: {pwd}")
        print(f"Status: {resp.status}")
        for name, val in resp.getheaders():
            if name.lower() in ('set-cookie', 'location'):
                print(f"  {name}: {val}")
        print(f"  redirectTo: {data.get('redirectTo', 'N/A')}")
        print(f"  user.email: {data.get('user', {}).get('email', 'N/A')}")
        
        # Test through nginx
        conn2 = http.client.HTTPSConnection("aluforce.api.br", 443, context=ctx)
        conn2.request("POST", "/labor-eletric/api/login", body, {"Content-Type": "application/json"})
        resp2 = conn2.getresponse()
        print(f"\nNGINX Status: {resp2.status}")
        for name, val in resp2.getheaders():
            if name.lower() in ('set-cookie', 'location'):
                print(f"  {name}: {val}")
        data2 = json.loads(resp2.read())
        print(f"  redirectTo: {data2.get('redirectTo', 'N/A')}")
        conn2.close()
        break
    else:
        data = json.loads(data_raw)
        msg = data.get('message', data.get('code', ''))
        print(f"  {pwd}: {resp.status} - {msg}")
    conn.close()
import json, http.client, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test 1: Direct to port 4001 (simulating nginx proxy)
print("=== TEST 1: Direct to port 4001 ===")
conn = http.client.HTTPConnection("127.0.0.1", 4001)
body = json.dumps({"email": "ti@laboreletric.com.br", "password": "Aluforce@2024"})
conn.request("POST", "/api/login", body, {
    "Content-Type": "application/json",
    "X-Forwarded-Proto": "https",
    "Host": "aluforce.api.br"
})
resp = conn.getresponse()
print(f"Status: {resp.status}")
headers = resp.getheaders()
for name, val in headers:
    if name.lower() in ('set-cookie', 'location'):
        print(f"  {name}: {val}")
data = json.loads(resp.read())
print(f"  redirectTo: {data.get('redirectTo', 'N/A')}")
print(f"  user.email: {data.get('user', {}).get('email', 'N/A')}")
print(f"  user.empresa_id: {data.get('user', {}).get('empresa_id', 'N/A')}")
conn.close()

# Test 2: Through nginx (HTTPS)
print("\n=== TEST 2: Through nginx /labor-eletric/ ===")
conn2 = http.client.HTTPSConnection("aluforce.api.br", 443, context=ctx)
conn2.request("POST", "/labor-eletric/api/login", body, {
    "Content-Type": "application/json"
})
resp2 = conn2.getresponse()
print(f"Status: {resp2.status}")
headers2 = resp2.getheaders()
for name, val in headers2:
    if name.lower() in ('set-cookie', 'location'):
        print(f"  {name}: {val}")
data2 = json.loads(resp2.read())
print(f"  redirectTo: {data2.get('redirectTo', 'N/A')}")
conn2.close()
