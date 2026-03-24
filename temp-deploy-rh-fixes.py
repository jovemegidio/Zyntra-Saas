# -*- coding: utf-8 -*-
"""Deploy RH module fixes to VPS"""
import paramiko
import os

HOST = '31.97.64.102'
USER = 'root'
PASS = 'Aluforce@2026#Vps'
LOCAL_BASE = r'g:\Outros computadores\Meu laptop (2)\Zyntra'
REMOTE_BASE = '/var/www/aluforce'

# Files to deploy (local relative path, remote relative path)
FILES = [
    ('modules/RH/public/pages/funcionarios.html', 'modules/RH/public/pages/funcionarios.html'),
    ('modules/RH/server.js', 'modules/RH/server.js'),
    ('modules/RH/public/js/controle-acesso-rh.js', 'modules/RH/public/js/controle-acesso-rh.js'),
    ('modules/RH/public/pages/gestao-ponto.html', 'modules/RH/public/pages/gestao-ponto.html'),
    ('modules/RH/public/pages/calendario-rh.html', 'modules/RH/public/pages/calendario-rh.html'),
    ('modules/RH/public/gestao-holerites.html', 'modules/RH/public/gestao-holerites.html'),
    ('public/js/modal-integration.js', 'public/js/modal-integration.js'),
]

print("=== Connecting to VPS ===")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)
sftp = ssh.open_sftp()
print("  Connected.\n")

print("=== Uploading files ===")
uploaded = 0
for local_rel, remote_rel in FILES:
    local_path = os.path.join(LOCAL_BASE, local_rel.replace('/', os.sep))
    remote_path = f'{REMOTE_BASE}/{remote_rel}'
    if os.path.exists(local_path):
        sftp.put(local_path, remote_path)
        size = os.path.getsize(local_path)
        print(f"  [OK] {remote_rel} ({size:,} bytes)")
        uploaded += 1
    else:
        print(f"  [SKIP] Not found: {local_rel}")

print(f"\n  Uploaded {uploaded}/{len(FILES)} files.\n")

print("=== Restarting PM2 ===")
_, stdout, stderr = ssh.exec_command('cd /var/www/aluforce && pm2 restart aluforce-dashboard --update-env 2>&1')
stdout.channel.recv_exit_status()
out = stdout.read().decode(errors='replace')
print(out[:800])

_, stdout, _ = ssh.exec_command('pm2 list 2>&1 | head -20')
print(stdout.read().decode(errors='replace'))

sftp.close()
ssh.close()
print("[DONE] Deploy completo!")
