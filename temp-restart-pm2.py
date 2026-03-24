import paramiko

host = '31.97.64.102'
user = 'root'
pw = 'Aluforce@2026#Vps'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pw, timeout=10)

transport = ssh.get_transport()
channel = transport.open_session()
channel.settimeout(15)
channel.exec_command('cd /var/www/aluforce && pm2 restart all')

import time
time.sleep(5)

if channel.recv_ready():
    print(channel.recv(4096).decode())
if channel.recv_stderr_ready():
    print(channel.recv_stderr(4096).decode())

channel.close()
ssh.close()
print('PM2 restart enviado!')
