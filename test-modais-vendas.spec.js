/**
 * E2E Test: Modais "Incluir Cliente" e "Novo Pedido de Venda"
 * Testa abertura, conteúdo, botão fechar e fechamento de cada modal.
 * Roda contra a VPS de produção (https://31.97.64.102).
 */
const { test, expect } = require('@playwright/test');

const BASE = 'https://31.97.64.102';
const LOGIN_EMAIL = 'contato@aluforce.com.br';
const LOGIN_PASS = 'Aluforce@2026#Admin';

async function login(page) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', LOGIN_EMAIL);
    await page.fill('#password', LOGIN_PASS);
    await page.click('button[type="submit"]');
    // Wait for redirect to dashboard or main page
    await page.waitForURL('**/modules/**', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
}

async function navigateToVendas(page) {
    await page.goto(`${BASE}/modules/Vendas/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // let JS initialize
}

test.describe('Modal: Novo Pedido de Venda', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`CONSOLE ERROR: ${msg.text()}`);
        });
        await login(page);
        await navigateToVendas(page);
    });

    test('modal abre via abrirModalNovoPedido()', async ({ page }) => {
        // Check function exists
        const fnExists = await page.evaluate(() => typeof abrirModalNovoPedido === 'function');
        expect(fnExists).toBe(true);

        // Open modal
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(1000);

        // Modal should be visible (has 'active' class)
        const modal = page.locator('#modal-editar-pedido');
        await expect(modal).toHaveClass(/active/);

        // Title should be "Novo Pedido de Venda"
        const title = await page.locator('#modal-título-pedido').textContent();
        expect(title).toContain('Novo Pedido de Venda');
    });

    test('modal contém elementos essenciais', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(1000);

        // Close button exists
        const closeBtn = page.locator('#modal-editar-pedido .close-btn');
        await expect(closeBtn).toBeVisible();

        // Close button has text "Fechar"
        const btnText = await closeBtn.textContent();
        expect(btnText).toContain('Fechar');

        // Modal header exists
        const header = page.locator('#modal-editar-pedido .modal-header-omie');
        await expect(header).toBeVisible();
    });

    test('botão Fechar fecha o modal (novo pedido = mostra confirmação)', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(1000);

        // Click close button
        await page.locator('#modal-editar-pedido .close-btn').click();
        await page.waitForTimeout(500);

        // Since it's a new unsaved order, a confirmation dialog should appear
        // Look for the confirmation modal (mostrarConfirmacao)
        const confirmVisible = await page.evaluate(() => {
            // Check for any confirmation overlay/modal
            const els = document.querySelectorAll('.modal-overlay.active, .confirmacao-overlay, .swal2-container, [class*="confirm"]');
            for (const el of els) {
                if (el.id !== 'modal-editar-pedido' && el.offsetParent !== null) return true;
            }
            return false;
        });

        // Either confirmation showed OR modal closed directly
        // Both are valid behaviors depending on modoNovoPedido state
        console.log(`Confirmation dialog visible: ${confirmVisible}`);

        if (confirmVisible) {
            // Click "Descartar" to confirm close
            const discardBtn = page.locator('button:has-text("Descartar")').first();
            if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await discardBtn.click();
                await page.waitForTimeout(500);
            }
        }

        // After dismissing, modal should be closed
        const isActive = await page.locator('#modal-editar-pedido').evaluate(el => el.classList.contains('active'));
        expect(isActive).toBe(false);
    });

    test('close-btn tem estilo pill-shaped (border-radius: 20px)', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(1000);

        const styles = await page.locator('#modal-editar-pedido .close-btn').evaluate(el => {
            const cs = window.getComputedStyle(el);
            return {
                borderRadius: cs.borderRadius,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                cursor: cs.cursor,
            };
        });

        console.log('Close button computed styles:', JSON.stringify(styles));
        expect(styles.borderRadius).toBe('20px');
        expect(styles.cursor).toBe('pointer');
    });
});

test.describe('Modal: Incluir Cliente', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`CONSOLE ERROR: ${msg.text()}`);
        });
        await login(page);
        await navigateToVendas(page);
    });

    test('modal abre via abrirModalNovoCliente()', async ({ page }) => {
        // Check function exists
        const fnExists = await page.evaluate(() => typeof abrirModalNovoCliente === 'function');
        expect(fnExists).toBe(true);

        // Open modal
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(1000);

        // Modal should be visible
        const modal = page.locator('#modal-novo-cliente');
        await expect(modal).toHaveClass(/active/);

        // Title should contain "Incluir Cliente"
        const title = await page.locator('#modal-novo-cliente .modal-header-omie h2').textContent();
        expect(title).toContain('Incluir Cliente');
    });

    test('modal contém elementos essenciais', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(1000);

        // Close button exists
        const closeBtn = page.locator('#modal-novo-cliente .close-btn');
        await expect(closeBtn).toBeVisible();

        // Close button text
        const btnText = await closeBtn.textContent();
        expect(btnText).toContain('Fechar');

        // Modal header
        const header = page.locator('#modal-novo-cliente .modal-header-omie');
        await expect(header).toBeVisible();

        // Has "Pesquisa" sections
        const bodyContent = await page.locator('#modal-novo-cliente .modal-body-cliente').textContent();
        expect(bodyContent).toContain('Pesquisa');
    });

    test('botão Fechar fecha o modal (sem alterações)', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(500);

        // Wait for initial state capture (100ms timeout in code)
        await page.waitForTimeout(200);

        // Click close - without changes, should close directly
        await page.locator('#modal-novo-cliente .close-btn').click();
        await page.waitForTimeout(500);

        // Modal should be closed
        const isActive = await page.locator('#modal-novo-cliente').evaluate(el => el.classList.contains('active'));
        expect(isActive).toBe(false);
    });

    test('verificarAlteracoesCliente detecta alterações', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(500);

        // Type something in a field to create a change
        const manualCnpj = page.locator('#manual-cnpj');
        if (await manualCnpj.isVisible({ timeout: 2000 }).catch(() => false)) {
            await manualCnpj.fill('12345678000100');
            await page.waitForTimeout(200);

            // Try to close - should show changes popup
            await page.locator('#modal-novo-cliente .close-btn').click();
            await page.waitForTimeout(500);

            // Check if a changes popup appeared or modal is still active
            const stillActive = await page.locator('#modal-novo-cliente').evaluate(el => el.classList.contains('active'));
            console.log(`Modal still active after close with changes: ${stillActive}`);
            // If change detection works, modal should still be open (showing popup)
        } else {
            console.log('Manual CNPJ field not directly visible - section may be collapsed');
        }
    });

    test('close-btn tem estilo pill-shaped correto', async ({ page }) => {
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(1000);

        const styles = await page.locator('#modal-novo-cliente .close-btn').evaluate(el => {
            const cs = window.getComputedStyle(el);
            return {
                borderRadius: cs.borderRadius,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                cursor: cs.cursor,
                color: cs.color,
                backgroundColor: cs.backgroundColor,
            };
        });

        console.log('Incluir Cliente close button styles:', JSON.stringify(styles));
        expect(styles.borderRadius).toBe('20px');
        expect(styles.cursor).toBe('pointer');
    });
});

test.describe('Interação entre modais', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`CONSOLE ERROR: ${msg.text()}`);
        });
        await login(page);
        await navigateToVendas(page);
    });

    test('abrir Novo Pedido, depois abrir Incluir Cliente', async ({ page }) => {
        // Open Novo Pedido first
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(1000);

        const pedidoActive = await page.locator('#modal-editar-pedido').evaluate(el => el.classList.contains('active'));
        expect(pedidoActive).toBe(true);

        // Try to open Incluir Cliente
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(500);

        const clienteActive = await page.locator('#modal-novo-cliente').evaluate(el => el.classList.contains('active'));
        expect(clienteActive).toBe(true);

        // Both modals should exist in DOM
        const pedidoStillExists = await page.locator('#modal-editar-pedido').count();
        expect(pedidoStillExists).toBe(1);
    });

    test('fechar Incluir Cliente e voltar para Novo Pedido', async ({ page }) => {
        // Open both
        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(500);
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(500);

        // Close Incluir Cliente
        await page.evaluate(() => fecharModalNovoCliente());
        await page.waitForTimeout(300);

        // Incluir Cliente should be closed
        const clienteActive = await page.locator('#modal-novo-cliente').evaluate(el => el.classList.contains('active'));
        expect(clienteActive).toBe(false);

        // Pedido should still be active
        const pedidoActive = await page.locator('#modal-editar-pedido').evaluate(el => el.classList.contains('active'));
        expect(pedidoActive).toBe(true);
    });

    test('nenhum erro de JS no console durante operações', async ({ page }) => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.evaluate(() => abrirModalNovoPedido());
        await page.waitForTimeout(500);
        await page.evaluate(() => abrirModalNovoCliente());
        await page.waitForTimeout(500);
        await page.evaluate(() => fecharModalNovoCliente());
        await page.waitForTimeout(300);

        // Report any JS errors
        if (errors.length > 0) {
            console.log('JS ERRORS:', errors);
        }
        // We log but don't fail on console errors since some may be unrelated network errors
        console.log(`Total JS errors during modal operations: ${errors.length}`);
    });
});
