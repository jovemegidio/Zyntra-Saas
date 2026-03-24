import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.64.102', username='root', password='Aluforce@2026#Vps')
cmd = "mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e \"SELECT COUNT(*) as total FROM contas_receber; SELECT id, empresa, nota_fiscal, parcela_info, cliente_nome, cnpj_cliente, valor, situacao, portador, status, posicao FROM contas_receber LIMIT 5;\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())
ssh.close()
