/**
 * Zyntra Igrejas — Login Script (CSP-safe, no inline handlers)
 * Matches the standard Zyntra ERP login pattern
 */

(function () {
    'use strict';

    // ── Demo Users ──
    var USERS = {
        'admin@zyntra.church':  { password: 'admin123',  name: 'Pastor Roberto Silva',  role: 'admin' },
        'lider@zyntra.church':  { password: 'lider123',  name: 'Pedro Costa',           role: 'lider' },
        'membro@zyntra.church': { password: 'membro123', name: 'Maria Santos',          role: 'membro' }
    };

    // ── Elements ──
    var form = document.getElementById('login-form');
    var emailInput = document.getElementById('email');
    var passwordInput = document.getElementById('password');
    var submitBtn = document.getElementById('login-submit-btn');
    var errorMessage = document.getElementById('error-message');
    var passwordToggle = document.getElementById('password-toggle');
    var eyeOpen = document.getElementById('eye-open');
    var eyeOff = document.getElementById('eye-off');

    // ── Password Toggle ──
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function () {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeOpen.style.display = 'none';
                eyeOff.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                eyeOpen.style.display = 'block';
                eyeOff.style.display = 'none';
            }
        });
    }

    // ── Demo Credentials Buttons ──
    var credContainer = document.getElementById('demo-credentials');
    if (credContainer) {
        var creds = [
            { email: 'admin@zyntra.church', pw: 'admin123', label: 'Admin / Pastor', color: 'hsla(234,89%,64%,0.06)', border: 'hsla(234,89%,64%,0.15)' },
            { email: 'lider@zyntra.church', pw: 'lider123', label: 'L\u00edder', color: 'hsla(210,80%,56%,0.06)', border: 'hsla(210,80%,56%,0.15)' },
            { email: 'membro@zyntra.church', pw: 'membro123', label: 'Membro', color: 'hsla(160,70%,45%,0.06)', border: 'hsla(160,70%,45%,0.15)' }
        ];
        creds.forEach(function (c) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:8px 12px;background:' + c.color + ';border:1px solid ' + c.border + ';border-radius:8px;cursor:pointer;color:hsla(215,20%,85%,1);font-family:inherit;font-size:12px;transition:all .2s';
            btn.innerHTML = '<span style="font-weight:500">' + c.label + '</span><span style="color:hsla(215,20%,55%,1)">' + c.email + '</span>';
            btn.addEventListener('click', function () {
                emailInput.value = c.email;
                passwordInput.value = c.pw;
                emailInput.focus();
            });
            btn.addEventListener('mouseenter', function () { btn.style.opacity = '0.8'; });
            btn.addEventListener('mouseleave', function () { btn.style.opacity = '1'; });
            credContainer.appendChild(btn);
        });
    }

    // ── Show Error ──
    function showError(msg) {
        if (!errorMessage) return;
        errorMessage.className = 'login-message error';
        errorMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;min-width:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + msg;
        errorMessage.style.display = 'flex';
    }

    function hideError() {
        if (errorMessage) errorMessage.style.display = 'none';
    }

    // ── Button States ──
    function setBtnState(state) {
        if (!submitBtn) return;
        submitBtn.className = 'login-submit-btn' + (state !== 'default' ? ' ' + state : '');
        submitBtn.disabled = state === 'loading';
    }

    // ── Login Form Submit ──
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();

            var email = emailInput.value.trim().toLowerCase();
            var pw = passwordInput.value;

            if (!email || !pw) {
                showError('Preencha email e senha.');
                return;
            }

            setBtnState('loading');

            // Simulate async login
            setTimeout(function () {
                var user = USERS[email];
                if (!user || user.password !== pw) {
                    setBtnState('default');
                    showError('Email ou senha incorretos. Use as credenciais de demonstra\u00e7\u00e3o abaixo.');
                    return;
                }

                // Save session
                sessionStorage.setItem('zyntra_igreja_auth', JSON.stringify({
                    email: email,
                    name: user.name,
                    role: user.role,
                    loginAt: new Date().toISOString()
                }));

                setBtnState('success');

                setTimeout(function () {
                    window.location.href = 'dashboard.html';
                }, 600);
            }, 800);
        });
    }

    // ── Dynamic Greeting ──
    var greetingEl = document.getElementById('login-greeting');
    if (greetingEl) {
        var hour = new Date().getHours();
        if (hour < 12) greetingEl.textContent = 'Bom dia';
        else if (hour < 18) greetingEl.textContent = 'Boa tarde';
        else greetingEl.textContent = 'Boa noite';
    }

    // ── Theme Dots ──
    var themeDots = document.querySelectorAll('.theme-dot');
    var bgGradient = document.getElementById('bg-gradient');
    var orb1 = document.getElementById('bg-orb-1');
    var orb2 = document.getElementById('bg-orb-2');

    var themes = [
        { gradient: 'theme-0', orb1: 'hsla(234, 80%, 55%, 0.15)', orb2: 'hsla(280, 80%, 55%, 0.10)' },
        { gradient: 'theme-1', orb1: 'hsla(210, 80%, 55%, 0.15)', orb2: 'hsla(190, 80%, 55%, 0.10)' },
        { gradient: 'theme-2', orb1: 'hsla(270, 80%, 55%, 0.15)', orb2: 'hsla(300, 80%, 55%, 0.10)' },
        { gradient: 'theme-3', orb1: 'hsla(215, 30%, 55%, 0.15)', orb2: 'hsla(234, 80%, 55%, 0.10)' }
    ];

    themeDots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            var idx = parseInt(dot.dataset.theme, 10);
            themeDots.forEach(function (d) { d.classList.remove('active'); });
            dot.classList.add('active');
            if (bgGradient) {
                bgGradient.className = 'bg-gradient-overlay theme-' + idx;
            }
            if (orb1) orb1.style.background = themes[idx].orb1;
            if (orb2) orb2.style.background = themes[idx].orb2;
        });
    });

    // ── Auto-cycle themes ──
    var currentTheme = 0;
    setInterval(function () {
        currentTheme = (currentTheme + 1) % 4;
        themeDots.forEach(function (d) { d.classList.remove('active'); });
        var activeDot = document.querySelector('.theme-dot[data-theme="' + currentTheme + '"]');
        if (activeDot) activeDot.classList.add('active');
        if (bgGradient) bgGradient.className = 'bg-gradient-overlay theme-' + currentTheme;
        if (orb1) orb1.style.background = themes[currentTheme].orb1;
        if (orb2) orb2.style.background = themes[currentTheme].orb2;
    }, 8000);

    // ── Mount Animation (show login card) ──
    var loginContent = document.getElementById('login-content');
    if (loginContent) {
        setTimeout(function () {
            loginContent.classList.add('mounted');
        }, 100);
    }

    // ── Floating Particles ──
    var particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 8) + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            particlesContainer.appendChild(p);
        }
    }

})();
