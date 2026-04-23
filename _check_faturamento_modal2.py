path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Find full modal starting at modalNovaNovenfe
idx = raw.find(b'modalNovaNovenfe')
print(f"First modalNovaNovenfe at byte {idx}")
# Get the full modal from opening tag
start = raw.rfind(b'<div class="modal-overlay"', 0, idx)
# Find end: closing </div> for modal-overlay
print(f"\nModal HTML (2200 bytes from modal-overlay open):")
print(raw[start:start+2200].decode('utf-8', 'replace'))
