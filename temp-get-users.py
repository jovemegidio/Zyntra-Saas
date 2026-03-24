#!/usr/bin/env python3
"""Fetch all user emails from VPS DB"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=20)
stdin, stdout, stderr = ssh.exec_command(
    "mysql -u root -pAluforce2026VpsDB aluforce_vendas -se \"SELECT email, ativo FROM usuarios ORDER BY email;\""
)
stdout.channel.recv_exit_status()
out = stdout.read().decode()
err = stderr.read().decode()
if err and 'Warning' not in err:
    print('STDERR:', err[:200])
print(out)
ssh.close()
