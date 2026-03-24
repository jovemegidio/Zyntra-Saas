path = '/var/www/aluforce/modules/Vendas/public/prospeccao.html'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

chat_line = '    <script src="/chat-teams/chat-widget.js?v=20260615" defer></script>'

if 'chat-teams' in content:
    print('ALREADY HAS chat-teams')
else:
    new_content = content.replace('</body>', chat_line + '\n</body>', 1)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('ADDED chat widget to prospeccao.html')
    else:
        print('ERROR: could not find </body>')

# Verify
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    verify = f.read()
print('Verify chat-teams present:', 'chat-teams' in verify)
