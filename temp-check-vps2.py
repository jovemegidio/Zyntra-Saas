import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=30)

def run(cmd):
    _, so, se = ssh.exec_command(cmd)
    return so.read().decode(errors='replace').strip() or se.read().decode(errors='replace').strip()

print('auth fallback:', run('grep -c Fallback /var/www/aluforce/src/routes/auth.js'))
print('dblclick:', run('grep -c ondblclick /var/www/aluforce/modules/Financeiro/public/contas_receber.html'))
print('fin public dir:', run('ls /var/www/aluforce/modules/Financeiro/public/'))
print('nfe dropdown:', run('grep -c user-dropdown /var/www/aluforce/modules/NFe/index.html'))
print('fin dropdown:', run('grep -c user-dropdown /var/www/aluforce/modules/Financeiro/index.html'))
print('rh dropdown:', run('grep -c user-dropdown /var/www/aluforce/modules/RH/public/areaadm.html'))

ssh.close()
