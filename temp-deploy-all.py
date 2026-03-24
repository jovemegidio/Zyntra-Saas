import paramiko
import os

host = '31.97.64.102'
user = 'root'
pw = 'Aluforce@2026#Vps'
base = os.path.dirname(__file__)
remote_base = '/var/www/aluforce'

files = [
    (os.path.join(base, 'server.js'), f'{remote_base}/server.js'),
    (os.path.join(base, 'modules', 'Financeiro', 'contas-receber.html'), f'{remote_base}/modules/Financeiro/contas-receber.html'),
    (os.path.join(base, 'modules', 'Financeiro', 'server.js'), f'{remote_base}/modules/Financeiro/server.js'),
    (os.path.join(base, 'modules', 'RH', 'server.js'), f'{remote_base}/modules/RH/server.js'),
    (os.path.join(base, 'modules', 'RH', 'public', 'js', 'controle-acesso-rh.js'), f'{remote_base}/modules/RH/public/js/controle-acesso-rh.js'),
    (os.path.join(base, 'modules', 'RH', 'public', 'pages', 'funcionarios.html'), f'{remote_base}/modules/RH/public/pages/funcionarios.html'),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pw)

sftp = ssh.open_sftp()
for local, remote in files:
    sftp.put(local, remote)
    print(f'Uploaded: {os.path.basename(local)}')
sftp.close()

# Restart PM2
transport = ssh.get_transport()
channel = transport.open_session()
channel.settimeout(15)
channel.exec_command('cd /var/www/aluforce && pm2 restart all')

channel.close()
ssh.close()
print('Deploy complete!')
