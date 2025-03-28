from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Optional
import os
import json
import time
from dotenv import load_dotenv
import pdfplumber
# Import our custom adapter
from modules.rag_adapter import get_langchain_embeddings

load_dotenv()
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_API_URL = os.environ.get("OPENROUTER_BASE_URL")


class FinancialData(BaseModel):
    university: str
    fiscal_year: int
    
    # Financial Data
    government_grants: float
    tuition_fees: float
    faculty_salaries: float
    net_assets: float
    total_expenses: float
    total_revenue: float

    # Financial Data
    total_operational_costs: float
    sales_and_services: float
    non_government_grants_and_donations: float
    investment_income: float
    
    # Expenses by Function
    learning_expenses: float
    research_expenses: float
    utilities_expenses: float
    community_engagement_expenses: float
    
    # Balance Sheet Items
    cash_and_cash_equivalents: float
    accounts_receivable: float
    portfolio_investments: float
    tangible_capital_assets: float
    accounts_payable_and_accrued_liabilities: float
    debt: float
    
    class Config:
        extra = "forbid"

class EnrollmentReport(BaseModel):
    university: str
    academic_year: int

    total_enrollment_headcount: int

    domestic_students_headcount: int
    international_students_headcount: int
    indigenous_students_headcount: int

    completion_rate_undergraduate: float
    completion_rate_master: float
    completion_rate_phd: float

    class Config:
        extra = "forbid"


def ensure_title_case(data):
    """Ensure university name is in title case"""
    if isinstance(data, FinancialData) or isinstance(data, EnrollmentReport):
        # For Pydantic models
        data_dict = data.model_dump()
        data_dict['university'] = data_dict['university'].title()
        
        if isinstance(data, FinancialData):
            return FinancialData(**data_dict)
        else:
            return EnrollmentReport(**data_dict)
    elif isinstance(data, dict) and 'university' in data:
        # For dictionaries
        data['university'] = data['university'].title()
        return data
    return data

