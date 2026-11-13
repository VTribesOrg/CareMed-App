import time
from datetime import datetime
from utils.backup import create_backup

def run_scheduler():
    print("[Backup Service] Long-term automated backup sidecar started.")
    while True:
        now = datetime.utcnow()
        # Trigger every day at 12:00 AM UTC (or adjust hours/minutes as needed)
        if now.hour == 0 and now.minute == 0:
            print(f"[Backup Service] Triggering scheduled backup at {now}")
            success, result = create_backup(triggered_by='system')
            if success:
                print(f"[Backup Service] Success: {result}")
            else:
                print(f"[Backup Service] Failed: {result}")
            # Sleep for over an hour to prevent multiple triggers in the same window
            time.sleep(3660)
        else:
            # Check every 60 seconds
            time.sleep(60)

if __name__ == '__main__':
    run_scheduler()