import json, os, random, string

wdir = "/var/www/aluforce/n8n/workflows"
for f in sorted(os.listdir(wdir)):
    if not f.endswith(".json"):
        continue
    num = f.split("-")[0]
    if not num.isdigit():
        continue
    n = int(num)
    if n < 19:
        continue
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
