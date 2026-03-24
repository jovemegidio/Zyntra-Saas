import paramiko
import os

host = '31.97.64.102'
user = 'root'
pw = 'Aluforce@2026#Vps'
local = os.path.join(os.path.dirname(__file__), 'modules', 'Financeiro', 'contas-receber.html')
remote = '/var/www/aluforce/modules/Financeiro/contas-receber.html'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pw)

sftp = ssh.open_sftp()
sftp.put(local, remote)
sftp.close()
print('Upload OK')

stdin, stdout, stderr = ssh.exec_command('cd /var/www/aluforce && pm2 restart all')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
print('Deploy completo!')
