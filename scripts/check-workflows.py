import subprocess, json

result = subprocess.check_output(
    ["docker", "exec", "aluforce-n8n", "n8n", "list:workflow"],
    text=True
).strip()

for line in result.split("\n"):
    wf_id, name = line.split("|", 1)
    export = subprocess.check_output(
        ["docker", "exec", "aluforce-n8n", "n8n", "export:workflow", "--id=" + wf_id],
        text=True
    )
    data = json.loads(export)
    if isinstance(data, list):
        data = data[0] if data else {}
    active = data.get("active", False)
    print(f"{name} | active={active}")
