import os, re, json, sys

base = r"G:\Outros computadores\Meu laptop (2)\Zyntra"
out_file = os.path.join(base, "temp_scan_results.txt")

active_dirs = ['modules\\Compras', 'modules\\Vendas', 'modules\\Financeiro', 'modules\\RH', 'modules\\PCP', 'modules\\NFe', 'modules\\Faturamento', 'modules\\Admin', 'modules\\_shared', 'public']
skip_dirs = {'node_modules', '.git', 'backup', 'backups', 'public_backup', 'public_backup_', 'backup-pre-css-standard', '_backup_redesign', 'Financeiro_backup_20260319', 'Ajuda-Aluforce', 'coverage'}

lines = []
for mod_dir in active_dirs:
    full = os.path.join(base, mod_dir)
    if not os.path.exists(full):
        continue
    for root, dirs, files in os.walk(full):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if not f.endswith('.html'):
                continue
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='replace') as fh:
                    content = fh.read()
            except:
                continue
            
            has_modal = bool(re.search(r'modal-overlay|modal-header|modal-footer|modal-body', content))
            has_counter = bool(re.search(r'stat-card|kpi-card|counter-card|dashboard-card|stat-icon|stat-value|kpi-value', content))
            
            modal_ids = re.findall(r'id=["\']([^"\']*(?:modal|overlay)[^"\']*)["\']', content, re.I)
            stat_cards = len(re.findall(r'stat-card', content))
            kpi_cards = len(re.findall(r'kpi-card|kpi-value', content))
            
            if has_modal or has_counter:
                rpath = os.path.relpath(path, base).replace('\\', '/')
                flags = []
                if has_modal: flags.append(f"MODAL({len(set(modal_ids))})")
                if has_counter: flags.append(f"COUNTER(stat:{stat_cards},kpi:{kpi_cards})")
                lines.append(f"{' + '.join(flags):45s} | {rpath}")

with open(out_file, 'w', encoding='utf-8') as f:
    f.write(f"Total: {len(lines)} files\n\n")
    for l in lines:
        f.write(l + '\n')

print(f"Results written to {out_file}")
