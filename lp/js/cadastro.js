/* ========================================
   Zyntra - Cadastro / Signup Page JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupForm');
    const steps = document.querySelectorAll('.signup__step');
    const progressFill = document.getElementById('progressFill');
    const progressSteps = document.querySelectorAll('.signup__progress-step');
    const submitBtn = document.getElementById('submitBtn');
    const successOverlay = document.getElementById('successOverlay');
    let currentStep = 1;

    // ========== URL PARAMS (pre-select plan) ==========
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedPlan = urlParams.get('plano');
    if (preSelectedPlan) {
        const planInput = document.querySelector(`input[name="plano"][value="${preSelectedPlan}"]`);
        if (planInput) {
            document.querySelectorAll('input[name="plano"]').forEach(r => r.checked = false);
            planInput.checked = true;
        }
    }

    // ========== STEP NAVIGATION ==========
    function goToStep(step) {
        steps.forEach(s => s.classList.remove('active'));
        const target = document.querySelector(`[data-step="${step}"]`);
        if (target) {
            target.classList.add('active');
            currentStep = step;

            // Update progress
            const pct = Math.round((step / 3) * 100);
            progressFill.style.width = `${pct}%`;

            progressSteps.forEach(ps => {
                const stepNum = parseInt(ps.dataset.stepIndicator);
                ps.classList.remove('active', 'completed');
                if (stepNum === step) ps.classList.add('active');
                if (stepNum < step) ps.classList.add('completed');
            });

            // Scroll to top of form
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Next buttons
    document.querySelectorAll('.signup__next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                goToStep(parseInt(btn.dataset.next));
            }
        });
    });

    // Back buttons
    document.querySelectorAll('.signup__back').forEach(btn => {
        btn.addEventListener('click', () => {
            goToStep(parseInt(btn.dataset.back));
        });
    });

    // ========== VALIDATION ==========
    function validateStep(step) {
        clearErrors();
        let valid = true;

        if (step === 1) {
            const nome = document.getElementById('nome');
            const email = document.getElementById('email');
            const telefone = document.getElementById('telefone');
            const senha = document.getElementById('senha');
            const senhaConfirm = document.getElementById('senha_confirm');

            if (!nome.value.trim() || nome.value.trim().length < 3) {
                showError('nome', 'Informe seu nome completo');
                valid = false;
            }

            if (!email.value.trim() || !isValidEmail(email.value)) {
                showError('email', 'Informe um e-mail válido');
                valid = false;
            }

            if (!telefone.value.trim() || telefone.value.replace(/\D/g, '').length < 10) {
                showError('telefone', 'Informe um telefone válido');
                valid = false;
            }

            if (!senha.value || senha.value.length < 8) {
                showError('senha', 'A senha deve ter no mínimo 8 caracteres');
                valid = false;
            }

            if (senha.value !== senhaConfirm.value) {
                showError('senha_confirm', 'As senhas não conferem');
                valid = false;
            }
        }

        if (step === 2) {
            const empresaNome = document.getElementById('empresa_nome');
            const setorSelected = document.querySelector('input[name="setor"]:checked');

            if (!empresaNome.value.trim()) {
                showError('empresa_nome', 'Informe o nome da empresa');
                valid = false;
            }

            if (!setorSelected) {
                showError('setor', 'Selecione o segmento do negócio');
                valid = false;
            }
        }

        return valid;
    }

    function showError(field, message) {
        const errorEl = document.getElementById(`${field}-error`);
        const inputEl = document.getElementById(field);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) inputEl.classList.add('error');
    }

    function clearErrors() {
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ========== PASSWORD STRENGTH ==========
    const senhaInput = document.getElementById('senha');
    const strengthBar = document.querySelector('.password-strength__bar span');
    const strengthText = document.querySelector('.password-strength__text');

    if (senhaInput) {
        senhaInput.addEventListener('input', () => {
            const val = senhaInput.value;
            let score = 0;
            if (val.length >= 8) score++;
            if (val.length >= 12) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const levels = [
                { width: '20%', color: '#E17055', text: 'Fraca' },
                { width: '40%', color: '#FDCB6E', text: 'Razoável' },
                { width: '60%', color: '#FDCB6E', text: 'Média' },
                { width: '80%', color: '#00B894', text: 'Forte' },
                { width: '100%', color: '#00B894', text: 'Muito forte' }
            ];

            const level = levels[Math.min(score, 4)];
            if (val.length === 0) {
                strengthBar.style.width = '0';
                strengthText.textContent = '';
            } else {
                strengthBar.style.width = level.width;
                strengthBar.style.background = level.color;
                strengthText.textContent = level.text;
                strengthText.style.color = level.color;
            }
        });
    }

    // ========== PASSWORD TOGGLE ==========
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        });
    });

    // ========== PHONE MASK ==========
    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 6) {
                v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
            } else if (v.length > 2) {
                v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            } else if (v.length > 0) {
                v = `(${v}`;
            }
            e.target.value = v;
        });
    }

    // ========== CNPJ MASK ==========
    const cnpjInput = document.getElementById('cnpj');
    if (cnpjInput) {
        cnpjInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 14) v = v.slice(0, 14);
            if (v.length > 12) {
                v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
            } else if (v.length > 8) {
                v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
            } else if (v.length > 5) {
                v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
            } else if (v.length > 2) {
                v = `${v.slice(0,2)}.${v.slice(2)}`;
            }
            e.target.value = v;
        });
    }

    // ========== FORM SUBMIT ==========
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate terms
        const termos = document.getElementById('termos');
        if (!termos.checked) {
            showError('termos', 'Você precisa aceitar os termos para continuar');
            return;
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Criando sua conta...
        `;

        const formData = {
            nome: document.getElementById('nome').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefone: document.getElementById('telefone').value.trim(),
            senha: document.getElementById('senha').value,
            empresa_nome: document.getElementById('empresa_nome').value.trim(),
            cnpj: document.getElementById('cnpj').value.replace(/\D/g, '') || null,
            setor: document.querySelector('input[name="setor"]:checked')?.value,
            funcionarios: document.getElementById('funcionarios').value || null,
            plano: document.querySelector('input[name="plano"]:checked')?.value || 'profissional'
        };

        try {
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Show success modal
                const planNames = { starter: 'Starter', profissional: 'Profissional', enterprise: 'Enterprise' };
                document.getElementById('successPlan').textContent = planNames[formData.plano] || formData.plano;
                successOverlay.classList.add('visible');

                // Auto-redirect countdown
                let secs = 5;
                const countdownEl = document.getElementById('countdown');
                const countdownInterval = setInterval(() => {
                    secs--;
                    if (countdownEl) countdownEl.textContent = secs;
                    if (secs <= 0) {
                        clearInterval(countdownInterval);
                        window.location.href = '/login.html?welcome=1';
                    }
                }, 1000);
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                // Show specific field errors from API
                if (result.field) {
                    showError(result.field, result.message);
                    if (result.field === 'email' || result.field === 'nome') goToStep(1);
                    else if (result.field === 'empresa_nome' || result.field === 'setor') goToStep(2);
                } else {
                    alert(result.message || 'Ocorreu um erro. Tente novamente.');
                }
            }
        } catch (err) {
            console.error('Signup error:', err);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            alert('Erro de conexão. Verifique sua internet e tente novamente.');
        }
    });

    // ========== ADD SPIN CSS ==========
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }';
    document.head.appendChild(style);
});
