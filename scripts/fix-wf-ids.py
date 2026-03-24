import json, os, random, string
wdir = "/var/www/aluforce/n8n/workflows"
for f in sorted(os.listdir(wdir)):
    if f.startswith("1") and len(f) > 2 and f[1] in "12345678" and f.endswith(".json"):
        path = os.path.join(wdir, f)
        with open(path) as fh:
            data = json.load(fh)
        wf = data[0] if isinstance(data, list) else data
        if "id" not in wf or not wf["id"]:
            wf["id"] = "".join(random.choices(string.ascii_letters + string.digits, k=16))
        out = [wf] if isinstance(data, list) else wf
        with open(path, "w") as fh:
            json.dump(out, fh)
        print(f"Fixed: {f} -> id={wf['id']}")
