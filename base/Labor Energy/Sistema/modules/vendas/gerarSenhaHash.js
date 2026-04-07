const bcrypt = require('bcryptjs');
const senha = process.argv[2];
if (!senha) {
    console.error('Uso: node gerarSenhaHash.js <senha>');
    process.exit(1);
}
bcrypt.hash(senha, 10).then(hash => {
    console.log('Hash gerado:', hash);
});
