#!/usr/bin/env python3
"""Deploy remaining files and restart PM2 on VPS via paramiko"""
import paramiko
import time
import os

VPS_HOST = '31.97.64.102'
VPS_USER = 'root'
VPS_PASS = 'Aluforce@2026#Vps'
BASE = r'g:\Outros computadores\Meu laptop (2)\Zyntra'
REMOTE_BASE = '/var/www/aluforce'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print('Connecting...')
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
print('Connected!')

# Restart PM2 to pick up latest code
print('\nRestarting PM2...')
_, stdout, stderr = ssh.exec_command('pm2 restart all --update-env 2>&1')
time.sleep(10)
out = stdout.read().decode()
print('PM2 output:', out[:500])

# PM2 status
print('\nPM2 status:')
_, stdout, _ = ssh.exec_command('pm2 list --no-color 2>&1')
time.sleep(3)
out = stdout.read().decode()
for line in out.split('\n'):
    if 'aluforce' in line.lower() or 'zyntra' in line.lower() or 'online' in line.lower() or '│ id' in line.lower():
        print(line)

print('\nDone!')
ssh.close()

