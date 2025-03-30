import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import json
import time
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class NewsItem(BaseModel):
    date: str
    source: str
    summary: str

def scrape_bc_education_news() -> List[dict]:
    news_sources = [
        "https://www.postsecondarybc.ca/news/",
        "https://news.gov.bc.ca/sectors/post-secondary-education",
        "https://bccat.ca/about/news"
    ]
    
    all_news = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    for source_url in news_sources:
        try:
            response = requests.get(source_url, headers=headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Different parsing logic might be needed for different sources
            if "postsecondarybc" in source_url:
                news_items = soup.find_all('article') or soup.find_all('div', class_='news-item')
                for item in news_items[:5]:  # Get only the latest 5 items
                    title = item.find('h2').text.strip() if item.find('h2') else ""
                    date_str = item.find('time').text.strip() if item.find('time') else ""
                    all_news.append({
                        "title": title,
                        "date": date_str,
                        "url": source_url,
                        "source": "Post Secondary BC"
                    })
            # Add similar parsing logic for other sources
            
        except Exception as e:
            print(f"Error scraping {source_url}: {str(e)}")
            continue
    
    return all_news

def summarize_news(news_items: List[dict], max_retries: int = 3) -> List[NewsItem]:
    # Get API key from environment
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY not found in environment variables")
        return []
        
    llm = ChatOpenAI(
        model="deepseek/deepseek-chat-v3-0324:free",
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.1
    )
    
    summarized_news = []
    
    for news in news_items:
        system_message = "You are a news summarization specialist focusing on BC post-secondary education news."
        human_message = f"""
        Create a 50-word summary for this news item:
        Title: {news['title']}
        Source: {news['source']}
        URL: {news['url']}

        Return the result in this JSON format:
        {{
            "date": "{news['date']}",
            "source": "{news['source']}",
            "summary": "your 50-word summary here"
        }}
        """
        
        for attempt in range(max_retries):
            try:
                
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": human_message}
                ]

                response = llm.invoke(messages)
            
                # Clean and parse response
                raw_json = response.content
                cleaned = raw_json.replace('```json', '').replace('```', '').strip()
                print(cleaned)
                data = json.loads(cleaned)
                print(data)
                result = json.loads(response.choices[0].message.content)
                summarized_news.append(NewsItem(**result))
                break
                
            except Exception as e:
                print(f"Attempt {attempt+1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    continue
                time.sleep(2 ** attempt)
    
    return summarized_news

def get_latest_news():
    # Scrape news from various sources
    raw_news = scrape_bc_education_news()
    
    # Summarize the news
    summarized_news = summarize_news(raw_news)
    
    return summarized_news

# Usage
if __name__ == "__main__":
    news_items = get_latest_news()
    for item in news_items:
        print(f"Date: {item.date}")
        print(f"Source: {item.source}")
        print(f"Summary: {item.summary}")
        print("-" * 50)
