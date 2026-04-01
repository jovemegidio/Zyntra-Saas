#!/usr/bin/env python3
"""
deploy-auto.py – Deploy files to VPS automatically (no interactive password prompt)

Usage:
    # Deploy specific files:
    python deploy-auto.py modules/Vendas/public/pedidos.html src/routes/auth.js

    # Deploy all files matching a pattern:
    python deploy-auto.py modules/Vendas/**

    # Just restart PM2 (no file upload):
    python deploy-auto.py --restart

    # Deploy a file list file (one path per line):
    python deploy-auto.py --list deploy-list.txt

Requirements:
    pip install paramiko
"""

import paramiko
import sys
import os
import time
import glob
import fnmatch
import argparse

# ── VPS credentials ────────────────────────────────────────────────────────────
VPS_HOST = 'YOUR_VPS_IP'
VPS_USER = 'root'
VPS_PASS = 'Aluforce@2026#Vps'
LOCAL_BASE = r'g:\Outros computadores\Meu laptop (2)\Zyntra'
REMOTE_BASE = '/var/www/aluforce'
# ───────────────────────────────────────────────────────────────────────────────


def connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {VPS_HOST}...')
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print('Connected.')
    return ssh


def run_cmd(ssh, cmd, wait=3):
    _, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err


def ensure_remote_dir(sftp, remote_path):
    """Create all parent directories on remote if they don't exist."""
    parts = remote_path.split('/')
    path = ''
    for part in parts:
        if not part:
            path = '/'
            continue
        path = path.rstrip('/') + '/' + part
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)


def upload_files(ssh, sftp, files):
    """Upload a list of local relative paths to VPS."""
    ok = []
    fail = []
    for rel in files:
        rel = rel.replace('\\', '/')
        rel = rel.lstrip('/')
        local = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
        remote = REMOTE_BASE + '/' + rel

        if not os.path.isfile(local):
            print(f'  [SKIP] {rel}  (not found locally)')
            fail.append(rel)
            continue

        remote_dir = '/'.join(remote.split('/')[:-1])
        try:
            ensure_remote_dir(sftp, remote_dir)
            sftp.put(local, remote)
            size = os.path.getsize(local)
            print(f'  [OK]   {rel}  ({size:,} bytes)')
            ok.append(rel)
        except Exception as e:
            print(f'  [FAIL] {rel}  -> {e}')
            fail.append(rel)
    return ok, fail


def restart_pm2(ssh):
    print('\nRestarting PM2...')
    out, err = run_cmd(ssh, 'pm2 restart all --update-env 2>&1')
    time.sleep(8)
    print('PM2 restart done.')

    # Show status
    out, _ = run_cmd(ssh, 'pm2 list --no-color 2>&1')
    print('\nPM2 status:')
    for line in out.split('\n'):
        low = line.lower()
        if any(k in low for k in ('aluforce', 'zyntra', 'online', 'errored', 'id', 'name')):
            print(' ', line)


def expand_globs(patterns):
    """Expand glob patterns relative to LOCAL_BASE."""
    files = []
    for pat in patterns:
        pat = pat.replace('\\', '/')
        full_pat = os.path.join(LOCAL_BASE, pat.replace('/', os.sep))
        matches = glob.glob(full_pat, recursive=True)
        if matches:
            for m in matches:
                if os.path.isfile(m):
                    rel = os.path.relpath(m, LOCAL_BASE).replace('\\', '/')
                    files.append(rel)
        else:
            # treat as literal path
            files.append(pat)
    return files


def main():
    parser = argparse.ArgumentParser(description='Deploy files to VPS')
    parser.add_argument('files', nargs='*', help='Files or glob patterns to deploy')
    parser.add_argument('--restart', action='store_true', help='Only restart PM2, no upload')
    parser.add_argument('--list', metavar='FILE', help='Text file with one path per line')
    parser.add_argument('--no-restart', action='store_true', help='Upload only, skip PM2 restart')
    args = parser.parse_args()

    # Collect file list
    to_deploy = []
    if args.list:
        list_file = args.list if os.path.isabs(args.list) else os.path.join(LOCAL_BASE, args.list)
        with open(list_file) as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith('#')]
        to_deploy = expand_globs(lines)
    elif args.files:
        to_deploy = expand_globs(args.files)

    ssh = connect()
    sftp = None

    try:
        if not args.restart and to_deploy:
            sftp = ssh.open_sftp()
            print(f'\nUploading {len(to_deploy)} file(s)...')
            ok, fail = upload_files(ssh, sftp, to_deploy)
            sftp.close()
            print(f'\nUpload summary: {len(ok)} ok, {len(fail)} failed')
            if fail:
                print('Failed:', fail)
        elif not args.restart:
            print('No files specified. Use --restart to only restart PM2.')
            ssh.close()
            return

        if not args.no_restart:
            restart_pm2(ssh)

    finally:
        if sftp:
            try:
                sftp.close()
            except Exception:
                pass
        ssh.close()
        print('\nDisconnected. Done.')


if __name__ == '__main__':
    main()
