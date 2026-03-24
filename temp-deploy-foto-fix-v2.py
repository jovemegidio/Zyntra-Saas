#!/usr/bin/env python3
"""Deploy foto fix v2: route fixes, crop modal, all avatar photos"""
import paramiko, os, sys, time

VPS_HOST = '31.97.64.102'
VPS_USER = 'root'
VPS_PASS = 'Aluforce@2026#Vps'
VPS_BASE = '/var/www/aluforce'
LOCAL_BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'

def main():
    print('=' * 60)
    print('DEPLOY: Foto Fix v2 - Routes + Crop Modal + Avatars')
    print('=' * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    sftp = ssh.open_sftp()
    print('✅ Conectado à VPS')

    # 1. Upload server.js (route fixes)
    print('\n📦 1/3 Uploading RH server.js (route fixes)...')
    local_server = os.path.join(LOCAL_BASE, 'modules', 'RH', 'server.js')
    remote_server = f'{VPS_BASE}/modules/RH/server.js'
    sftp.put(local_server, remote_server)
    print(f'   ✅ server.js uploaded ({os.path.getsize(local_server):,} bytes)')

    # 2. Upload funcionarios.html (crop modal + upload fix)
    print('\n📦 2/3 Uploading funcionarios.html (crop modal)...')
    local_html = os.path.join(LOCAL_BASE, 'modules', 'RH', 'public', 'pages', 'funcionarios.html')
    remote_html = f'{VPS_BASE}/modules/RH/public/pages/funcionarios.html'
    sftp.put(local_html, remote_html)
    print(f'   ✅ funcionarios.html uploaded ({os.path.getsize(local_html):,} bytes)')

    # 3. Upload ALL avatar photos
    print('\n📦 3/3 Uploading all avatar photos...')
    local_avatars = os.path.join(LOCAL_BASE, 'public', 'avatars')
    remote_avatars = '/var/www/uploads/avatars'

    # Ensure remote dir exists
    try:
        sftp.stat(remote_avatars)
    except FileNotFoundError:
        ssh.exec_command(f'mkdir -p {remote_avatars}')
        time.sleep(1)

    count = 0
    for f in os.listdir(local_avatars):
        if f.lower().endswith(('.png', '.webp', '.svg', '.jpg', '.jpeg')):
            local_path = os.path.join(local_avatars, f)
            remote_path = f'{remote_avatars}/{f}'
            sftp.put(local_path, remote_path)
            count += 1
            print(f'   ✅ {f}')

    print(f'\n   📸 {count} avatar files uploaded')

    # Also copy to public/avatars as fallback
    remote_pub_avatars = f'{VPS_BASE}/public/avatars'
    try:
        sftp.stat(remote_pub_avatars)
    except FileNotFoundError:
        ssh.exec_command(f'mkdir -p {remote_pub_avatars}')
        time.sleep(1)

    for f in os.listdir(local_avatars):
        if f.lower().endswith(('.png', '.webp', '.svg', '.jpg', '.jpeg')):
            local_path = os.path.join(local_avatars, f)
            remote_path = f'{remote_pub_avatars}/{f}'
            sftp.put(local_path, remote_path)

    print(f'   ✅ Also copied to {remote_pub_avatars}')

    # 4. Verify uploaded files
    print('\n🔍 Verifying...')
    stdin, stdout, stderr = ssh.exec_command(f'ls -la {remote_avatars}/*.png | wc -l')
    png_count = stdout.read().decode().strip()
    print(f'   PNG files in /var/www/uploads/avatars/: {png_count}')

    stdin, stdout, stderr = ssh.exec_command(f'ls -la {remote_avatars}/ | wc -l')
    total = stdout.read().decode().strip()
    print(f'   Total files in avatars dir: {total}')

    # Check route fix in server.js
    stdin, stdout, stderr = ssh.exec_command(f"grep -c 'api/rh/funcionarios/:id/foto' {remote_server}")
    route_count = stdout.read().decode().strip()
    print(f'   /api/rh/funcionarios/:id/foto routes in server.js: {route_count}')

    # Check crop modal in funcionarios.html
    stdin, stdout, stderr = ssh.exec_command(f"grep -c 'cropModal' {remote_html}")
    crop_count = stdout.read().decode().strip()
    print(f'   cropModal references in funcionarios.html: {crop_count}')

    # 5. Restart PM2
    print('\n🔄 Restarting PM2...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/aluforce && pm2 restart all')
    time.sleep(3)
    result = stdout.read().decode()
    print(result[:500] if result else '   PM2 restart command sent')

    # Check PM2 status
    stdin, stdout, stderr = ssh.exec_command('pm2 list')
    time.sleep(2)
    pm2_list = stdout.read().decode()
    print(pm2_list[:800] if pm2_list else '   (no output)')

    sftp.close()
    ssh.close()

    print('\n' + '=' * 60)
    print('✅ DEPLOY COMPLETE!')
    print('=' * 60)
    print('\nFixados:')
    print('  1. ✅ Rotas /api/rh/funcionarios/:id/foto (e outras) - 403 fix')
    print('  2. ✅ Modal de recorte de foto adicionado')
    print('  3. ✅ Todas as fotos de avatar enviadas')
    print('  4. ✅ Upload simplificado (sem token desnecessário)')
    print('\n⚠️  Peça ao usuário para fazer Ctrl+Shift+R no navegador')

if __name__ == '__main__':
    main()
