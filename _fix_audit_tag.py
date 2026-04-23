import re

f = '/var/www/aluforce/public/index.html'
with open(f, 'r', encoding='utf-8', errors='replace') as fh:
    lines = fh.readlines()

changed = 0
for i, line in enumerate(lines):
    if 'audit-tag-action' in line:
        # Replace escHtml(log.XXX || 'YY') with traduzirAcao(...)
        new_line = re.sub(
            r"escHtml\(log\.\S+\s*\|\|\s*['\"][^'\"]*['\"]\)",
            "traduzirAcao(log.\u00e7\u00e3o || log.acao || '')",
            line
        )
        # But preserve the 'log.' prefix correctly
        new_line = re.sub(
            r"traduzirAcao\(log\.\u00e7\u00e3o",
            "traduzirAcao(log.a\u00e7\u00e3o",
            new_line
        )
        if new_line != line:
            lines[i] = new_line
            changed += 1
    if 'actionIcons[a' in line and 'o]' in line and 'log.acao' not in line:
        new_line = re.sub(
            r'(actionIcons\[a[^\]]+\])\s*\|\|\s*\{\s*icon:',
            r'\1 || actionIcons[(log.acao||"").toLowerCase()] || { icon:',
            line
        )
        if new_line != line:
            lines[i] = new_line
            changed += 1

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(lines)
print('AUDIT tag fix: changed', changed, 'lines')