def extract_pdf_content(pdf_path):
    """Extract both text and tabular content from PDF files using pdfplumber only"""
    # Initialize the result structure
    text_content = ""
    table_data = []
    table_counter = 0
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Process each page
            for page_num, page in enumerate(pdf.pages):
                # Extract text from page
                page_text = page.extract_text() or ""
                text_content += page_text + "\n"
                
                # Extract tables using pdfplumber's built-in table extractor
                tables = page.extract_tables()
                if tables:
                    # Add tables to text content for better context
                    text_content += f"\n\nTABLES FROM PAGE {page_num + 1}:\n"
                    
                    # Process each table
                    for table_num, table in enumerate(tables):
                        # Add table to text content in a readable format
                        text_content += f"\nTable {table_num + 1}:\n"
                        for row in table:
                            text_content += " | ".join([str(cell or "") for cell in row]) + "\n"
                        
                        # Convert table to structured format for the LLM
                        table_counter += 1
                        processed_table = {
                            "table_num": table_counter,
                            "page": page_num + 1,
                            "description": f"Table with {len(table)} rows",
                            "data": []
                        }
                        
                        # Process the table data
                        if table and len(table) > 0:
                            # Try to use the first row as headers
                            headers = [str(h).strip() if h else f"Column{i}" for i, h in enumerate(table[0])]
                            
                            # Process each row
                            for row_idx, row in enumerate(table):
                                # Skip header row
                                if row_idx == 0:
                                    continue
                                    
                                # Create row data
                                row_data = {}
                                for col_idx, cell in enumerate(row):
                                    if col_idx < len(headers):
                                        row_data[headers[col_idx]] = str(cell).strip() if cell else ""
                                processed_table["data"].append(row_data)
                        
                        table_data.append(processed_table)
                
                # Try an alternative approach with table finder - use correct parameters for pdfplumber
                try:
                    # Check if page has potential tables by looking for lines
                    if len(page.lines) > 0 or len(page.edges) > 0:
                        # Use table settings compatible with pdfplumber
                        table_settings = {
                            "snap_tolerance": 6,
                            "join_tolerance": 3,
                            "edge_min_length": 3,
                            "min_words_vertical": 3,
                            "min_words_horizontal": 1
                        }
                        
                        # Find tables using built-in pdfplumber method with correct parameters
                        tables = page.find_tables(table_settings)
                        
                        for i, table in enumerate(tables):
                            extracted = table.extract()
                            if extracted and len(extracted) > 1:  # Skip empty or single-cell tables
                                table_counter += 1
                                
                                # Add to text representation
                                text_content += f"\nAdditional Table {table_counter}:\n"
                                for row in extracted:
                                    text_content += " | ".join([str(cell or "") for cell in row]) + "\n"
                                
                                # Add to structured data
                                processed_table = {
                                    "table_num": table_counter,
                                    "page": page_num + 1,
                                    "description": f"Table with {len(extracted)} rows",
                                    "data": []
                                }
                                
                                # Process table data
                                if extracted and len(extracted) > 0:
                                    headers = [str(h).strip() if h else f"Column{i}" for i, h in enumerate(extracted[0])]
                                    for row_idx, row in enumerate(extracted):
                                        if row_idx == 0:
                                            continue
                                        row_data = {}
                                        for col_idx, cell in enumerate(row):
                                            if col_idx < len(headers):
                                                row_data[headers[col_idx]] = str(cell).strip() if cell else ""
                                        processed_table["data"].append(row_data)
                                
                                table_data.append(processed_table)
                except Exception as table_error:
                    print(f"Alternative table extraction failed for page {page_num + 1}: {str(table_error)}")
    
    except Exception as e:
        print(f"PDF extraction error: {str(e)}")
        # Fallback to PyPDFLoader if pdfplumber fails
        try:
            loader = PyPDFLoader(pdf_path)
            pages = loader.load()
            for page in pages:
                text_content += page.page_content + "\n"
            print("Used PyPDFLoader as fallback")
        except Exception as e2:
            print(f"Fallback text extraction also failed: {str(e2)}")
    
    return {"text": text_content, "tables": table_data}

def extract_simple_pdf_content(pdf_path):
    """Extract only text content from PDF using PyPDFLoader for a more compact representation"""
    text_content = ""
    try:
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        for page in pages:
            text_content += page.page_content + "\n"
        print("Using PyPDFLoader for simplified extraction")
        return {"text": text_content, "tables": []}
    except Exception as e:
        print(f"Simple PDF extraction failed: {str(e)}")
        return {"text": "Extraction failed", "tables": []}

