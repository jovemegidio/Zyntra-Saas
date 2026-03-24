import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps')

# Check distinct roles and is_admin
_, so, se = c.exec_command(
    "mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e 'SELECT DISTINCT role, is_admin FROM usuarios LIMIT 30;'"
)
print("=== ROLES ===")
print(so.read().decode(errors='replace'))
print(se.read().decode(errors='replace'))

# Also check the upload directory exists
_, so, _ = c.exec_command("ls -la /var/www/uploads/RH/ 2>&1 || echo 'DIR NOT FOUND'")
print("\n=== UPLOAD DIR ===")
print(so.read().decode(errors='replace'))

# Check if the route upload actually gets hit - look for multer errors
_, so, _ = c.exec_command("tail -100 /var/www/aluforce/logs/err.log | grep -i 'foto\\|upload\\|rh\\|403' 2>&1 | tail -20")
print("\n=== ERR LOG ===")
print(so.read().decode(errors='replace'))

c.close()
