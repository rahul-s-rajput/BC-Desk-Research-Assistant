from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import json
import time
# Test selector validity
def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36")
    driver = webdriver.Chrome(options=chrome_options)
    return driver
driver = setup_driver()
driver.get("https://www.educationplannerbc.ca/search")
time.sleep(3)
print(driver.page_source)    # Check if content contains program cards
soup = BeautifulSoup(driver.page_source, 'html.parser')
print(soup.select('div.program-card'))  # Should return elements
driver.quit()
