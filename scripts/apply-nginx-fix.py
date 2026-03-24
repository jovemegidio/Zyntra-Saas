#!/usr/bin/env python3
"""Replace the zyntra-demo location block in Nginx config."""
import re, shutil, subprocess, sys

CONF = "/etc/nginx/sites-enabled/aluforce"
NEW_BLOCK_FILE = "/tmp/zyntra-demo-nginx-block.conf"

# Backup to /tmp (NOT sites-enabled!)
shutil.copy2(CONF, "/tmp/aluforce-nginx-backup")
print("Backup saved to /tmp/aluforce-nginx-backup")

# Read files
with open(CONF, 'r') as f:
    content = f.read()
with open(NEW_BLOCK_FILE, 'r') as f:
    new_block = f.read()

# Find the zyntra-demo block
# Pattern: from "# ===...ZYNTRA DEMO..." comments to the matching closing brace of location
lines = content.split('\n')
start_idx = None
location_idx = None

for i, line in enumerate(lines):
    if 'ZYNTRA DEMO' in line and start_idx is None:
        # Go back to find the blank line or comment start before this
        start_idx = i
        # Check if previous line is blank or another comment
        if i > 0 and (lines[i-1].strip() == '' or lines[i-1].strip().startswith('#')):
            start_idx = i - 1
    if start_idx is not None and 'location ^~ /zyntra-demo/' in line:
        location_idx = i
        break

if start_idx is None or location_idx is None:
    print("ERROR: Could not find zyntra-demo block")
    sys.exit(1)

print(f"Found block: comment at line {start_idx+1}, location at line {location_idx+1}")

# Find matching closing brace
depth = 0
end_idx = None
for i in range(location_idx, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_idx = i
                break
    if end_idx is not None:
        break

if end_idx is None:
    print("ERROR: Could not find closing brace")
    sys.exit(1)

print(f"Block ends at line {end_idx+1}")

# Build new content
before = '\n'.join(lines[:start_idx])
after = '\n'.join(lines[end_idx+1:])
new_content = before + '\n' + new_block + '\n' + after

# Write
with open(CONF, 'w') as f:
    f.write(new_content)

print("Config updated!")

# Test nginx
result = subprocess.run(['nginx', '-t'], capture_output=True, text=True)
print(result.stderr)

if result.returncode == 0:
    subprocess.run(['nginx', '-s', 'reload'])
    print("Nginx reloaded successfully!")
else:
    print("FAILED! Restoring backup...")
    shutil.copy2("/tmp/aluforce-nginx-backup", CONF)
    sys.exit(1)
