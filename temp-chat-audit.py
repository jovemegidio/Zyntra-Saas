import os, re
root = "/var/www/aluforce/modules"
pat = re.compile(r"chat-widget|zyntra-chat|chat\.js|initChat|ChatWidget|chat-float", re.I)
for d, _, fs in os.walk(root):
    if "backup" in d or "node_modules" in d:
        continue
    for f in sorted(fs):
        if f.endswith(".html") and ".bak" not in f:
            fp = os.path.join(d, f)
            try:
                content = open(fp, errors="ignore").read()
                if not pat.search(content):
                    print("NOCHAT:", fp)
            except:
                print("ERROR:", fp)
print("---DONE---")
