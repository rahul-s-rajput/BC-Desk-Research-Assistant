import logging
import os
import json
import openai
from typing import Optional

from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)

logger = logging.getLogger(__name__)

class QueryEnhancer:
    def __init__(self, api_key: Optional[str] = None, model: str = "openai/gpt-3.5-turbo"):
        """
        Initialize the query enhancer.
        
        Args:
            api_key: OpenRouter API key
            model: Model to use for query enhancement
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model
        
        # Configure OpenAI client
        openai.api_key = self.api_key
        openai.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        
    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(3))
    def enhance_query(self, query: str) -> str:
        """
        Enhance the user query to improve retrieval performance.
        
        Args:
            query: Original user query
            
        Returns:
            Enhanced query
        """
        try:
            if not query.strip():
                return query
                
            # System prompt to guide the query enhancement
            system_prompt = """
            You are a query enhancement assistant. Your job is to rewrite a user's question to:
            1. Make it more precise and specific
            2. Include key terms and synonyms that will improve document retrieval
            3. Expand abbreviations and acronyms if necessary
            4. Break down complex queries into clearer terms
            
            Only return the enhanced query without explanations or additional text.
            """
            
            # Create message for the API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Original query: {query}\n\nEnhanced query:"}
            ]
            
            # Call OpenRouter API
            response = openai.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=200,
                temperature=0.2
            )
            
            # Handle response based on type (could be object or string)
            if isinstance(response, str):
                # Parse the response if it's a string
                try:
                    response_json = json.loads(response)
                    if "choices" in response_json and len(response_json["choices"]) > 0:
                        if "message" in response_json["choices"][0]:
                            enhanced_query = response_json["choices"][0]["message"]["content"].strip()
                        else:
                            enhanced_query = response_json["choices"][0].get("text", "").strip()
                    else:
                        # If we can't find choices in the response
                        logger.warning(f"Unexpected API response format: {response}")
                        return query  # Return original query if format is unexpected
                except json.JSONDecodeError:
                    # If the string is not valid JSON, use it directly or return original
                    if len(response.strip()) > 0:
                        enhanced_query = response.strip()
                    else:
                        return query
            else:
                # If it's an object (standard OpenAI response), use it normally
                try:
                    enhanced_query = response.choices[0].message.content.strip()
                except (AttributeError, IndexError) as e:
                    logger.error(f"Error parsing response: {e}")
                    return query  # Return original query if there's an error
            
            logger.info(f"Enhanced query: '{query}' -> '{enhanced_query}'")
            return enhanced_query
            
        except Exception as e:
            logger.error(f"Error enhancing query: {e}")
            # Return original query if enhancement fails
            return query 