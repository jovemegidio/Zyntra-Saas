"""
Deploy: Upload collaborator photos + updated HTML files to VPS.
- Uploads 16 PNG photos from local folder to /var/www/uploads/avatars/
- Copies photos locally to public/avatars/
- Uploads 9 updated HTML files (avatarNameMap updated to new PNGs)
- Restarts PM2
"""
import os
import shutil
import paramiko

HOST = '31.97.64.102'
USER = 'root'
PASS = 'Aluforce@2026#Vps'
REMOTE_BASE = '/var/www/aluforce'
REMOTE_AVATARS = '/var/www/uploads/avatars'

LOCAL_BASE = r'g:\Outros computadores\Meu laptop (2)\Zyntra'
PHOTOS_FOLDER = os.path.join(LOCAL_BASE, 'Fotos Colaboradores - Atualizada')
LOCAL_AVATARS = os.path.join(LOCAL_BASE, 'public', 'avatars')

# Source filename -> target filename on VPS
PHOTO_MAP = {
    'FOTO - Robson.png': 'Robson.png',
    'FOTO - Renata.png': 'Renata.png',
    'FOTO - Junior.png': 'Junior.png',
    'FOTO - Guilherme Bastos.png': 'GuilhermeBastos.png',
    'FOTO - Clemerson.png': 'Clemerson.png',
    'FOTO - Bruno.png': 'Bruno.png',
    'FOTO - Tatiane.png': 'Tatiane.png',
    'FOTO - Thiago.png': 'Thiago.png',
    'FOTO - Ronaldo.png': 'Ronaldo.png',
    'FOTO - M\u00e1rcia.png': 'Marcia.png',
    'FOTO - Isabella.png': 'Isabela.png',
    'FOTO - Jo\u00e3o Vitor.png': 'JoaoVitor.png',
    'FOTO- Fernando.png': 'Fernando.png',
    'FOTO - Augusto.png': 'Augusto.png',
    'FOTO - Fabiano.png': 'Fabiano.png',
    'FOTO - Felipe Simoes.png': 'FelipeSimoes.png',
    'FOTO - Sergio.png': 'Sergio.png',
    'FOTO - Lucas.png': 'Lucas.png',
    'FOTO - Miqueias.png': 'Miqueias.png',
    'FOTO - Lucio.png': 'Lucio.png',
}

# HTML files to deploy (local path, remote path)
HTML_FILES = [
    ('modules/Financeiro/public/contas_receber.html', 'modules/Financeiro/public/contas_receber.html'),
    ('modules/Financeiro/public/index.html',          'modules/Financeiro/public/index.html'),
    ('modules/Vendas/public/index.html',               'modules/Vendas/public/index.html'),
    ('modules/Vendas/public/pedidos.html',             'modules/Vendas/public/pedidos.html'),
    ('modules/Vendas/public/estoque.html',             'modules/Vendas/public/estoque.html'),
    ('modules/PCP/index.html',                         'modules/PCP/index.html'),
    ('modules/PCP/apontamentos.html',                  'modules/PCP/apontamentos.html'),
    ('modules/PCP/ordens-producao.html',               'modules/PCP/ordens-producao.html'),
    ('modules/NFe/index.html',                         'modules/NFe/index.html'),
]

# --- 1. Copy photos locally to public/avatars ---
print("=== Copying photos to local public/avatars ===")
os.makedirs(LOCAL_AVATARS, exist_ok=True)
copied_local = 0
for src_name, dst_name in PHOTO_MAP.items():
    src = os.path.join(PHOTOS_FOLDER, src_name)
    dst = os.path.join(LOCAL_AVATARS, dst_name)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        copied_local += 1
        print(f"  [OK] {src_name} -> public/avatars/{dst_name}")
    else:
        print(f"  [SKIP] Not found: {src_name}")
print(f"Copied {copied_local}/{len(PHOTO_MAP)} photos locally.\n")

# --- 2. Connect to VPS ---
print("=== Connecting to VPS ===")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS)
sftp = c.open_sftp()
print("  Connected.\n")

# Ensure remote avatars directory exists
try:
    sftp.stat(REMOTE_AVATARS)
except FileNotFoundError:
    _, so, se = c.exec_command(f'mkdir -p {REMOTE_AVATARS}')
    so.channel.recv_exit_status()
    print(f"  Created {REMOTE_AVATARS}")

# --- 3. Upload photos to VPS ---
print("=== Uploading photos to VPS ===")
uploaded_photos = 0
for src_name, dst_name in PHOTO_MAP.items():
    src = os.path.join(PHOTOS_FOLDER, src_name)
    dst = f'{REMOTE_AVATARS}/{dst_name}'
    if os.path.exists(src):
        sftp.put(src, dst)
        uploaded_photos += 1
        print(f"  [OK] {dst_name}")
    else:
        print(f"  [SKIP] Not found: {src_name}")
print(f"Uploaded {uploaded_photos}/{len(PHOTO_MAP)} photos.\n")

# --- 4. Upload HTML files ---
print("=== Uploading HTML files ===")
for local_rel, remote_rel in HTML_FILES:
    local_path = os.path.join(LOCAL_BASE, local_rel)
    remote_path = f'{REMOTE_BASE}/{remote_rel}'
    if os.path.exists(local_path):
        sftp.put(local_path, remote_path)
        print(f"  [OK] {remote_rel}")
    else:
        print(f"  [SKIP] Not found: {local_rel}")
print()

# --- 5. Restart PM2 ---
print("=== Restarting PM2 ===")
_, so, se = c.exec_command('pm2 restart aluforce-dashboard --update-env 2>&1')
so.channel.recv_exit_status()
out = so.read().decode(errors='replace') + se.read().decode(errors='replace')
print(out[:600])

_, so, _ = c.exec_command('pm2 list 2>&1 | grep -E "aluforce|online|stopped"')
print(so.read().decode(errors='replace'))

sftp.close()
c.close()
print("[DONE] Deploy completo!")
