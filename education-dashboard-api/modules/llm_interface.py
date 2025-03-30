import logging
import os
import json
import openai
from typing import List, Dict, Any, Optional
import re

from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)

logger = logging.getLogger(__name__)

class LLMInterface:
    def __init__(self, api_key: Optional[str] = None, model: str = "deepseek/deepseek-r1:free"):
        """
        Initialize the LLM interface.
        
        Args:
            api_key: OpenRouter API key
            model: Model to use for response generation
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model
        
        # Configure OpenAI client
        openai.api_key = self.api_key
        openai.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/")
        
    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(3))
    def generate_response(
        self, 
        query: str, 
        context_docs: List[Dict[str, Any]],
        max_tokens: int = 2048,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        metadata_files: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a response to the user query.
        
        Args:
            query: User query
            context_docs: Retrieved document chunks to use as context
            max_tokens: Maximum number of tokens in the response
            conversation_history: Optional history of previous conversation turns
            metadata_files: Optional list of JSON metadata files with structured information
            
        Returns:
            Dictionary with the generated response and metadata
        """
        try:
            # Process any JSON metadata files first
            metadata_content = []
            
            if metadata_files:
                for metadata_file in metadata_files:
                    file_name = metadata_file.get("filename", "unknown_metadata.json")
                    data = metadata_file.get("content", {})
                    
                    # Format the metadata for the LLM
                    metadata_entry = f"[METADATA FILE: {file_name}]\n"
                    
                    # Extract university name if available
                    university = data.get("university", {})
                    if university:
                        name = university.get("name", "")
                        if name:
                            metadata_entry += f"University: {name}\n"
                    
                    # Extract key financial data
                    financial_data = data.get("financial_data", [])
                    if financial_data:
                        metadata_entry += "Financial Data:\n"
                        for entry in financial_data:
                            year = entry.get("year", "")
                            revenue = entry.get("revenue", "")
                            expenses = entry.get("expenses", "")
                            if year:
                                metadata_entry += f"- Year: {year}\n"
                                if revenue:
                                    metadata_entry += f"  Revenue: {revenue}\n"
                                if expenses:
                                    metadata_entry += f"  Expenses: {expenses}\n"
                    
                    # Extract enrollment data
                    enrollment = data.get("enrollment", {})
                    if enrollment:
                        metadata_entry += "Enrollment Data:\n"
                        for year, count in enrollment.items():
                            metadata_entry += f"- Year {year}: {count} students\n"
                    
                    # Extract any other relevant fields
                    programs = data.get("programs", [])
                    if programs:
                        metadata_entry += "Programs:\n"
                        for program in programs:
                            metadata_entry += f"- {program}\n"
                    
                    # Include raw JSON as well, but nicely formatted
                    metadata_entry += "\nComplete Data (JSON format):\n"
                    metadata_entry += json.dumps(data, indent=2)
                    
                    metadata_content.append(metadata_entry)
            
            # Extract text from context documents
            context_texts = []
            used_context = []
            
            for doc in context_docs:
                text = doc.get("text", "")
                if text and len(text.strip()) > 0:
                    metadata = doc.get("metadata", {})
                    source = metadata.get("source", "unknown source")
                    
                    # Extract university name and year from metadata if available
                    university_name = metadata.get("university_name", "")
                    document_year = metadata.get("document_year", "")
                    
                    # Try to extract university name from filename if not in metadata
                    if not university_name:
                        filename_lower = source.lower()
                        if "ubc" in filename_lower:
                            university_name = "University of British Columbia"
                        elif "sfu" in filename_lower:
                            university_name = "Simon Fraser University"
                        elif "uvic" in filename_lower:
                            university_name = "University of Victoria"
                        elif "unbc" in filename_lower:
                            university_name = "University of Northern British Columbia"
                    
                    # Try to extract document year from filename if not in metadata
                    if not document_year:
                        # Look for patterns like "2021" or "21-22" or "2324"
                        year_patterns = [
                            r'20(\d{2})[-_]?20?(\d{2})',  # matches 2021-2022, 2021-22, 2021_2022
                            r'(\d{2})[-_]?(\d{2})',       # matches 21-22, 21_22
                            r'20(\d{2})',                 # matches 2021
                            r'fy(\d{2})',                 # matches fy21
                            r'fy20(\d{2})',               # matches fy2021
                        ]
                        
                        for pattern in year_patterns:
                            match = re.search(pattern, source)
                            if match:
                                # Format depends on which pattern matched
                                if len(match.groups()) == 2:
                                    # For academic year patterns
                                    if len(match.group(1)) == 2 and len(match.group(2)) == 2:
                                        document_year = f"20{match.group(1)}-20{match.group(2)}"
                                    else:
                                        document_year = f"{match.group(1)}-{match.group(2)}"
                                else:
                                    # For single year patterns
                                    document_year = match.group(0)
                                    if document_year.startswith("fy"):
                                        document_year = document_year[2:]
                                        if len(document_year) == 2:
                                            document_year = f"20{document_year}"
                                break
                    
                    if "page_range" in metadata:
                        source_info = f"{source} (Pages {metadata['page_range']})"
                    else:
                        source_info = source
                    
                    # Format source line to include university and year if available
                    source_line = f"[Document: {source_info}"
                    if university_name:
                        source_line += f", University: {university_name}"
                    if document_year:
                        source_line += f", Year: {document_year}"
                    source_line += "]"
                        
                    context_entry = f"{source_line}:\n{text.strip()}"
                    context_texts.append(context_entry)
                    used_context.append(doc)
            
            # Combine context texts
            combined_context = "\n\n".join(context_texts)
            
            # Add metadata content to the context if available
            if metadata_content:
                metadata_section = "\n\n".join(metadata_content)
                combined_context = f"### STRUCTURED METADATA FILES ###\n\n{metadata_section}\n\n### DOCUMENT CONTENT ###\n\n{combined_context}"
            
            # Construct system prompt
            system_prompt = """
            You are a helpful education dashboard assistant. Your goal is to provide accurate and relevant information from the education reports.
            
            1. Use ONLY the context provided to answer the question.
            2. If the context doesn't contain the answer, say you don't have enough information and suggest what might help.
            3. Cite sources for your information when possible.
            4. Be concise and clear in your responses.
            5. Format numbers, statistics and data clearly.
            6. If data in the context appears to be from different reports or time periods, clearly differentiate them.
            7. For comparative questions (like "which is highest/lowest"), analyze all relevant data across different documents, extract the specific values being compared, and make direct numerical comparisons to determine the answer.
            8. When comparing financial data across universities, clearly state the values you're comparing and your reasoning.
            """
            
            # Create messages for the API
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add user query with context
            user_message = f"""
            Question: {query}
            
            # Research Protocol
            You are a research assistant analyzing education data. Follow this protocol for ALL queries:
            
            1. ANALYSIS PHASE:
               - Identify the query type (comparison, trend, factual, etc.)
               - Identify entities involved (specific universities, departments, etc.)
               - Identify relevant time periods or years
               - Determine what specific metrics or data points you need to extract
            
            2. DATA EXTRACTION PHASE:
               - FIRST check the STRUCTURED METADATA FILES section for relevant data - this contains pre-processed, structured information
               - For financial and enrollment figures, prioritize data from metadata when available
               - Then extract additional information from the document content section
               - Pay special attention to:
                  * Exact financial figures with their proper units
                  * The specific year/period each figure represents
                  * The exact source document and page number
               - Create a structured dataset with all extracted information
            
            3. SYNTHESIS PHASE:
               - For comparisons: Only compare data from the same time periods
               - For trends: Organize data chronologically and calculate changes
               - For factual questions: Verify information across multiple sources when available
               - When data is missing or inconsistent, explicitly acknowledge limitations
               - When metadata and document content differ, note the discrepancy and use the most reliable source
            
            4. RESPONSE FORMULATION:
               - Begin with a clear, direct answer to the question
               - Support with specific data points and values
               - For each figure cited, include the source
               - Use proper formatting for financial data
               - If the complete answer cannot be determined from the context, clearly state what information is missing
            
            You MUST cite sources for all information. You may ONLY use information from the provided context.
            
            Use the following context to answer the question:
            {combined_context}
            """
            
            messages.append({"role": "user", "content": user_message})
            
            # Call OpenRouter API
            response = openai.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.3
            )
            
            # Handle response based on type (could be object or string)
            if isinstance(response, str):
                # Parse the response if it's a string
                try:
                    response_json = json.loads(response)
                    if "choices" in response_json and len(response_json["choices"]) > 0:
                        if "message" in response_json["choices"][0]:
                            response_text = response_json["choices"][0]["message"]["content"].strip()
                        else:
                            response_text = response_json["choices"][0].get("text", "").strip()
                    else:
                        # If we can't find choices in the response
                        logger.warning(f"Unexpected API response format: {response}")
                        response_text = "I apologize, but I couldn't generate a proper response at this time."
                except json.JSONDecodeError:
                    # If the string is not valid JSON, use it directly
                    response_text = response.strip()
            else:
                # If it's an object (standard OpenAI response), use it normally
                try:
                    # Check if response or its attributes are None before accessing them
                    if response is None:
                        logger.error("API returned None response")
                        response_text = "I apologize, but there was an error communicating with the language model."
                    elif not hasattr(response, 'choices') or not response.choices:
                        logger.error(f"API response missing choices: {response}")
                        response_text = "I apologize, but the language model returned an unexpected response format."
                    elif not hasattr(response.choices[0], 'message') or response.choices[0].message is None:
                        logger.error(f"API response missing message in first choice: {response.choices}")
                        response_text = "I apologize, but the language model returned an incomplete response."
                    else:
                        response_text = response.choices[0].message.content.strip()
                except (AttributeError, IndexError, TypeError) as e:
                    logger.error(f"Error parsing response: {e}, Response: {response}")
                    response_text = "I apologize, but there was an error parsing the response."
            
            # Return response with metadata
            return {
                "response": response_text,
                "used_context": used_context,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "response": f"I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
                "used_context": [],
                "success": False
            }

