import urllib.request, json

url = "http://localhost:5678/api/v1/workflows?limit=50"
req = urllib.request.Request(url, headers={"X-N8N-Api-Key": "2d6e45d6-cdd2-468b-b79a-fda468674113"})
data = json.load(urllib.request.urlopen(req))
wfs = data.get("data", data)
active = 0
inactive = 0
for w in sorted(wfs, key=lambda x: x["name"]):
    status = "ACTIVE" if w.get("active") else "INACTIVE"
    print(f"{w['name']:50s} | {status}")
    if w.get("active"):
        active += 1
    else:
        inactive += 1
print(f"\nTotal: {len(wfs)} | Active: {active} | Inactive: {inactive}")
