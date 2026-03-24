import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps', timeout=15)

script = """
mysql -u root -pAluforce2026VpsDB aluforce_vendas 2>&1 <<'SQL'
-- Sync foto from funcionarios -> usuarios where email matches
UPDATE usuarios u
JOIN funcionarios f ON LOWER(u.email) = LOWER(f.email)
SET u.foto = f.foto_perfil_url,
    u.avatar = f.foto_perfil_url
WHERE f.foto_perfil_url IS NOT NULL
  AND f.foto_perfil_url != ''
  AND (u.foto != f.foto_perfil_url OR u.foto IS NULL OR u.avatar IS NULL OR u.avatar != f.foto_perfil_url);

SELECT ROW_COUNT() as rows_updated;
SQL
"""
_, out, _ = ssh.exec_command(script)
out.channel.recv_exit_status()
print(out.read().decode())
ssh.close()

_, out, _ = ssh.exec_command(script)
out.channel.recv_exit_status()
print(out.read().decode())
ssh.close()
