import re

# Pages that need the chat widget added (active user-facing pages)
pages = [
    "/var/www/aluforce/modules/NFe/consultar.html",
    "/var/www/aluforce/modules/RH/public/pages/avaliacoes.html",
    "/var/www/aluforce/modules/RH/public/pages/ferias.html",
    "/var/www/aluforce/modules/RH/public/pages/aplicar-avaliacoes.html",
    "/var/www/aluforce/modules/RH/public/pages/requisicoes-compra.html",
    "/var/www/aluforce/modules/Vendas/public/prospeccao.html",
]

chat_script = '    <script src="/chat-teams/chat-widget.js?v=20260615" defer></script>'

fixed = 0
skipped = 0
errors = 0

for path in pages:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check if already has chat widget
        if 'chat-widget' in content or 'chat-teams' in content:
            print(f"SKIP (already has chat): {path}")
            skipped += 1
            continue
        
        # Insert before </body>
        if '</body>' in content:
            content = content.replace('</body>', f'{chat_script}\n</body>', 1)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"FIXED: {path}")
            fixed += 1
        elif '</BODY>' in content:
            content = content.replace('</BODY>', f'{chat_script}\n</BODY>', 1)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"FIXED: {path}")
            fixed += 1
        else:
            print(f"WARN (no </body> tag): {path}")
            errors += 1
    except Exception as e:
        print(f"ERROR: {path} -> {e}")
        errors += 1

print(f"\n--- Summary ---")
print(f"Fixed: {fixed}")
print(f"Skipped: {skipped}")
print(f"Errors: {errors}")
