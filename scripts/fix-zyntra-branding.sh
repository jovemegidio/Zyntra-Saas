#!/bin/bash
# Fix Zyntra Demo: logo, favicon, header alignment
set -e

CONF="/etc/nginx/sites-enabled/aluforce"
cp "$CONF" "$CONF.bak-logo-fix"

# ==========================
# Replace the entire zyntra-demo location block
# ==========================

# First, find the line numbers of the zyntra-demo block
START=$(grep -n 'ZYNTRA DEMO - ERP Demonstracao' "$CONF" | head -1 | cut -d: -f1)
# Find the closing brace - count braces from the location line
LOCATION_LINE=$(awk "NR>=$START && /location \^~ \/zyntra-demo\//{print NR; exit}" "$CONF")

if [ -z "$LOCATION_LINE" ]; then
    echo "ERROR: Could not find zyntra-demo location block"
    exit 1
fi

echo "Found zyntra-demo block starting at line $START, location at line $LOCATION_LINE"

# Find the matching closing brace
END=$(awk -v start="$LOCATION_LINE" '
    NR==start { depth=0 }
    NR>=start {
        for(i=1;i<=length($0);i++) {
            c=substr($0,i,1)
            if(c=="{") depth++
            if(c=="}") { depth--; if(depth==0) { print NR; exit } }
        }
    }
' "$CONF")

echo "Location block ends at line $END"

# Delete the old block (from the first ZYNTRA DEMO comment to the closing brace)
# We need to go one line before START to include the comment
BLOCK_START=$((START - 1))
if [ "$BLOCK_START" -lt 1 ]; then BLOCK_START=1; fi

echo "Deleting lines $BLOCK_START to $END"

# Create the new block
NEW_BLOCK='
    # ============================================
    # ZYNTRA DEMO - ERP Demonstracao (porta 3003)
    # ============================================
    location ^~ /zyntra-demo/ {
        proxy_pass http://localhost:3003/;
        # Reescrever Location headers de redirect
        proxy_redirect / /zyntra-demo/;
        proxy_redirect http://localhost:3003/ /zyntra-demo/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Accept-Encoding "";
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_set_header X-Base-Path /zyntra-demo;

        # === BRANDING: Aluforce -> Zyntra via Nginx sub_filter ===
        sub_filter_once off;
        sub_filter_types text/css application/javascript;

        # -------------------------------------------------------
        # 1) LOGOS - MUST come BEFORE catch-all text replacements
        #    (otherwise "Aluforce" in filenames gets changed first)
        # -------------------------------------------------------
        # Dashboard: blue logo (light mode)
        sub_filter "Logo Monocromatico - Azul - Aluforce.png" "zyntra-logo.png";
        sub_filter "Logo Monocromatico - Azul - Aluforce.webp" "zyntra-logo.png";
        # Dashboard: white logo (dark mode)
        sub_filter "Logo Monocromatico - Branco - Aluforce copy.webp" "zyntra-branco.png";
        sub_filter "Logo Monocromatico - Branco - Aluforce copy.png" "zyntra-branco.png";
        # Modules: white logo on dark header
        sub_filter "Logo Monocromatico - Branco - Aluforce.png" "zyntra-branco.png";
        sub_filter "Logo Monocromatico - Branco - Aluforce.webp" "zyntra-branco.png";
        # Other logo variants
        sub_filter "Interativo-Aluforce.png" "zyntra-logo.png";
        sub_filter "Interativo-Aluforce.webp" "zyntra-logo.png";

        # -------------------------------------------------------
        # 2) FAVICON - change HTML link tag reference
        # -------------------------------------------------------
        sub_filter "href=\"/favicon.ico\"" "href=\"/images/favicon-zyntra.jpg\"";
        sub_filter "href=\"/Favicon.ico\"" "href=\"/images/favicon-zyntra.jpg\"";
        sub_filter "href=\"/favicon-aluforce.png\"" "href=\"/images/favicon-zyntra.jpg\"";
        sub_filter "href=\"/icons/favicon-32x32.png\"" "href=\"/images/favicon-zyntra.jpg\"";
        sub_filter "href=\"/icons/favicon-16x16.png\"" "href=\"/images/favicon-zyntra.jpg\"";

        # -------------------------------------------------------
        # 3) CATCH-ALL text replacements (after logos are handled)
        # -------------------------------------------------------
        sub_filter "ALUFORCE" "ZYNTRA";
        sub_filter "Aluforce" "Zyntra";
        sub_filter "aluforce" "zyntra";

        # Fix: revert API domain (was changed by catch-all above)
        sub_filter "zyntra.api.br" "aluforce.api.br";

        # -------------------------------------------------------
        # 4) EMAILS
        # -------------------------------------------------------
        sub_filter "@zyntra.ind.br" "@zyntra.com.br";

        # -------------------------------------------------------
        # 5) CSS BRANDING + BANNER + HEADER FIX injected before </head>
        # -------------------------------------------------------
        sub_filter "</head>" "<style id=\"zyntra-brand\">
/* === Zyntra Brand Colors === */
:root {
  --primary: #6C5CE7 !important;
  --primary-hover: #5A4BD1 !important;
  --accent: #A29BFE !important;
}

/* === Demo Banner === */
.zyntra-demo-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: linear-gradient(135deg, #6C5CE7 0%, #4834d4 100%);
  color: #fff;
  text-align: center;
  padding: 6px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(108,92,231,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 36px;
  box-sizing: border-box;
}
.zyntra-demo-banner a {
  color: #fff;
  background: rgba(255,255,255,.2);
  padding: 3px 12px;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}
.zyntra-demo-banner a:hover {
  background: rgba(255,255,255,.35);
}

/* === Push everything down for the fixed banner === */
body {
  padding-top: 36px !important;
}

/* Dashboard main-header */
.main-header {
  top: 36px !important;
}

/* Module sidebar */
.sidebar,
[class*='sidebar'] {
  top: 36px !important;
  height: calc(100vh - 36px) !important;
}

/* Module header (fixed position) */
header.header,
.header {
  top: 36px !important;
}

/* Main content area needs to account for banner */
.main-content-area,
.content-wrapper,
.main-content {
  margin-top: 0 !important;
}

/* Module app-container fix */
.app-container {
  padding-top: 0 !important;
}

/* === Dashboard header logo sizing === */
.header-logo img {
  height: 34px !important;
  width: auto !important;
  max-width: 160px !important;
  object-fit: contain !important;
}

/* === Module header brand logo sizing === */
.header-brand img {
  height: 24px !important;
  width: auto !important;
  max-width: 120px !important;
  object-fit: contain !important;
}

/* === User avatar fix for demo === */
.user-avatar-header {
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE) !important;
  color: #fff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

/* === Fix notification panel z-index above banner === */
.notification-panel,
.user-dropdown-menu,
[class*='dropdown'] {
  z-index: 100000 !important;
}

/* === Chat Teams overlay fix === */
.chat-teams-container {
  top: 36px !important;
  height: calc(100vh - 36px) !important;
}
</style></head>";

        # -------------------------------------------------------
        # 6) BANNER HTML injected after <body>
        # -------------------------------------------------------
        sub_filter "<body>" "<body><div class=\"zyntra-demo-banner\">&#128640; <strong>Modo Demonstra&ccedil;&atilde;o</strong> &mdash; Explore todas as funcionalidades do Zyntra SGE livremente <a href=\"/Zyntra-SGE/\" target=\"_blank\">&larr; Assinar Plano</a></div>";
        sub_filter "<body " "<body data-demo=\"true\" ";

        # -------------------------------------------------------
        # 7) BASE-PATH REWRITE SCRIPT before </body>
        # -------------------------------------------------------
        sub_filter "</body>" "<script id=\"zyntra-base-path\">(function(){var B='/zyntra-demo';if(location.pathname.indexOf(B)!==0)return;if(!window.__zyntraPatched){window.__zyntraPatched=true;var _open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){if(typeof u==='string'&&u.charAt(0)==='/'&&u.indexOf(B)!==0){u=B+u}return _open.apply(this,arguments)};var _fetch=window.fetch;window.fetch=function(u,o){if(typeof u==='string'&&u.charAt(0)==='/'&&u.indexOf(B)!==0){u=B+u}return _fetch.call(this,u,o)};document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href){var p=new URL(a.href);if(p.origin===location.origin&&p.pathname.charAt(0)==='/'&&p.pathname.indexOf(B)!==0){a.href=B+p.pathname+p.search+p.hash}}},true);var _pushState=history.pushState;history.pushState=function(){if(arguments[2]&&typeof arguments[2]==='string'&&arguments[2].charAt(0)==='/'&&arguments[2].indexOf(B)!==0){arguments[2]=B+arguments[2]}return _pushState.apply(this,arguments)};var _replaceState=history.replaceState;history.replaceState=function(){if(arguments[2]&&typeof arguments[2]==='string'&&arguments[2].charAt(0)==='/'&&arguments[2].indexOf(B)!==0){arguments[2]=B+arguments[2]}return _replaceState.apply(this,arguments)}}})()</script></body>";

        # Reescrever paths absolutos no JS para funcionar com base path
        sub_filter "'"'"'/login.html'"'"'" "'"'"'/zyntra-demo/login.html'"'"'";
    }'

# Now replace the block in the config file
# Use sed to delete old block and insert new one
# Create temp file
head -n $((BLOCK_START - 1)) "$CONF" > /tmp/nginx-new.conf
echo "$NEW_BLOCK" >> /tmp/nginx-new.conf
tail -n +$((END + 1)) "$CONF" >> /tmp/nginx-new.conf

# Validate new config
cp /tmp/nginx-new.conf "$CONF"

echo ""
echo "=== Testing Nginx config ==="
nginx -t 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Reloading Nginx ==="
    nginx -s reload
    echo "Nginx reloaded successfully!"
else
    echo ""
    echo "ERROR: Nginx config test failed! Restoring backup..."
    cp "$CONF.bak-logo-fix" "$CONF"
    echo "Backup restored."
    exit 1
fi

echo ""
echo "=== Verification ==="
echo "Logo files:"
ls -la /var/www/aluforce/public/images/zyntra-logo.png
ls -la /var/www/aluforce/public/images/zyntra-branco.png
ls -la /var/www/aluforce/public/images/favicon-zyntra.jpg

echo ""
echo "DONE! All fixes applied."
