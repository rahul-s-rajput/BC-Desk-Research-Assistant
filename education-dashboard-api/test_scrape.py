import requests
from bs4 import BeautifulSoup
import os
import urllib.parse
import subprocess
import sys
import traceback

def get_pdf_links(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    pdf_links = [urllib.parse.urljoin(url, link['href']) for link in soup.find_all('a', href=True) if link['href'].lower().endswith('.pdf')]
    return pdf_links

def download_missing_pdfs(url, local_folder):
    pdf_links = get_pdf_links(url)
    existing_pdfs = set(f for f in os.listdir(local_folder) if f.lower().endswith('.pdf'))
    
    downloaded_count = 0
    for link in pdf_links:
        filename = os.path.basename(link)
        if filename not in existing_pdfs:
            print(f"Downloading {filename}")
            response = requests.get(link)
            with open(os.path.join(local_folder, filename), 'wb') as f:
                f.write(response.content)
            downloaded_count += 1
        else:
            print(f"{filename} already exists, skipping")
    
    return downloaded_count

def run_prototype_script():
    """
    Run the prototype.py script to process the downloaded PDFs
    """
    try:
        print("\n=== Starting PDF processing with prototype.py ===")
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build the path to prototype.py
        prototype_script_path = os.path.join(current_dir, 'prototype.py')
        
        # Use the current Python executable
        python_executable = sys.executable
        
        print(f"Prototype script path: {prototype_script_path}")
        print(f"Python executable: {python_executable}")
        
        # Run the prototype script
        result = subprocess.run(
            [python_executable, prototype_script_path],
            cwd=current_dir,
            capture_output=True,
            text=True,
            env=os.environ.copy()  # Pass the current environment
        )
        
        # Print output
        if result.stdout:
            print("=== Prototype Output ===")
            print(result.stdout)
        
        # Check for errors
        if result.stderr:
            print("=== Prototype Errors ===")
            print(result.stderr)
        
        if result.returncode != 0:
            print(f"Error: Prototype script failed with return code {result.returncode}")
            return False
        
        print("=== Prototype script completed successfully ===")
        return True
    
    except Exception as e:
        print(f"Error running prototype script: {str(e)}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        print("=== Starting PDF Download Process ===")
        urls = ["https://pair.ubc.ca/student-data-analytics/enrolment/annual-enrolment-reports/","https://www.sfu.ca/irp/enrolments/RegStatusReport.html"]
        local_folder = "./enrolment-reports"
        
        # Create the folder if it doesn't exist
        os.makedirs(local_folder, exist_ok=True)
        
        total_downloaded = 0
        for url in urls:
            print(f"Processing URL: {url}")
            downloaded = download_missing_pdfs(url, local_folder)
            total_downloaded += downloaded
        
        print(f"\n=== PDF Download Summary ===")
        print(f"Total new PDFs downloaded: {total_downloaded}")
        
        # If running from API, we should also run prototype.py
        if os.environ.get("RUNNING_FROM_API") == "true" or total_downloaded > 0:
            print("\nDownload complete. Running data processing...")
            success = run_prototype_script()
            
            if success:
                print("\nEntire process completed successfully.")
                print("Downloaded PDFs and processed data - please refresh the browser to see updates.")
            else:
                print("\nDownload succeeded but data processing failed.")
                print("Please check the logs for more information.")
        else:
            print("\nDownload complete. No new files to process.")
    
    except Exception as e:
        print(f"Error in PDF download process: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