def process_chunk(structured_data, max_retries: int = 10) -> Optional[FinancialData]:
    # Use model_json_schema instead of schema
    schema = FinancialData.model_json_schema()
    
    # Create the LLM
    llm = ChatOpenAI(
        model="deepseek/deepseek-chat-v3-0324:free",
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.1
    )
    
    # Escape both the schema and the structured data to prevent LangChain from interpreting curly braces
    schema_str = json.dumps(schema, indent=2)
    
    system_message = """You are a professional financial analyst specializing in university financial reports and statements. 
    Your expertise is in extracting precise financial data from higher education annual reports with absolutely zero hallucinations. 
    You only extract data that is explicitly stated in the document and never make assumptions about missing values."""
    
    human_message = f"""
    Extract the following financial metrics from this university financial report:
    
    Text content:
    {structured_data['text']}
    
    Table data:
    {json.dumps(structured_data['tables'], indent=2)}
    
    **Return JSON** adhering strictly to this schema - ONLY include values explicitly mentioned in the text or tables:
    {schema_str}
    
    **Financial Data Extraction Rules:**
    1. Currency Conversion:
    - Convert all monetary values to CAD using FY-end exchange rates
    - Denote converted amounts as floats (e.g., 1500000.0)
    
    2. Missing Data Handling:
    - Use 0.0 for missing numeric fields ONLY when the data isn't provided
    - DO NOT hallucinate any values not directly stated in the report
    
    3. Financial Data Requirements:
    - Maintain original university name casing (e.g., "University of Toronto" not "university of toronto")
    - Format fiscal_year as integer (e.g., 2023)
    - Extract all required financial fields from the schema
    
    4. Financial Data Validation:
    - Only include fields specified in the schema
    - Ensure numerical consistency in financial statements
    - Verify assets = liabilities + equity where applicable
    
    5. Financial Data Scaling:
    - For fields labeled with $'000 or "thousands of dollars", multiply the actual value by 1000
    - For fields labeled with $'000,000 or "millions of dollars", multiply the actual value by 1,000,000
    - Check financial statement headings and footnotes for these indicators
    
    6. Table Data Usage:
    - Pay special attention to tables as they often contain the most precise financial figures
    - Look for financial statements, balance sheets, and expense breakdowns in the tables
    - Match table headers with schema fields to extract the correct values
    
    **Output Format:**
    - Include only the raw JSON object
    - No explanations or additional text
    - Omit unnecessary whitespace
    """
    
    # Instead of using template placeholders, directly create the messages
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": human_message}
    ]
    
    match_threshold = 3  # Number of matching responses required
    response_counter = {}  # Track each unique response
    results_map = {}  # Map JSON string to parsed objects
    
    used_fallback = False
    
    for attempt in range(max_retries):
        try:
            # Call LLM directly without using the template
            response = llm.invoke(messages)
            
            # Clean and parse response
            raw_json = response.content
            cleaned = raw_json.replace('```json', '').replace('```', '').strip()
            data = json.loads(cleaned)
            
            # Validate with Pydantic
            current_result = FinancialData(**data)
            
            # Convert to JSON string for comparison (use model_dump instead of dict)
            result_json = json.dumps(current_result.model_dump(), sort_keys=True)
            
            # Count this response
            if result_json in response_counter:
                response_counter[result_json] += 1
                print(f"Match found for response variation {list(response_counter.keys()).index(result_json) + 1}! Count: {response_counter[result_json]}/{match_threshold}")
            else:
                response_counter[result_json] = 1
                results_map[result_json] = current_result
                print(f"New response variation found ({len(response_counter)})")
                
                # Add debug output to show differences with previous responses
                if len(response_counter) > 1:
                    print("\n=== RESPONSE DIFFERENCES ===")
                    # Compare the new response with all previous ones
                    new_data = current_result.model_dump()
                    for i, prev_json in enumerate(list(response_counter.keys())[:-1]):
                        prev_data = results_map[prev_json].model_dump()
                        print(f"\nDifferences with variation {i+1}:")
                        # Check each field for differences
                        for field in new_data:
                            if new_data[field] != prev_data[field]:
                                print(f"  {field}: {prev_data[field]} -> {new_data[field]}")
                    print("===========================\n")
            
            # Check if any response has reached the threshold
            for result_str, count in response_counter.items():
                if count >= match_threshold:
                    print(f"Extraction verified with {match_threshold} matching responses")
                    return ensure_title_case(results_map[result_str])
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Validation error: {str(e)}")
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} failed: {error_str}")
            
            # Check if the error is due to token limit and we haven't used the fallback yet
            if "maximum context length" in error_str and "tokens" in error_str and not used_fallback:
                print("Token limit exceeded. Switching to simplified PDF extraction...")
                # Create a simplified version of the structured data with just text
                simplified_data = {"text": structured_data["text"][:65000], "tables": []}
                human_message = f"""
                Extract the following financial metrics from this university financial report:
                
                Text content:
                {simplified_data['text']}
                
                **Return JSON** adhering strictly to this schema - ONLY include values explicitly mentioned in the text:
                {schema_str}
                
                **Financial Data Extraction Rules:**
                1. Currency Conversion:
                - Convert all monetary values to CAD using FY-end exchange rates
                - Denote converted amounts as floats (e.g., 1500000.0)
                
                2. Missing Data Handling:
                - Use 0.0 for missing numeric fields ONLY when the data isn't provided
                - DO NOT hallucinate any values not directly stated in the report
                
                **Output Format:**
                - Include only the raw JSON object
                - No explanations or additional text
                """
                
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": human_message}
                ]
                
                used_fallback = True
                continue  # Retry with simplified data
            
            time.sleep(2 ** min(attempt, 5))  # Exponential backoff with cap
    
    # If we exit the loop without returning, find the response with the most matches
    if response_counter:
        best_response = max(response_counter.items(), key=lambda x: x[1])
        best_count = best_response[1]
        best_json = best_response[0]
        
        if best_count >= 2:  # At least 2 matches
            print(f"No response reached {match_threshold} matches, but returning best match with {best_count} occurrences")
            return ensure_title_case(results_map[best_json])
    
    print(f"Failed to get {match_threshold} matching responses after {max_retries} attempts")
    return None

