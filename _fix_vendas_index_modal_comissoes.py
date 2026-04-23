import sys

f = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\index.html'
with open(f, 'rb') as fh:
    raw = fh.read()

# Fix 1: modal-item-título -> modal-item-titulo (2 ocorrências no JS)
old1 = 'modal-item-t\u00edtulo'.encode('utf-8')
new1 = b'modal-item-titulo'
count1 = raw.count(old1)
raw = raw.replace(old1, new1)
print(f'modal-item-titulo fixes: {count1}')

# Fix 2: Ocultar botão Comissões para não-admin e não-Comercial
old2 = b'''            // ---- FATURAR: vendedores n\xc3\xa3o podem faturar ----
            if (usuarioLogado.isVendedor) {
                const btnFaturarTodos = document.getElementById('btn-faturar-todos');
                const btnComunicarSefaz = document.getElementById('btn-comunicar-sefaz');
                if (btnFaturarTodos) btnFaturarTodos.style.display = 'none';
                if (btnComunicarSefaz) btnComunicarSefaz.style.display = 'none';
            }
        }

        async function carregarUsuarioLogado()'''

new2 = b'''            // ---- FATURAR: vendedores n\xc3\xa3o podem faturar ----
            if (usuarioLogado.isVendedor) {
                const btnFaturarTodos = document.getElementById('btn-faturar-todos');
                const btnComunicarSefaz = document.getElementById('btn-comunicar-sefaz');
                if (btnFaturarTodos) btnFaturarTodos.style.display = 'none';
                if (btnComunicarSefaz) btnComunicarSefaz.style.display = 'none';
            }

            // ---- COMISS\xc3\x95ES: ocultar para quem n\xc3\xa3o \xc3\xa9 admin e n\xc3\xa3o \xc3\xa9 do departamento Comercial ----
            if (!usuarioLogado.isAdmin) {
                const isComercial = (
                    usuarioLogado.departamento === 'Comercial' ||
                    usuarioLogado.role === 'comercial' ||
                    usuarioLogado.role === 'vendedor'
                );
                if (!isComercial) {
                    document.querySelectorAll('.sidebar-btn[data-page="page.comissoes"]').forEach(function(btn) {
                        btn.style.display = 'none';
                    });
                    console.log('[Vendas] Comiss\xc3\xb5es oculto \xe2\x80\x94 usu\xc3\xa1rio n\xc3\xa3o \xc3\xa9 Comercial');
                }
            }
        }

        async function carregarUsuarioLogado()'''

count2 = raw.count(old2)
if count2 == 1:
    raw = raw.replace(old2, new2)
    print('Comissoes hide: aplicado')
else:
    print(f'AVISO: bloco FATURAR encontrado {count2} vezes - verifique manualmente')

with open(f, 'wb') as fh:
    fh.write(raw)

print('Concluido.')
