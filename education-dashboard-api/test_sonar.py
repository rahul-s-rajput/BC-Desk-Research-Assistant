from openai import OpenAI
from dotenv import load_dotenv  
import os
import json
import sys

print("Starting test_sonar.py script")

# Load environment variables from .env file
load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    print("No API key found, using existing news data")
    sys.exit(0)

# Load existing news data if available
existing_news = {"news": []}
if os.path.exists('news_results.json'):
    try:
        with open('news_results.json', 'r') as f:
            existing_news = json.load(f)
        print(f"Loaded existing news with {len(existing_news.get('news', []))} articles")
    except:
        print("Could not read existing news file, starting fresh")
        existing_news = {"news": []}

# Default sources if no file exists
default_sources = [
    "postsecondarybc.ca",
    "news.gov.bc.ca",
    "cufa.bc.ca",
    "bccampus.ca",
    "wearebcstudents.ca",
    "bccolleges.ca",
    "bcstudents.ca",
    "vanderhooflibrary.com/information-by-subject/students-post-secondary-planning"
]

# Load custom sources if available
sources = default_sources
if os.path.exists('news_sources.json'):
    try:
        with open('news_sources.json', 'r') as f:
            sources_data = json.load(f)
            sources = sources_data.get('sources', default_sources)
        print(f"Loaded custom sources: {len(sources)} sources found")
    except:
        print("Could not read sources file, using default sources")

try:
    print(f"Initializing OpenAI client with API key: {api_key[:5]}...{api_key[-5:] if len(api_key) > 10 else ''}")
    client = OpenAI(
      base_url="https://openrouter.ai/api/v1",
      api_key=api_key,
    )

    enhanced_prompt = f"""
    Search comprehensively across these BC post-secondary sources: {', '.join(sources)}.
    Find the 7 most recent news articles (from past 2 weeks) and return as JSON with:
    - title
    - date (YYYY-MM-DD)
    - summary (75 words)
    - url
    Prioritize articles with exact dates in their content. If dates are ambiguous, use webpage metadata.
    Ensure no duplicate entries. Structure:
    {{
      "news": [
        {{"title": "...", "date": "...", "summary": "...", "url": "..."}},
        ...
      ]
    }}
    """

    print("Making API request to fetch news...")
    try:
        completion = client.chat.completions.create(
            model="google/gemini-2.5-pro-exp-03-25:free:online",
            messages=[{"role": "user", "content": enhanced_prompt}],
            max_tokens=10000,
            extra_body={
                "web_search": {
                    "result_limit": 10  # Increased from default 5
                }
            }
        )
        
        print("API request completed successfully")
        
        # Check if the response is valid
        if not completion or not hasattr(completion, 'choices') or not completion.choices:
            print("Invalid response from API, keeping existing news data")
        else:    
            news_content = completion.choices[0].message.content
            
            # Extract JSON from the response
            start_idx = news_content.find('{')
            end_idx = news_content.rfind('}') + 1
            
            if start_idx == -1 or end_idx <= 0:
                print("Could not find JSON in the response, keeping existing news data")
            else:    
                json_str = news_content[start_idx:end_idx]
                
                try:
                    new_news_data = json.loads(json_str)
                    
                    # Create a set of existing titles to avoid duplicates
                    existing_titles = {item['title'] for item in existing_news.get('news', [])}
                    
                    # Add new news items if they don't already exist
                    new_items_added = 0
                    for item in new_news_data.get('news', []):
                        if item['title'] not in existing_titles:
                            existing_news['news'].append(item)
                            existing_titles.add(item['title'])
                            new_items_added += 1
                    
                    print(f"Added {new_items_added} new news items")
                    
                    # Sort by date, most recent first
                    existing_news['news'] = sorted(
                        existing_news['news'], 
                        key=lambda x: x.get('date', '1900-01-01'), 
                        reverse=True
                    )
                    
                except json.JSONDecodeError:
                    print("Could not parse JSON response, keeping existing news data")
    
    except Exception as api_error:
        print(f"API request failed, keeping existing news data: {str(api_error)}")
    
except Exception as e:
    print(f"Error initializing client, keeping existing news data: {str(e)}")

# Save the news data (either updated or unchanged)
try:
    with open('news_results.json', 'w') as f:
        json.dump(existing_news, f, indent=2)
    print(f"News data saved to news_results.json with {len(existing_news.get('news', []))} articles")
    
    # Print the first article for verification
    if existing_news.get('news') and len(existing_news['news']) > 0:
        print(f"Most recent article: {existing_news['news'][0]['title']}")
except Exception as save_error:
    print(f"Could not save news file: {str(save_error)}")

print("Script completed")
sys.exit(0)