def process_all_reports(reports_dir: str = "./Reports", output_file: str = "results1.json") -> None:
    # Initialize or load existing results
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            all_results = json.load(f)
    else:
        all_results = {}

    # Process each PDF in the directory
    for filename in os.listdir(reports_dir):
        if filename.endswith('.pdf'):
            file_path = os.path.join(reports_dir, filename)
            
            # Skip if already processed
            if filename in all_results:
                print(f"Skipping {filename} - already processed")
                continue
                
            print(f"Processing {filename}...")
            
            # First try with detailed pdfplumber extraction
            structured_data = extract_pdf_content(file_path)
            result = process_chunk(structured_data)
            
            # If processing fails, try with simplified extraction
            if not result:
                print(f"Detailed extraction failed, trying simplified extraction for {filename}...")
                simplified_data = extract_simple_pdf_content(file_path)
                result = process_chunk(simplified_data)
            
            if result:
                # Apply title case to university name before saving
                result_dict = result.model_dump()
                result_dict = ensure_title_case(result_dict)
                
                # Store result with filename as key
                all_results[filename] = result_dict
                
                # Save after each successful processing
                with open(output_file, 'w') as f:
                    json.dump(all_results, f, indent=4)
            else:
                print(f"Failed to process {filename}")

    print(f"All results saved to {output_file}")

