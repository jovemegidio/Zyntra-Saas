import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=20)

# 1. Find all copies of the file
stdin, stdout, stderr = ssh.exec_command('find /var/www/aluforce -name controle-acesso-rh.js 2>/dev/null')
stdout.channel.recv_exit_status()
print('FILES:', stdout.read().decode())

# 2. Search for token usage in RH pages
stdin, stdout, stderr = ssh.exec_command("grep -rn 'token' /var/www/aluforce/modules/RH/public/ --include='*.js' --include='*.html' 2>/dev/null | grep -v 'trustedDeviceToken\\|tokenKey\\|tokenExpiry\\|refreshToken\\|authToken\\|csrf\\|CSRF' | head -40")
stdout.channel.recv_exit_status()
print('TOKEN REFS IN RH:\n', stdout.read().decode())

# 3. Check how the pages load controle-acesso-rh.js
stdin, stdout, stderr = ssh.exec_command("grep -rn 'controle-acesso-rh' /var/www/aluforce/modules/RH/public/ 2>/dev/null | head -20")
stdout.channel.recv_exit_status()
print('SCRIPT REFS:\n', stdout.read().decode())

ssh.close()
