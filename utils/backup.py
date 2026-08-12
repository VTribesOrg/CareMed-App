import os
import subprocess
import shutil
import platform
from datetime import datetime
from urllib.parse import urlparse

BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backups')
MAX_BACKUPS = 7

if platform.system() == "Windows":
    DEFAULT_MYSQLDUMP = r"C:\xampp\mysql\bin\mysqldump.exe"
else:
    DEFAULT_MYSQLDUMP = shutil.which("mysqldump") or "/usr/bin/mysqldump"

MYSQLDUMP_PATH = os.environ.get(
    "MYSQLDUMP_PATH",
    DEFAULT_MYSQLDUMP
)

def get_db_credentials():
    """
    Supports:
    mysql://root:@localhost:3307/caremedv2
    mysql+pymysql://root:password@localhost:3306/caremed
    """
    db_url = os.environ.get('DATABASE_URL', '').strip()

    if not db_url:
        return None

    db_url = db_url.replace("mysql+pymysql://", "mysql://")

    try:
        parsed = urlparse(db_url)

        if not parsed.username or not parsed.hostname or not parsed.path:
            return None

        return {
            'user': parsed.username,
            'password': parsed.password or '',
            'host': parsed.hostname,
            'port': parsed.port or 3306,
            'dbname': parsed.path.lstrip('/')
        }

    except Exception as e:
        print(f"[Backup] DB Parse Error: {e}")
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

        if not os.path.exists(MYSQLDUMP_PATH):
            return False, f"mysqldump not found at: {MYSQLDUMP_PATH}"

        env = os.environ.copy()
        env['MYSQL_PWD'] = creds['password']

        command = [
            MYSQLDUMP_PATH,
            f"--user={creds['user']}",
            f"--host={creds['host']}",
            f"--port={str(creds['port'])}",
            '--single-transaction',
            '--routines',
            '--triggers',
            '--default-character-set=utf8mb4',
            creds['dbname']
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300,
            env=env
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip()[:500]
            return False, f"mysqldump error: {error_msg}"

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result.stdout)

        if os.path.getsize(filepath) == 0:
            os.remove(filepath)
            return False, "Backup file was empty"

        cleanup_old_backups()

        size_kb = round(os.path.getsize(filepath) / 1024, 2)
        print(f"[Backup] Created: {filename} ({size_kb} KB) by {triggered_by}")
        return True, filename

    except subprocess.TimeoutExpired:
        return False, "Backup timed out after 5 minutes"

    except FileNotFoundError:
        return False, f"mysqldump executable not found: {MYSQLDUMP_PATH}"

    except PermissionError:
        return False, "Permission denied while creating backup"

    except Exception as e:
        return False, f"Unexpected backup error: {str(e)}"


def cleanup_old_backups():
    try:
        if not os.path.exists(BACKUP_DIR):
            return

        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.endswith('.sql')],
            key=lambda x: os.path.getctime(os.path.join(BACKUP_DIR, x))
        )

        while len(backups) > MAX_BACKUPS:
            oldest = backups.pop(0)
            old_path = os.path.join(BACKUP_DIR, oldest)
            if os.path.exists(old_path):
                os.remove(old_path)
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

                if not os.path.isfile(filepath):
                    continue

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
        # Alert admin by email
        try:
            from flask import current_app
            from extensions import mail
            from flask_mail import Message

            admin_email = current_app.config.get('MAIL_USERNAME')
            if admin_email:
                msg = Message(
                    subject="[CareMed] Auto Backup FAILED",
                    sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
                    recipients=[admin_email]
                )
                msg.body = f"""
CareMed Auto Backup Failed
==========================
Time  : {datetime.utcnow().strftime('%B %d, %Y %I:%M %p')} UTC
Reason: {result}

Please check your server and create a manual backup immediately.
                """
                mail.send(msg)
        except Exception as mail_err:
            print(f"[Backup] Failed to send backup alert: {mail_err}")