def process_enrollment_chunk(structured_data, max_retries: int = 10) -> Optional[EnrollmentReport]:
    # Use model_json_schema instead of schema
    schema = EnrollmentReport.model_json_schema()
    
    # Create the LLM
    llm = ChatOpenAI(
        model="deepseek/deepseek-chat-v3-0324:free",
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.1
    )
    
    # Escape both the schema and the structured data to prevent LangChain from interpreting curly braces
    schema_str = json.dumps(schema, indent=2)
    
    system_message = """You are a professional higher education enrollment data analyst specializing in university enrollment reports. 
    Your expertise is in extracting precise enrollment and student success data from university reports with absolutely zero hallucinations. 
    You only extract data that is explicitly stated in the document and never make assumptions about missing values."""
    
    human_message = f"""
    Extract the following enrollment metrics from this university report:
    
    Text content:
    {structured_data['text']}
    
    Table data:
    {json.dumps(structured_data['tables'], indent=2)}
    
    **Return JSON** adhering strictly to this schema - ONLY include values explicitly mentioned in the text or tables:
    {schema_str}
    
    **Enrollment Data Extraction Rules:**
    1. Data Format:
    - Format all enrollment counts as integers (e.g., 15000)
    - Format all rates and percentages as floats between 0.0 and 1.0 (e.g., 0.78 for 78%)
    
    2. Missing Data Handling:
    - Use 0 for missing count fields ONLY when the data isn't provided
    - Use 0.0 for missing rate fields ONLY when the data isn't provided
    - DO NOT hallucinate any values not directly stated in the report
    
    3. Enrollment Data Requirements:
    - Maintain original university name casing (e.g., "University of Toronto" not "university of toronto")
    - Format academic_year as integer (e.g., 2023)
    - Extract all required enrollment fields from the schema
    
    4. Data Validation:
    - Only include fields specified in the schema
    - Ensure numerical consistency (e.g., domestic + international = total_enrollment)
    - Verify completion rates are between 0.0 and 1.0
    
    5. Table Data Usage:
    - Pay special attention to tables as they often contain enrollment statistics
    - Look for student demographic breakdowns and completion rates in tables
    - Match table headers with schema fields to extract the correct values
    
    **Output Format:**
    - Include only the raw JSON object
    - No explanations or additional text
    - Omit unnecessary whitespace
    """
    
    # Instead of using template placeholders, directly create the messages
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": human_message}
    ]
    
    match_threshold = 3  # Number of matching responses required
    response_counter = {}  # Track each unique response
    results_map = {}  # Map JSON string to parsed objects
    
    used_fallback = False
    
    for attempt in range(max_retries):
        try:
            # Call LLM directly without using the template
            response = llm.invoke(messages)
            
            # Clean and parse response
            raw_json = response.content
            cleaned = raw_json.replace('```json', '').replace('```', '').strip()
            data = json.loads(cleaned)
            
            # Validate with Pydantic
            current_result = EnrollmentReport(**data)
            
            # Convert to JSON string for comparison (use model_dump instead of dict)
            result_json = json.dumps(current_result.model_dump(), sort_keys=True)
            
            # Count this response
            if result_json in response_counter:
                response_counter[result_json] += 1
                print(f"Match found for response variation {list(response_counter.keys()).index(result_json) + 1}! Count: {response_counter[result_json]}/{match_threshold}")
            else:
                response_counter[result_json] = 1
                results_map[result_json] = current_result
                print(f"New response variation found ({len(response_counter)})")
                
                # Add debug output to show differences with previous responses
                if len(response_counter) > 1:
                    print("\n=== ENROLLMENT RESPONSE DIFFERENCES ===")
                    # Compare the new response with all previous ones
                    new_data = current_result.model_dump()
                    for i, prev_json in enumerate(list(response_counter.keys())[:-1]):
                        prev_data = results_map[prev_json].model_dump()
                        print(f"\nDifferences with variation {i+1}:")
                        # Check each field for differences
                        for field in new_data:
                            if new_data[field] != prev_data[field]:
                                print(f"  {field}: {prev_data[field]} -> {new_data[field]}")
                    print("==========================================\n")
            
            # Check if any response has reached the threshold
            for result_str, count in response_counter.items():
                if count >= match_threshold:
                    print(f"Enrollment data extraction verified with {match_threshold} matching responses")
                    return ensure_title_case(results_map[result_str])
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Validation error: {str(e)}")
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} failed: {error_str}")
            
            # Check if the error is due to token limit and we haven't used the fallback yet
            if "maximum context length" in error_str and "tokens" in error_str and not used_fallback:
                print("Token limit exceeded. Switching to simplified PDF extraction...")
                # Create a simplified version of the structured data with just text
                simplified_data = {"text": structured_data["text"][:65000], "tables": []}
                human_message = f"""
                Extract the following enrollment metrics from this university report:
                
                Text content:
                {simplified_data['text']}
                
                **Return JSON** adhering strictly to this schema - ONLY include values explicitly mentioned in the text:
                {schema_str}
                
                **Enrollment Data Extraction Rules:**
                1. Data Format:
                - Format all enrollment counts as integers (e.g., 15000)
                - Format all rates and percentages as floats between 0.0 and 1.0 (e.g., 0.78 for 78%)
                
                2. Missing Data Handling:
                - Use 0 for missing count fields ONLY when the data isn't provided
                - Use 0.0 for missing rate fields ONLY when the data isn't provided
                - DO NOT hallucinate any values not directly stated in the report
                
                **Output Format:**
                - Include only the raw JSON object
                - No explanations or additional text
                """
                
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": human_message}
                ]
                
                used_fallback = True
                continue  # Retry with simplified data
            
            time.sleep(2 ** min(attempt, 5))  # Exponential backoff with cap
    
    # If we exit the loop without returning, find the response with the most matches
    if response_counter:
        best_response = max(response_counter.items(), key=lambda x: x[1])
        best_count = best_response[1]
        best_json = best_response[0]
        
        if best_count >= 2:  # At least 2 matches
            print(f"No response reached {match_threshold} matches, but returning best enrollment match with {best_count} occurrences")
            return ensure_title_case(results_map[best_json])
    
    print(f"Failed to get {match_threshold} matching enrollment responses after {max_retries} attempts")
    return None

