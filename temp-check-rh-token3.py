import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=20)

# Check controle-acesso-rh.js with line numbers around 25-35
stdin, stdout, stderr = ssh.exec_command('sed -n "25,35p" /var/www/aluforce/modules/RH/public/js/controle-acesso-rh.js')
stdout.channel.recv_exit_status()
print('VPS controle-acesso-rh.js lines 25-35:\n', stdout.read().decode())

# Check ALL files that reference undeclared token (not inside a const/let/var token = ... line)
stdin, stdout, stderr = ssh.exec_command(r"""grep -rn '\btoken\b' /var/www/aluforce/modules/RH/public/pages/ --include='*.html' 2>/dev/null | grep -v 'const token\|let token\|var token\|//.*token\|trustedDevice\|csrfToken\|tokenKey\|tokenExpiry\|refreshToken\|authToken\|waitForToken\|tokenPresent\|tokenMasked\|rawToken\|getAuthToken\|getToken\|return.*token\|Bearer.*token' | grep -v '\.html:.*function\|html:.*comment' | head -30""")
stdout.channel.recv_exit_status()
print('Undeclared token refs in /pages/:\n', stdout.read().decode())

ssh.close()
