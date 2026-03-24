# -*- coding: utf-8 -*-
import paramiko, os

HOST = '31.97.64.102'
USER = 'root'
PASS = 'Aluforce@2026#Vps'
LOCAL_BASE = r'g:\Outros computadores\Meu laptop (2)\Zyntra'
REMOTE_BASE = '/var/www/aluforce'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

def run(cmd):
    _, so, se = ssh.exec_command(cmd)
    return so.read().decode(errors='replace').strip()

# 1. Check controle-acesso-rh.js on VPS
print("=== controle-acesso-rh.js lines 25-35 ===")
print(run('sed -n "25,35p" /var/www/aluforce/modules/RH/public/js/controle-acesso-rh.js'))

# 2. Check if old token reference exists
print("\n=== grep 'token' in controle-acesso-rh.js ===")
print(run('grep -n "token" /var/www/aluforce/modules/RH/public/js/controle-acesso-rh.js') or "(none found)")

# 3. Check funcionarios.html avatarNameMap
print("\n=== avatarNameMap content (first 5 lines of map) ===")
print(run('grep -A5 "avatarNameMap" /var/www/aluforce/modules/RH/public/pages/funcionarios.html | head -10'))

# 4. Check for new entries
print("\n=== New avatar entries check ===")
print("sergio:", run('grep -c "sergio" /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))
print("Clemerson.png:", run('grep -c "Clemerson.png" /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))
print("Clemerson.webp:", run('grep -c "Clemerson.webp" /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))

# 5. File sizes and dates
print("\n=== File info ===")
print(run('ls -la /var/www/aluforce/modules/RH/public/js/controle-acesso-rh.js'))
print(run('ls -la /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))

# 6. Force re-upload both files
print("\n=== RE-UPLOADING FILES ===")
sftp = ssh.open_sftp()

files = [
    ('modules/RH/public/js/controle-acesso-rh.js', 'modules/RH/public/js/controle-acesso-rh.js'),
    ('modules/RH/public/pages/funcionarios.html', 'modules/RH/public/pages/funcionarios.html'),
    ('modules/RH/server.js', 'modules/RH/server.js'),
    ('modules/RH/public/pages/gestao-ponto.html', 'modules/RH/public/pages/gestao-ponto.html'),
    ('modules/RH/public/pages/calendario-rh.html', 'modules/RH/public/pages/calendario-rh.html'),
    ('modules/RH/public/gestao-holerites.html', 'modules/RH/public/gestao-holerites.html'),
    ('public/js/modal-integration.js', 'public/js/modal-integration.js'),
]

for local_rel, remote_rel in files:
    local_path = os.path.join(LOCAL_BASE, local_rel.replace('/', os.sep))
    remote_path = f'{REMOTE_BASE}/{remote_rel}'
    if os.path.exists(local_path):
        sftp.put(local_path, remote_path)
        size = os.path.getsize(local_path)
        print(f"  [OK] {remote_rel} ({size:,} bytes)")
    else:
        print(f"  [SKIP] {local_rel}")

sftp.close()

# 7. Verify after upload
print("\n=== VERIFICATION AFTER UPLOAD ===")
print("token in controle-acesso:", run('grep -c "token" /var/www/aluforce/modules/RH/public/js/controle-acesso-rh.js'))
print("sergio in funcionarios:", run('grep -c "sergio" /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))
print("Clemerson.png:", run('grep -c "Clemerson.png" /var/www/aluforce/modules/RH/public/pages/funcionarios.html'))
print("adminAllowedFields emergencia:", run('grep -c "contato_emergencia" /var/www/aluforce/modules/RH/server.js'))

# 8. Restart PM2
print("\n=== RESTARTING PM2 ===")
print(run('pm2 restart aluforce-dashboard --update-env 2>&1 | tail -5'))
import time; time.sleep(5)
print(run('pm2 list 2>&1 | grep -E "aluforce|online|stopped"'))

ssh.close()
print("\n[DONE] Deploy verificado!")