class VerificationLLMInterface:
    def __init__(self, api_key: Optional[str] = None, model: str = "anthropic/claude-3.7-sonnet:thinking:online"):
        """
        Initialize the Verification LLM interface with online search capabilities.
        
        Args:
            api_key: OpenRouter API key
            model: Model to use for verification and enhancement (should be an online model with web search)
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model
        
        # Ensure we're using a model with online search capabilities
        if ":online" not in self.model:
            logger.warning(f"Model {self.model} may not have online search capabilities. Recommend using a model with ':online' suffix.")
        
        # Configure OpenAI client
        openai.api_key = self.api_key
        openai.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/")
    
    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(3))
    def verify_enhance_response(
        self,
        original_query: str,
        llm_response: str,
        max_tokens: int = 2048,
        web_search: bool = True
    ) -> Dict[str, Any]:
        """
        Verify and enhance a response from the primary LLM using online search capabilities.
        
        Args:
            original_query: The original user query
            llm_response: Response from the primary LLM
            max_tokens: Maximum tokens for the enhanced response
            web_search: Whether to leverage online search capabilities
            
        Returns:
            Dictionary with the verified/enhanced response and metadata
        """
        try:
            # List of approved sources for web search
            approved_sources = [
                "gov.bc.ca",
                "workbc.ca",
                "choosebc.ca",
                "postsecondarybc.ca",
                "bcit.ca",
                "sfu.ca",
                "ufv.ca",
                "columbiacollege.ca",
                "uvic.ca",
                "tru.ca",
                "ubc.ca",
                "unbc.ca",
                "capilanou.ca",
                "educationplannerbc.ca",
                "bctransferguide.ca",
                "skilledtradesbc.ca",
                "privatetraininginstitutions.gov.bc.ca",
                "ubcpress.ca",
                "stlhe.ca",
                "policyalternatives.ca",
                "bccat.ca",
                "bcstudentoutcomes.ca",
                "bcheadset.ca",
                "bcaiu.com",
                "bccie.bc.ca",
                "caut.ca",
                "bccampus.ca",
                "bcscholarships.ca",
                "univcan.ca",
                "macleans.ca",
                "timeshighereducation.com",
                "topuniversities.com",
                "theglobeandmail.com",
                "insidehighered.com",
                "chronicle.com",
                "universityaffairs.ca",
                "academica.ca",
                "higheredstrategy.com",
                "cbc.ca",
                "theprovince.com",
                "vancouversun.com"
            ]
            
            approved_sources_str = ", ".join(approved_sources)
            
            # Construct system prompt
            system_prompt = f"""
            You are an expert educational research assistant with online search capabilities. Your task is to refine and enhance educational reports.
            
            1. INCORPORATE all valuable numerical data and information from the provided background research.
            2. ENHANCE the quality and presentation by reformatting as a professional research report.
            3. SUPPLEMENT with additional information from web sources when helpful.
            4. PRESENT all information as a cohesive, standalone report without referencing sources as "initial" or "original."
            5. USE precise formatting with proper Markdown syntax, headings, and structure.
            6. MAINTAIN all specific numerical data from the education sector unless you find direct contradicting evidence.
            7. FOCUS exclusively on the specific universities and institutions already mentioned.
            
            IMPORTANT RESTRICTION: You must ONLY use information from the following approved sources: {approved_sources_str}
            Do NOT use or reference information from other websites or sources not in this list.
            
            Your output should be academically rigorous, well-structured in Markdown format, and present as a seamless, authoritative research report.
            IMPORTANT: Never refer to "verifying," "checking," or "original" information. Present as a unified, authoritative document.
            """
            
            # Create messages for the API
            user_message = f"""
            # Query/Topic
            {original_query}
            
            # Draft Research Material
            {llm_response}
            
            Polish and refine this educational research material into a professional report. Follow these guidelines:
            
            1. INCORPORATE all key information and numerical data from the draft material
            2. USE web search to validate and enhance with additional relevant details where needed
            3. ELEVATE the presentation into a professional research report without mentioning it's a refinement
            4. STRUCTURE with a clear main heading, logical subheadings, and proper formatting
            5. EMPHASIZE important statistics and numerical data using bold text
            6. USE bullet points for lists of strategies or findings
            7. MAINTAIN all specific numerical values unless you find clear contradicting evidence
            8. FOCUS only on the specific universities already mentioned
            9. AVOID phrases like "according to," "as mentioned," "initial analysis," or similar references
            
            IMPORTANT RESTRICTION: You must ONLY use information from these approved sources:
            {approved_sources_str}
            
            If you cannot find information from these approved sources, simply use the information provided in the draft material.
            DO NOT cite or use information from ANY sources not in the approved list above.
            
            Your report should read as a cohesive, authoritative document that seamlessly incorporates all valuable information from the draft material with your enhancements.
            
            IMPORTANT: Include a section at the end titled "## Web Sources" that lists all websites you referenced in your research.
            """
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Call OpenRouter API with online-enabled model
            logger.info(f"Calling OpenRouter API with model: {self.model}")
            response = openai.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.2
            )
            
            # Log response type and structure
            logger.info(f"Received response type: {type(response)}")
            if response is not None and not isinstance(response, str):
                logger.info(f"Response attributes: {dir(response) if hasattr(response, '__dir__') else 'No dir available'}")
            
            # Extract response text
            response_text = ""
            if response is None:
                logger.warning("Received None response from API")
                response_text = llm_response  # Fall back to original response
            elif isinstance(response, str):
                try:
                    response_json = json.loads(response)
                    if response_json and "choices" in response_json and len(response_json["choices"]) > 0:
                        if "message" in response_json["choices"][0]:
                            response_text = response_json["choices"][0]["message"].get("content", "").strip()
                        else:
                            response_text = response_json["choices"][0].get("text", "").strip()
                    else:
                        logger.warning(f"Unexpected API response format (string): {response[:200]}...")
                        response_text = llm_response  # Fall back to original response
                except (json.JSONDecodeError, KeyError, IndexError) as e:
                    logger.warning(f"Error parsing response string: {e}")
                    response_text = response.strip()
            # Special handling for the OpenAI ChatCompletion type
            elif str(type(response)) == "<class 'openai.types.chat.chat_completion.ChatCompletion'>":
                logger.info("Handling ChatCompletion response")
                try:
                    # Direct attempt to access completion text - capture the exception if any
                    logger.info("Full response object inspection:")
                    logger.info(f"Response repr: {repr(response)[:1000]}")
                    
                    # Log all top-level attributes and their values
                    for attr_name in dir(response):
                        if not attr_name.startswith('_') and not callable(getattr(response, attr_name)):
                            try:
                                attr_value = getattr(response, attr_name)
                                logger.info(f"Attribute '{attr_name}': {repr(attr_value)[:200]}")
                            except Exception as e:
                                logger.info(f"Error accessing attribute '{attr_name}': {e}")
                    
                    # Try all possible ways to get the content
                    if hasattr(response, 'text'):
                        response_text = response.text
                        logger.info("Found response.text")
                    elif hasattr(response, 'content'):
                        response_text = response.content
                        logger.info("Found response.content")
                    elif hasattr(response, 'completion'):
                        response_text = response.completion
                        logger.info("Found response.completion")
                    elif hasattr(response, 'message'):
                        if hasattr(response.message, 'content'):
                            response_text = response.message.content
                            logger.info("Found response.message.content")
                    elif hasattr(response, 'choices') and response.choices:
                        if hasattr(response.choices[0], 'message') and hasattr(response.choices[0].message, 'content'):
                            response_text = response.choices[0].message.content
                            logger.info("Found via standard OpenAI path")
                    
                    # Try alternate methods based on what's available
                    if not response_text and hasattr(response, 'model_dump'):
                        try:
                            dump = response.model_dump()
                            logger.info(f"Model dump: {json.dumps(dump, default=str)[:1000]}")
                            
                            # Try to find content in dump
                            if isinstance(dump, dict):
                                # Check directly for a common key
                                content_keys = ['content', 'text', 'completion', 'answer', 'response']
                                for key in content_keys:
                                    if key in dump and isinstance(dump[key], str):
                                        response_text = dump[key]
                                        logger.info(f"Found content in dump with key: {key}")
                                        break
                                
                                # Check nested structures
                                if not response_text:
                                    # Handle a potential response inside the choices array
                                    if 'choices' in dump and dump['choices']:
                                        if isinstance(dump['choices'][0], dict):
                                            choice = dump['choices'][0]
                                            # Look for message.content
                                            if 'message' in choice and isinstance(choice['message'], dict):
                                                if 'content' in choice['message']:
                                                    response_text = choice['message']['content']
                                                    logger.info("Found content in dump via choices[0].message.content")
                                            # Look for text directly in choice
                                            elif 'text' in choice:
                                                response_text = choice['text']
                                                logger.info("Found content in dump via choices[0].text")
                                    
                                    # Try searching for any key ending with 'content' or containing 'text'
                                    if not response_text:
                                        for key, value in dump.items():
                                            if isinstance(value, str) and (key.endswith('content') or 'text' in key.lower()):
                                                response_text = value
                                                logger.info(f"Found content in dump with key: {key}")
                                                break
                        except Exception as e:
                            logger.warning(f"Error processing model_dump: {e}")
                    
                    # If still no text, try to serialize and inspect JSON
                    if not response_text and hasattr(response, 'model_dump_json'):
                        try:
                            json_str = response.model_dump_json()
                            logger.info(f"JSON representation: {json_str[:1000]}")
                            
                            # Look for content pattern in the JSON string
                            import re
                            content_matches = re.findall(r'"content"\s*:\s*"([^"]+)"', json_str)
                            if content_matches:
                                response_text = content_matches[0]
                                logger.info("Found content via regex in JSON string")
                            else:
                                text_matches = re.findall(r'"text"\s*:\s*"([^"]+)"', json_str)
                                if text_matches:
                                    response_text = text_matches[0]
                                    logger.info("Found text via regex in JSON string")
                        except Exception as e:
                            logger.warning(f"Error extracting from JSON: {e}")
                    
                    # If still no success, fall back to original response
                    if not response_text:
                        logger.warning("Could not extract text from ChatCompletion via any method")
                        response_text = llm_response
                except Exception as e:
                    logger.warning(f"Error extracting text from ChatCompletion: {e}")
                    response_text = llm_response
            else:
                try:
                    # Check for common response patterns
                    if hasattr(response, 'choices') and response.choices and len(response.choices) > 0:
                        if hasattr(response.choices[0], 'message') and response.choices[0].message:
                            response_text = response.choices[0].message.content.strip()
                        else:
                            logger.warning("Response choices[0] has no 'message' attribute")
                            response_text = llm_response  # Fall back to original response
                    # Alternative OpenRouter response format
                    elif hasattr(response, 'response') and response.response:
                        logger.info("Using alternative response format: response.response")
                        response_text = response.response.strip()
                    # Raw text response
                    elif hasattr(response, 'content') or hasattr(response, 'text'):
                        logger.info("Using raw text response format")
                        response_text = getattr(response, 'content', getattr(response, 'text', '')).strip()
                    # JSON convertible response object
                    elif hasattr(response, '__dict__') or hasattr(response, 'json'):
                        logger.info("Attempting to convert response object to dictionary")
                        try:
                            resp_dict = None
                            if hasattr(response, 'json') and callable(getattr(response, 'json')):
                                resp_dict = response.json()
                            elif hasattr(response, 'model_dump') and callable(getattr(response, 'model_dump')):
                                resp_dict = response.model_dump()
                            elif hasattr(response, '__dict__'):
                                resp_dict = response.__dict__
                            
                            if resp_dict is not None and isinstance(resp_dict, dict):
                                # Log the dictionary structure
                                logger.info(f"Response dictionary keys: {list(resp_dict.keys())}")
                                
                                # Try to find content in common patterns
                                if 'choices' in resp_dict and resp_dict['choices']:
                                    if isinstance(resp_dict['choices'][0], dict):
                                        if 'message' in resp_dict['choices'][0] and 'content' in resp_dict['choices'][0]['message']:
                                            response_text = resp_dict['choices'][0]['message']['content']
                                        elif 'text' in resp_dict['choices'][0]:
                                            response_text = resp_dict['choices'][0]['text']
                                elif 'message' in resp_dict and 'content' in resp_dict['message']:
                                    response_text = resp_dict['message']['content']
                                elif 'content' in resp_dict:
                                    response_text = resp_dict['content']
                                elif 'text' in resp_dict:
                                    response_text = resp_dict['text']
                            else:
                                logger.warning("Could not convert response to dictionary")
                        except Exception as e:
                            logger.warning(f"Error extracting text from response object dict: {e}")
                    else:
                        logger.warning(f"Response has unexpected format and no recognizable attributes: {type(response)}")
                        response_text = llm_response  # Fall back to original response
                except Exception as e:
                    logger.warning(f"Error extracting text from response object: {e}")
                    response_text = llm_response  # Fall back to original response
            
            # If we couldn't get a proper response, use the original
            if not response_text:
                logger.warning("Empty response from API, falling back to original response")
                response_text = llm_response
            
            # Extract web sources from the response
            sources = []
            web_sources_section = response_text.split("## Web Sources")
            if len(web_sources_section) > 1:
                sources_text = web_sources_section[1].strip()
                # Parse URL-like strings from the sources text
                import re
                urls = re.findall(r'https?://[^\s()<>"]+', sources_text)
                for url in urls:
                    sources.append({
                        "title": "Web Source",
                        "url": url
                    })
            
            # Add after extracting response_text
            logger.info(f"Raw LLM response: {response_text[:1000]}...")  # Log first 1000 chars
            
            return {
                "verified_response": response_text,
                "original_response": llm_response,
                "web_sources": sources,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error verifying/enhancing response: {e}")
            return {
                "verified_response": llm_response,  # Return original response on error
                "original_response": llm_response,
                "web_sources": [],
                "success": False,
                "error": str(e)
            }

def generate_verified_response(
    query: str,
    context_docs: List[Dict[str, Any]],
    primary_model: str = "deepseek/deepseek-r1:free",
    verification_model: str = "anthropic/claude-3.7-sonnet:thinking:online",
    api_key: Optional[str] = None,
    max_tokens: int = 2048,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    metadata_files: Optional[List[Dict[str, Any]]] = None,
    web_verification: bool = True
) -> Dict[str, Any]:
    """
    Generate a response using the primary LLM and then verify and enhance it with a verification LLM.
    
    Args:
        query: User query
        context_docs: Retrieved document chunks to use as context
        primary_model: Model to use for initial response generation
        verification_model: Model to use for verification and enhancement
        api_key: OpenRouter API key
        max_tokens: Maximum number of tokens in the response
        conversation_history: Optional history of previous conversation turns
        metadata_files: Optional list of JSON metadata files with structured information
        web_verification: Whether to perform web verification
        
    Returns:
        Dictionary with the verified response and metadata
    """
    try:
        # Initialize the primary LLM interface
        primary_llm = LLMInterface(api_key=api_key, model=primary_model)
        
        # Generate initial response
        primary_response = primary_llm.generate_response(
            query=query,
            context_docs=context_docs,
            max_tokens=max_tokens,
            conversation_history=conversation_history,
            metadata_files=metadata_files
        )
        
        # Check if the primary response was successful
        if not primary_response.get("success", False):
            return primary_response
        
        # Initialize the verification LLM interface
        verification_llm = VerificationLLMInterface(api_key=api_key, model=verification_model)
        
        # Verify and enhance the response
        verified_response = verification_llm.verify_enhance_response(
            original_query=query,
            llm_response=primary_response["response"],
            max_tokens=max_tokens,
            web_search=web_verification
        )
        
        # Combine metadata from both responses
        result = {
            "primary_response": primary_response["response"],
            "verified_response": verified_response["verified_response"],
            "used_context": primary_response.get("used_context", []),
            "web_sources": verified_response.get("web_sources", []),
            "success": verified_response.get("success", False)
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error in verified response generation pipeline: {e}")
        return {
            "primary_response": "Error in primary response generation.",
            "verified_response": f"I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists. Error: {str(e)}",
            "used_context": [],
            "web_sources": [],
            "success": False
        } 