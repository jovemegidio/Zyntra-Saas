const mysql = require('mysql2/promise');
(async () => {
    const p = await mysql.createPool({host:'localhost',user:'aluforce',password:'CHANGE_ME_DB_PASSWORD',database:'aluforce_vendas'});
    
    console.log('=== ordens_producao columns ===');
    const [r1] = await p.query('DESCRIBE ordens_producao');
    r1.forEach(c => console.log(c.Field + ' (' + c.Type + ')'));
    
    console.log('\n=== usuarios columns ===');
    const [r2] = await p.query('DESCRIBE usuarios');
    r2.forEach(c => console.log(c.Field + ' (' + c.Type + ')'));
    
    console.log('\n=== Check CSS file ===');
    const fs = require('fs');
    console.log('pcp.css exists:', fs.existsSync('/var/www/aluforce/modules/PCP/css/pcp.css'));
    const cssFiles = fs.readdirSync('/var/www/aluforce/modules/PCP/css/');
    console.log('CSS files:', cssFiles.join(', '));
    
    await p.end();
})();
