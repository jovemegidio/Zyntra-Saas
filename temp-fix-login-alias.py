import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=15)

# Check current login field for Fabiano
script_check = """
mysql -u root -pAluforce2026VpsDB aluforce_vendas 2>&1 <<'SQL'
SELECT id, nome, email, login, foto FROM usuarios WHERE email LIKE '%fabiano%';
SQL
"""
_, out, _ = ssh.exec_command(script_check)
out.channel.recv_exit_status()
result = out.read().decode()
print("Current state:")
print(result)

# The user is typing fabiano.marques@aluforce.ind.br
# Real email is fabiano.oliveira@aluforce.ind.br
# login field currently shows 'fabiano.oliveira'
# We need to add 'fabiano.marques' as the login alias so the user can log in with that email prefix too.
# Strategy: The auth query is: WHERE email = ? OR login = ?
# So if we set login = 'fabiano.marques', user can login with fabiano.marques@aluforce.ind.br

ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=15)

script_fix = """
mysql -u root -pAluforce2026VpsDB aluforce_vendas 2>&1 <<'SQL'
UPDATE usuarios SET login = 'fabiano.marques' WHERE email = 'fabiano.oliveira@aluforce.ind.br' LIMIT 1;
SELECT id, nome, email, login FROM usuarios WHERE email = 'fabiano.oliveira@aluforce.ind.br';
SQL
"""
_, out2, _ = ssh2.exec_command(script_fix)
out2.channel.recv_exit_status()
print("After fix:")
print(out2.read().decode())
ssh2.close()
