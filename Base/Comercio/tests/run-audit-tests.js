/**
 * Security Audit Test Runner
 * 
 * Runs all security audit tests from the 30-phase enterprise audit.
 * Usage: node tests/run-audit-tests.js
 */

console.log('╔══════════════════════════════════════════════╗');
console.log('║  Zyntra SGE v2.1.7 — Security Audit Tests   ║');
console.log('║  30-Phase Enterprise Audit — Phase 29        ║');
console.log('╚══════════════════════════════════════════════╝\n');

const start = Date.now();
let totalSuites = 0;
let failedSuites = 0;

function runSuite(name, path) {
    totalSuites++;
    try {
        require(path);
        console.log(`✅ Suite ${name} completed\n`);
    } catch (e) {
        failedSuites++;
        console.error(`❌ Suite ${name} FAILED: ${e.message}\n`);
    }
}

// Security tests
runSuite('SQL Injection Prevention', './unit/sql-injection.test.js');
runSuite('Input Sanitization', './unit/input-sanitization.test.js');
runSuite('Password & Auth', './unit/password-auth.test.js');
runSuite('File Upload Validation', './unit/upload-validation.test.js');
runSuite('Financial Precision', './unit/financial-precision.test.js');

// Existing test suites
runSuite('Repository Pattern', './unit/repository.test.js');
runSuite('Security & Middleware', './unit/security.test.js');

const elapsed = Date.now() - start;

console.log('═══════════════════════════════════════════════');
console.log(`Total suites: ${totalSuites} | Passed: ${totalSuites - failedSuites} | Failed: ${failedSuites}`);
console.log(`Time: ${elapsed}ms`);
console.log('═══════════════════════════════════════════════');

if (failedSuites > 0) {
    console.error('\n⛔ Some test suites failed!');
    process.exit(1);
} else {
    console.log('\n✅ All audit test suites passed!');
}
