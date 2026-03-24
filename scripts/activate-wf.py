import json, subprocess, sys

ids = [
    "sA4rTHTuM3uiRiYO",
    "Aa50V2ddujenx6pS",
    "PLBW2ig4RrsJu42j",
    "hnp3b5XvekmpniDF",
    "MtrN7H9I7995gCQZ",
    "RLkKJBds32JTz8Xx",
    "Kc4y4rEbGJTTJxpc",
    "1i21QrGBuJfA9c44"
]

# Export all workflows, modify active=true, re-import
result = subprocess.run(
    ["docker", "exec", "aluforce-n8n", "n8n", "export:workflow", "--all"],
    capture_output=True, text=True
)
workflows = json.loads(result.stdout)

for wf in workflows:
    if wf["id"] in ids:
        wf["active"] = True
        fname = f"/tmp/activate_{wf['id']}.json"
        with open(fname, "w") as f:
            json.dump([wf], f)
        subprocess.run(
            ["docker", "cp", fname, f"aluforce-n8n:{fname}"],
            capture_output=True
        )
        r = subprocess.run(
            ["docker", "exec", "aluforce-n8n", "n8n", "import:workflow", f"--input={fname}"],
            capture_output=True, text=True
        )
        print(f"Activated: {wf['name']} -> {r.stdout.strip()}")
