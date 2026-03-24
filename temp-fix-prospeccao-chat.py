path = '/var/www/aluforce/modules/Vendas/public/prospeccao.html'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
chat_script = '    <script src="/chat-teams/chat-widget.js?v=20260615" defer></script>'
if 'chat-teams/chat-widget.js' not in content:
    content = content.replace('</body>', chat_script + '\n</body>', 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('FIXED prospeccao.html')
else:
    print('SKIP: already has correct chat widget')