def process_all_enrollment_reports(reports_dir: str = "./Reports", output_file: str = "enrollment_results1.json") -> None:
    # Initialize or load existing results
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            all_results = json.load(f)
    else:
        all_results = {}

    # Process each PDF in the directory
    for filename in os.listdir(reports_dir):
        if filename.endswith('.pdf'):
            file_path = os.path.join(reports_dir, filename)
            
            # Skip if already processed
            if filename in all_results:
                print(f"Skipping enrollment processing for {filename} - already processed")
                continue
                
            print(f"Processing enrollment data for {filename}...")
            
            # First try with detailed pdfplumber extraction
            structured_data = extract_pdf_content(file_path)
            result = process_enrollment_chunk(structured_data)
            
            # If processing fails, try with simplified extraction
            if not result:
                print(f"Detailed extraction failed, trying simplified extraction for {filename}...")
                simplified_data = extract_simple_pdf_content(file_path)
                result = process_enrollment_chunk(simplified_data)
            
            if result:
                # Apply title case to university name before saving
                result_dict = result.model_dump()
                result_dict = ensure_title_case(result_dict)
                
                # Store result with filename as key
                all_results[filename] = result_dict
                
                # Save after each successful processing
                with open(output_file, 'w') as f:
                    json.dump(all_results, f, indent=4)
            else:
                print(f"Failed to process enrollment data for {filename}")

    print(f"All enrollment results saved to {output_file}")

def process_all_data(reports_dir: str = "./Reports"):
    """Process both financial and enrollment data from all reports"""
    # Define the correct subdirectories
    financial_reports_dir = os.path.join(reports_dir, "Financial Reports")
    enrollment_reports_dir = os.path.join(reports_dir, "Enrollment Reports")
    
    # Debug information
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for financial reports in: {os.path.abspath(financial_reports_dir)}")
    print(f"Looking for enrollment reports in: {os.path.abspath(enrollment_reports_dir)}")
    
    # Check if directories exist
    if not os.path.exists(financial_reports_dir):
        print(f"ERROR: Financial Reports directory {financial_reports_dir} does not exist!")
        return
        
    if not os.path.exists(enrollment_reports_dir):
        print(f"ERROR: Enrollment Reports directory {enrollment_reports_dir} does not exist!")
        return
    
    # Count PDF files in each directory
    financial_pdfs = [f for f in os.listdir(financial_reports_dir) if f.endswith('.pdf')]
    enrollment_pdfs = [f for f in os.listdir(enrollment_reports_dir) if f.endswith('.pdf')]
    
    print(f"Found {len(financial_pdfs)} financial report PDFs: {financial_pdfs}")
    print(f"Found {len(enrollment_pdfs)} enrollment report PDFs: {enrollment_pdfs}")
    
    # Process financial data from the Financial Reports subdirectory
    print("\nPROCESSING FINANCIAL DATA")
    print("-" * 30)
    process_all_reports(reports_dir=financial_reports_dir, output_file="financial_results1.json")
    
    # Process enrollment data from the Enrollment Reports subdirectory
    print("\nPROCESSING ENROLLMENT DATA")
    print("-" * 30)
    process_all_enrollment_reports(reports_dir=enrollment_reports_dir, output_file="enrollment_results1.json")
    
    print("All data processing complete!")

if __name__ == "__main__":
    # Process all reports for both financial and enrollment data
    process_all_data()