#!/bin/bash
# ===========================================
# Fix Zyntra Nginx - FINAL VERSION
# ===========================================
echo "=== STEP 1: Move backups OUT of sites-enabled ==="
mkdir -p /etc/nginx/backups
mv /etc/nginx/sites-enabled/aluforce.bak.* /etc/nginx/backups/ 2>/dev/null
echo "Moved $(ls /etc/nginx/backups/ 2>/dev/null | wc -l) backup files"

echo ""
echo "=== STEP 2: Show current problem area ==="
sed -n '168,185p' /etc/nginx/sites-enabled/aluforce

echo ""
echo "=== STEP 3: Fix config with Python ==="
python3 << 'PYEOF'
with open("/etc/nginx/sites-enabled/aluforce", "r") as f:
    lines = f.readlines()

# Find and remove the orphaned block (lines after wbot-socket close that have stray location)
new_lines = []
skip_orphan = False
i = 0
while i < len(lines):
    line = lines[i]
    
    # Detect orphaned nested location outside its parent
    # Pattern: "        location ~*" right after a "    }" closing (wbot-socket)
    if '        location ~* \\.' in line and i > 0:
        # Check if previous non-empty line was a closing brace at 4-space indent
        prev_idx = i - 1
        while prev_idx >= 0 and lines[prev_idx].strip() == '':
            prev_idx -= 1
        if prev_idx >= 0 and lines[prev_idx].strip() == '}':
            # This is an orphaned location, skip it and its closing
            print(f"Removing orphaned line {i+1}: {line.rstrip()}")
            # Skip until matching close
            brace_count = 0
            while i < len(lines):
                if '{' in lines[i]:
                    brace_count += 1
                if '}' in lines[i]:
                    brace_count -= 1
                    if brace_count <= 0:
                        print(f"Removing orphaned line {i+1}: {lines[i].rstrip()}")
                        i += 1
                        break
                print(f"Removing orphaned line {i+1}: {lines[i].rstrip()}")
                i += 1
            # Also remove the extra closing brace after it
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            if i < len(lines) and lines[i].strip() == '}':
                print(f"Removing extra closing brace line {i+1}")
                i += 1
            continue
    
    new_lines.append(line)
    i += 1

content = ''.join(new_lines)

# Verify Zyntra block exists
if 'location ^~ /Zyntra-SGE/' not in content:
    print("Adding Zyntra block...")
    zyntra = """
    # ============================================
    # ZYNTRA-SGE - Landing Page estatica
    # ============================================
    location ^~ /Zyntra-SGE/ {
        root /var/www/aluforce;
        index index.html;
        try_files $uri $uri/ /Zyntra-SGE/index.html;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
    }

"""
    content = content.replace(
        '    # Rota raiz e arquivos estaticos',
        zyntra + '    # Rota raiz e arquivos estaticos'
    )
else:
    print("Zyntra block already present")

with open("/etc/nginx/sites-enabled/aluforce", "w") as f:
    f.write(content)

print("Config written successfully")
PYEOF

echo ""
echo "=== STEP 4: Verify no extra files in sites-enabled ==="
ls -la /etc/nginx/sites-enabled/

echo ""
echo "=== STEP 5: Test Nginx ==="
nginx -t 2>&1
if [ $? -eq 0 ]; then
    nginx -s reload
    echo "✅ Nginx OK and reloaded!"
    
    sleep 1
    echo ""
    echo "=== STEP 6: HTTP Tests ==="
    curl -s -o /dev/null -w "Index:  HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/Zyntra-SGE/"
    curl -s -o /dev/null -w "Login:  HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/Zyntra-SGE/login.html"
    curl -s -o /dev/null -w "CSS:    HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/Zyntra-SGE/css/styles.css"
    curl -s -o /dev/null -w "JS:     HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/Zyntra-SGE/js/main.js"
    curl -s -o /dev/null -w "404pg:  HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/Zyntra-SGE/404.html"
    
    echo ""
    echo "=== Aluforce main still working? ==="
    curl -s -o /dev/null -w "Main:   HTTP %{http_code} | %{size_download} bytes\n" "https://aluforce.api.br/"
else
    echo "❌ Nginx STILL failing! Showing error context:"
    cat -n /etc/nginx/sites-enabled/aluforce | head -200
fi
