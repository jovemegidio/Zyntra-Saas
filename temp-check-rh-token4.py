import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=20)

# Check app.js around line 2808
stdin, stdout, stderr = ssh.exec_command('sed -n "2800,2820p" /var/www/aluforce/modules/RH/public/app.js')
stdout.channel.recv_exit_status()
print('app.js ~2808:\n', stdout.read().decode())

# Check if any RH page overrides window.fetch
stdin, stdout, stderr = ssh.exec_command("grep -rn 'window.fetch\\|globalThis.fetch\\|self.fetch' /var/www/aluforce/modules/RH/public/ 2>/dev/null | grep -v '.bak\\|.removed' | head -10")
stdout.channel.recv_exit_status()
print('fetch override?\n', stdout.read().decode())

# Find ALL pages where token is used bare (not const/let/var or after a dot or in a comment)
stdin, stdout, stderr = ssh.exec_command(r"""grep -rn '[^a-zA-Z_.\x27"]token[^a-zA-Z_"\x27]' /var/www/aluforce/modules/RH/public/pages/ --include='*.html' 2>/dev/null | grep -v '//' | grep -v 'const token\|let token\|var token\|data\.token\|\.token\|Bearer.*token\|return.*token\|TokenKey\|tokenKey\|csrfToken\|CsrfToken\|trustedDevice\|refreshToken\|authToken\|rawToken\|waitForToken\|getToken\|return token' | grep -v '.bak\|.removed' | head -30""")
stdout.channel.recv_exit_status()
print('Bare token refs:\n', stdout.read().decode())

ssh.close()
