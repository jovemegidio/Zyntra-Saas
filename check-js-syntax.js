const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

let errors = 0;
for (const f of files) {
    try {
        const code = fs.readFileSync(path.join(dir, f), 'utf8');
        new Function(code);
    } catch (e) {
        errors++;
        console.log(`[SYNTAX ERROR] ${f}: ${e.message.split('\n')[0]}`);
    }
}
console.log(`\nChecked ${files.length} JS files, ${errors} syntax errors`);
