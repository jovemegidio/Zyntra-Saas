import json, random, string

f = "/var/www/aluforce/n8n/workflows/36-audit-anomalias-seguranca.json"
d = json.load(open(f))
d["id"] = "".join(random.choices(string.ascii_letters + string.digits, k=16))
json.dump(d, open(f, "w"))
print("ID:", d["id"])
