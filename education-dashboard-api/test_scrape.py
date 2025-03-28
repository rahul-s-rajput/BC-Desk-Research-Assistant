import requests
from bs4 import BeautifulSoup
import os
import urllib.parse

def get_pdf_links(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    pdf_links = [urllib.parse.urljoin(url, link['href']) for link in soup.find_all('a', href=True) if link['href'].lower().endswith('.pdf')]
    return pdf_links

def download_missing_pdfs(url, local_folder):
    pdf_links = get_pdf_links(url)
    existing_pdfs = set(f for f in os.listdir(local_folder) if f.lower().endswith('.pdf'))
    
    for link in pdf_links:
        filename = os.path.basename(link)
        if filename not in existing_pdfs:
            print(f"Downloading {filename}")
            response = requests.get(link)
            with open(os.path.join(local_folder, filename), 'wb') as f:
                f.write(response.content)
        else:
            print(f"{filename} already exists, skipping")

# Usage
urls = ["https://pair.ubc.ca/student-data-analytics/enrolment/annual-enrolment-reports/","https://www.sfu.ca/irp/enrolments/RegStatusReport.html"]
local_folder = "./enrolment-reports"
for url in urls:
    download_missing_pdfs(url, local_folder)
