const { spawnSync } = require('child_process');
const { writeFileSync } = require('fs');
const path = require('path');

const root = __dirname;
const testFile = path.join(root, 'pcp-audit-fixes.test.js');

const r = spawnSync('node', ['--test', testFile], {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
});

writeFileSync(path.join(__dirname, 'pcp-test-result.txt'),
    '=== STDOUT ===\n' + (r.stdout || '') + '\n=== STDERR ===\n' + (r.stderr || '') + '\n=== STATUS: ' + r.status + '\n',
    'utf8'
);

console.log('Done. Status:', r.status);
