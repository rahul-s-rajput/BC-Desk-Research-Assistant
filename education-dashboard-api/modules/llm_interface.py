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
    def __init__(self, api_key: Optional[str] = None, model: str = "google/gemini-2.5-pro-exp-03-25:free"):
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
                    response_text = response.choices[0].message.content.strip()
                except (AttributeError, IndexError) as e:
                    logger.error(f"Error parsing response: {e}")
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