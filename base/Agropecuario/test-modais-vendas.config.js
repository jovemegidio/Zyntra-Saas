const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    testMatch: 'test-modais-vendas.spec.js',
    timeout: 60000,
    use: {
        ignoreHTTPSErrors: true,
        headless: true,
        viewport: { width: 1920, height: 1080 },
    },
    reporter: 'list',
});
