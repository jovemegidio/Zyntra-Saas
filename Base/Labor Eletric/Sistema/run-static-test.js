// Self-contained runner that captures ALL output to file
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'pcp-result.txt');

try {
  fs.writeFileSync(OUT, '=== START ===\n');
  const result = execSync('node --test pcp-static-test.js', {
    cwd: __dirname,
    timeout: 45000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  fs.writeFileSync(OUT, '=== STDOUT ===\n' + result);
} catch (err) {
  let out = '=== ERROR ===\n';
  out += 'status: ' + err.status + '\n';
  out += 'signal: ' + err.signal + '\n';
  out += '--- stdout ---\n' + (err.stdout || '') + '\n';
  out += '--- stderr ---\n' + (err.stderr || '') + '\n';
  out += '--- message ---\n' + err.message + '\n';
  fs.writeFileSync(OUT, out);
}
