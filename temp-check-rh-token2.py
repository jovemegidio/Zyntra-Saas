import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=20)

# Check the backup version of controle-acesso-rh.js to see if it used token
stdin, stdout, stderr = ssh.exec_command('grep -n "token" /var/www/aluforce/_backups/Backup_Completo_20260224_225932/modules/RH/public/js/controle-acesso-rh.js 2>/dev/null | head -20')
stdout.channel.recv_exit_status()
print('BACKUP token refs:', stdout.read().decode())

# Check funcionario.html lines around 695-710
stdin, stdout, stderr = ssh.exec_command('sed -n "690,720p" /var/www/aluforce/modules/RH/public/funcionario.html')
stdout.channel.recv_exit_status()
print('funcionario.html ~700:\n', stdout.read().decode())

# Check gestao-ponto.html lines around 610-620
stdin, stdout, stderr = ssh.exec_command('sed -n "605,625p" /var/www/aluforce/modules/RH/public/pages/gestao-ponto.html')
stdout.channel.recv_exit_status()
print('gestao-ponto.html ~615:\n', stdout.read().decode())

# Check folha-new.html lines around 505-520
stdin, stdout, stderr = ssh.exec_command('sed -n "500,525p" /var/www/aluforce/modules/RH/public/pages/folha-new.html')
stdout.channel.recv_exit_status()
print('folha-new.html ~510:\n', stdout.read().decode())

ssh.close()
