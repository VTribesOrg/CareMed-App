import os
import re
import subprocess
from datetime import datetime
from flask import current_app


BACKUP_DIR = 'backups'
MAX_BACKUPS = 7


def get_db_credentials():
    db_url = os.environ.get('DATABASE_URL', '')
    match = re.match(r'mysql\+pymysql://(.+):(.+)@(.+):(\d+)/(.+)', db_url)
    if match:
        user, password, host, port, dbname = match.groups()
        return {'user': user, 'password': password, 'host': host, 'port': port, 'dbname': dbname}
    return None


def create_backup(triggered_by='system'):
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"caremed_backup_{triggered_by}_{timestamp}.sql"
        filepath = os.path.join(BACKUP_DIR, filename)

        creds = get_db_credentials()
        if not creds:
            return False, "Could not parse database credentials"

        result = subprocess.run(
            [
                'mysqldump',
                f"--user={creds['user']}",
                f"--password={creds['password']}",
                f"--host={creds['host']}",
                f"--port={creds['port']}",
                '--single-transaction',
                '--routines',
                '--triggers',
                creds['dbname']
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return False, f"mysqldump error: {result.stderr[:200]}"

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result.stdout)

        cleanup_old_backups()

        size_kb = round(os.path.getsize(filepath) / 1024, 2)
        print(f"[Backup] Created: {filename} ({size_kb} KB) by {triggered_by}")
        return True, filename

    except FileNotFoundError:
        return False, "mysqldump not found. Make sure MySQL is installed."
    except Exception as e:
        return False, str(e)


def cleanup_old_backups():
    try:
        if not os.path.exists(BACKUP_DIR):
            return
        backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.sql')])
        while len(backups) > MAX_BACKUPS:
            oldest = backups.pop(0)
            os.remove(os.path.join(BACKUP_DIR, oldest))
            print(f"[Backup] Deleted old backup: {oldest}")
    except Exception as e:
        print(f"[Backup] Cleanup error: {e}")


def get_all_backups():
    try:
        if not os.path.exists(BACKUP_DIR):
            return []
        backups = []
        for filename in sorted(os.listdir(BACKUP_DIR), reverse=True):
            if filename.endswith('.sql'):
                filepath = os.path.join(BACKUP_DIR, filename)
                size = os.path.getsize(filepath)
                created = datetime.fromtimestamp(os.path.getctime(filepath))
                triggered_by = 'admin' if '_admin_' in filename else 'system'
                backups.append({
                    'filename': filename,
                    'size_kb': round(size / 1024, 2),
                    'created_at': created,
                    'triggered_by': triggered_by
                })
        return backups
    except Exception as e:
        print(f"[Backup] List error: {e}")
        return []


def auto_backup():
    print(f"[Backup] Auto backup starting at {datetime.utcnow()}")
    success, result = create_backup(triggered_by='system')
    if success:
        print(f"[Backup] Auto backup successful: {result}")
    else:
        print(f"[Backup] Auto backup FAILED: {result}")