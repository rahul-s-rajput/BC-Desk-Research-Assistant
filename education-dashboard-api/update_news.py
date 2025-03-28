import subprocess
import time
import schedule
import os

def update_news():
    print("Updating news data...")
    try:
        # Run the test_sonar.py script to fetch and save news data
        subprocess.run(["python", "test_sonar.py"], check=True)
        print("News data updated successfully")
    except Exception as e:
        print(f"Error updating news data: {e}")

# Run once immediately when started
update_news()

# Schedule to run every 12 hours
schedule.every(12).hours.do(update_news)

print("News update scheduler started. Will update every 12 hours.")

# Keep the script running
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute if there's a task to run 