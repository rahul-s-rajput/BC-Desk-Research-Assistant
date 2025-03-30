from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import json
import subprocess
import sys
import traceback
import logging
import asyncio
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Import RAG application
from modules.rag_application import EnhancedRAGApplication
# Import our database module
from modules.db import Database

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize RAG application
rag_app = None
app_initialized = False

# Initialize database connection
db = Database()

# Load financial data from JSON file
def load_financial_data():
    with open('financial_results.json', 'r') as f:
        return json.load(f)

# Load enrollment data from JSON file
def load_enrollment_data():
    with open('enrollment_results.json', 'r') as f:
        return json.load(f)

# Load news data from JSON file
def load_news_data():
    try:
        with open('news_results.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"news": []}  # Return empty news array if file doesn't exist yet

# API route to get all financial data
@app.route('/api/financial-data', methods=['GET'])
def get_financial_data():
    try:
        data = load_financial_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get all enrollment data
@app.route('/api/enrollment-data', methods=['GET'])
def get_enrollment_data():
    try:
        data = load_enrollment_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get filtered financial data
@app.route('/api/financial-data/filter', methods=['GET'])
def get_filtered_financial_data():
    try:
        university = request.args.get('university', 'all')
        year = request.args.get('year', 'all')
        
        data = load_financial_data()
        filtered_data = {}
        
        for key, item in data.items():
            if (university == 'all' or item['university'] == university) and \
               (year == 'all' or item['fiscal_year'] == int(year)):
                filtered_data[key] = item
        
        return jsonify(filtered_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get filtered enrollment data
@app.route('/api/enrollment-data/filter', methods=['GET'])
def get_filtered_enrollment_data():
    try:
        university = request.args.get('university', 'all')
        year = request.args.get('year', 'all')
        
        data = load_enrollment_data()
        filtered_data = {}
        
        for key, item in data.items():
            if (university == 'all' or item['university'] == university) and \
               (year == 'all' or item['academic_year'] == int(year)):
                filtered_data[key] = item
        
        return jsonify(filtered_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get unique universities
@app.route('/api/universities', methods=['GET'])
def get_universities():
    try:
        # Combine universities from both datasets
        financial_data = load_financial_data()
        enrollment_data = load_enrollment_data()
        
        # Get universities from financial data
        financial_universities = set(item['university'] for item in financial_data.values())
        
        # Get universities from enrollment data
        enrollment_universities = set(item['university'] for item in enrollment_data.values())
        
        # Combine and return unique universities
        all_universities = list(financial_universities.union(enrollment_universities))
        
        return jsonify(all_universities)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get unique years
@app.route('/api/years', methods=['GET'])
def get_years():
    try:
        # Combine years from both datasets
        financial_data = load_financial_data()
        enrollment_data = load_enrollment_data()
        
        # Get years from financial data
        financial_years = set(item['fiscal_year'] for item in financial_data.values())
        
        # Get years from enrollment data
        enrollment_years = set(item['academic_year'] for item in enrollment_data.values())
        
        # Combine and return unique years
        all_years = list(financial_years.union(enrollment_years))
        all_years.sort(reverse=True)  # Sort in descending order
        
        return jsonify(all_years)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to get all news data
@app.route('/api/news', methods=['GET'])
def get_news_data():
    try:
        data = load_news_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API route to refresh news data
@app.route('/api/news/refresh', methods=['POST'])
def refresh_news_data():
    try:
        # Get the current directory of app.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build the path to test_sonar.py in the same directory
        script_path = os.path.join(current_dir, 'test_sonar.py')
        
        # Use the current Python executable
        python_executable = sys.executable
        
        print(f"Current directory: {current_dir}")
        print(f"Script path: {script_path}")
        print(f"Python executable: {python_executable}")
        
        # Set environment variables for the subprocess
        env = os.environ.copy()
        env['RUNNING_FROM_API'] = 'true'
        
        # Run the script with the current Python interpreter, using the full path
        # and setting the working directory to ensure .env is found
        result = subprocess.run(
            [python_executable, script_path],
            cwd=current_dir,  # Set working directory to the script's directory
            capture_output=True,
            text=True,
            env=env  # Pass the modified environment
        )
        
        # Print output for debugging
        print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        # Check for errors
        if result.returncode != 0:
            error_message = f"Error refreshing news: {result.stderr}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        return jsonify({"message": "News data refreshed successfully"})
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# API route to fetch new education reports and process them
@app.route('/api/fetch-reports', methods=['POST'])
def fetch_reports():
    try:
        # Get the current directory of app.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build path to the script
        scrape_script_path = os.path.join(current_dir, 'test_scrape.py')
        
        # Use the current Python executable
        python_executable = sys.executable
        
        print(f"Current directory: {current_dir}")
        print(f"Scrape script path: {scrape_script_path}")
        print(f"Python executable: {python_executable}")
        
        # Set environment variables for the subprocess
        env = os.environ.copy()
        env['RUNNING_FROM_API'] = 'true'
        
        # Check if the script exists
        if not os.path.exists(scrape_script_path):
            error_message = f"Script file not found: {scrape_script_path}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        # Check if the Python executable exists
        if not os.path.exists(python_executable):
            error_message = f"Python executable not found: {python_executable}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        # Run test_scrape.py using Method 2 (args list) which worked in our test
        print("Running test_scrape.py using args list method (Method 2)...")
        
        result = subprocess.run(
            [python_executable, scrape_script_path],
            cwd=current_dir,
            capture_output=True,
            text=True,
            env=env,
            timeout=180  # 3-minute timeout
        )
        
        # Print output for debugging
        print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        # Check for errors
        if result.returncode != 0:
            error_message = f"Error in fetch-reports process: {result.stderr}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        # Check if the script output indicates success
        if "Entire process completed successfully" in result.stdout:
            return jsonify({
                "message": "Reports fetched and processed successfully",
                "details": result.stdout
            })
        else:
            # If there's some output but return code is 0, it might be a partial success
            return jsonify({
                "message": "Reports processing completed with potential issues",
                "details": result.stdout
            })
            
    except subprocess.TimeoutExpired as e:
        error_message = f"Process timed out after 180 seconds: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500
    
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/news/sources', methods=['GET'])
def get_news_sources():
    try:
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
        
        if os.path.exists('news_sources.json'):
            with open('news_sources.json', 'r') as f:
                sources_data = json.load(f)
                sources = sources_data.get('sources', default_sources)
        else:
            # Create the file with default sources if it doesn't exist
            sources = default_sources
            with open('news_sources.json', 'w') as f:
                json.dump({'sources': sources}, f, indent=2)
                
        return jsonify({'sources': sources})
    except Exception as e:
        print(f"Error getting sources: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/news/sources', methods=['POST'])
def update_news_sources():
    try:
        data = request.json
        
        if not data or 'sources' not in data:
            return jsonify({'error': 'No sources provided'}), 400
            
        sources = data['sources']
        
        # Validate sources
        if not isinstance(sources, list):
            return jsonify({'error': 'Sources must be a list'}), 400
            
        # Save sources to file
        with open('news_sources.json', 'w') as f:
            json.dump({'sources': sources}, f, indent=2)
            
        return jsonify({'success': True, 'sources': sources})
    except Exception as e:
        print(f"Error updating sources: {str(e)}")
        return jsonify({'error': str(e)}), 500

# API endpoint to get all conversations
@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    try:
        conversations = db.get_conversations()
        return jsonify({"conversations": conversations})
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to get a specific conversation
@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    try:
        conversation = db.get_conversation(conversation_id)
        if conversation:
            return jsonify(conversation)
        else:
            return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to create a new conversation
@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    try:
        data = request.json
        if not data or 'id' not in data or 'title' not in data:
            return jsonify({"error": "Missing required fields"}), 400
        
        conversation = db.create_conversation(data['id'], data['title'])
        return jsonify(conversation), 201
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to update a conversation title
@app.route('/api/conversations/<conversation_id>/title', methods=['PUT'])
def update_conversation_title(conversation_id):
    try:
        data = request.json
        if not data or 'title' not in data:
            return jsonify({"error": "Missing title field"}), 400
        
        success = db.update_conversation_title(conversation_id, data['title'])
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.error(f"Error updating conversation title: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to delete a conversation
@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    try:
        success = db.delete_conversation(conversation_id)
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to add a message to a conversation
@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
def add_message(conversation_id):
    try:
        data = request.json
        if not data or 'role' not in data or 'content' not in data:
            return jsonify({"error": "Missing required fields"}), 400
        
        retrieved_docs = data.get('retrieved_docs')
        success = db.add_message(conversation_id, data['role'], data['content'], retrieved_docs)
        
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Update the chat API endpoint to store messages in the database
@app.route('/api/chat', methods=['POST'])
async def chat():
    global rag_app, app_initialized
    
    if not app_initialized:
        return jsonify({"error": "RAG application is still initializing. Please try again in a moment."}), 503
    
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({"error": "Missing query field"}), 400
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return jsonify({"error": "Missing conversation_id field"}), 400
        
        # Get the user's query
        query = data['query']
        
        # Check if conversation exists, create if not
        conversation = db.get_conversation(conversation_id)
        if not conversation:
            # Create a new conversation with a title based on the first message
            title = query[:50] + ('...' if len(query) > 50 else '')
            db.create_conversation(conversation_id, title)
        
        # Store the user message in the database
        db.add_message(conversation_id, 'user', query)
        
        # Process the query with RAG
        result = await rag_app.process_query(query)
        
        # Extract the response from the result
        response = result.response
        retrieved_docs = []
        
        # Format retrieved documents for storage
        if result.retrieved_documents:
            for doc in result.retrieved_documents:
                retrieved_docs.append({
                    "id": doc.id,
                    "content": doc.content[:500],  # Just store a preview of the content
                    "source": doc.source,
                    "score": doc.score
                })
        
        # Store the assistant's response in the database
        db.add_message(conversation_id, 'assistant', response, retrieved_docs)
        
        # Update the conversation title if it's new or has a generic title
        if conversation is None or (
            conversation and len(conversation['messages']) <= 2 and 
            (conversation['title'].startswith('New conversation') or conversation['title'].startswith('Conversation '))
        ):
            # Generate a title based on the first user message
            new_title = query[:50] + ('...' if len(query) > 50 else '')
            db.update_conversation_title(conversation_id, new_title)
        
        return jsonify({
            "response": response,
            "retrieved_documents": [
                {
                    "id": doc.id,
                    "content": doc.content,
                    "source": doc.source,
                    "score": doc.score
                } for doc in result.retrieved_documents
            ] if result.retrieved_documents else [],
            "web_sources": getattr(result, 'web_sources', [])
        })
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat/index-reports', methods=['POST'])
async def index_reports():
    """Index all reports in the Reports directory."""
    global rag_app
    
    try:
        # Initialize RAG app if not already done
        if rag_app is None:
            await initialize_rag_app()
            
        # Index all reports
        count = await rag_app.index_all_reports()
        
        return jsonify({
            "success": True,
            "message": f"Successfully indexed {count} reports",
            "count": count
        })
    except Exception as e:
        logger.error(f"Error indexing reports: {e}")
        return jsonify({
            "success": False,
            "message": f"Error indexing reports: {str(e)}",
            "count": 0
        }), 500

# Helper function to initialize the RAG application
async def initialize_rag_app():
    """Initialize the RAG application and index reports if necessary."""
    global rag_app, app_initialized
    
    if not app_initialized:
        try:
            logger.info("Initializing the RAG application...")
            rag_app = EnhancedRAGApplication()
            
            # Check if we need to index reports - only if the vector store is completely empty
            vector_store_empty = len(rag_app.document_store.documents) == 0
            
            if vector_store_empty:
                logger.info("Vector store is empty, indexing reports...")
                indexed_count = await rag_app.index_all_reports()
                logger.info(f"Indexed {indexed_count} reports")
            else:
                logger.info(f"Vector store already contains {len(rag_app.document_store.documents)} document chunks - skipping indexing")
                
            app_initialized = True
            logger.info("RAG application initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing RAG application: {e}")
            logger.error(traceback.format_exc())
            raise

# Run async init before first request
@app.before_request
def before_request_func():
    """Initialize the RAG application before the first request."""
    global app_initialized
    
    # Skip for static routes or if already initialized
    if app_initialized:
        return
    
    # Only initialize for routes that need the RAG application
    if request.path.startswith('/api/chat'):
        asyncio.run(initialize_rag_app())

# API route to test subprocess execution
@app.route('/api/test-subprocess', methods=['POST'])
def test_subprocess():
    try:
        # Get the current directory of app.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build path to the test script
        test_script_path = os.path.join(current_dir, 'test_simple.py')
        
        # Use the current Python executable
        python_executable = sys.executable
        
        print(f"Current directory: {current_dir}")
        print(f"Test script path: {test_script_path}")
        print(f"Python executable: {python_executable}")
        
        # Set environment variables for the subprocess
        env = os.environ.copy()
        env['RUNNING_FROM_API'] = 'true'
        
        # Check if the script exists
        if not os.path.exists(test_script_path):
            # Try to create it if it doesn't exist
            try:
                with open(test_script_path, 'w') as f:
                    f.write("""import sys
import os
import time

def main():
    print("=== Simple Test Script Started ===")
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Script path: {__file__}")
    
    if os.environ.get("RUNNING_FROM_API") == "true":
        print("Running from API: Yes")
    else:
        print("Running from API: No")
    
    print("Working for 2 seconds...")
    time.sleep(2)
    
    print("=== Simple Test Script Completed Successfully ===")
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error in test script: {str(e)}")
        sys.exit(1)
""")
                print(f"Created test script: {test_script_path}")
            except Exception as e:
                error_message = f"Failed to create test script: {str(e)}"
                print(error_message)
                return jsonify({"error": error_message}), 500
        
        # Try different methods to run the script
        results = []
        
        # Method 1: Using subprocess.run with shell=True (Windows friendly)
        print("\nTrying subprocess with shell=True:")
        try:
            cmd = f"{python_executable} {test_script_path}"
            result1 = subprocess.run(
                cmd,
                cwd=current_dir,
                capture_output=True,
                text=True,
                shell=True,
                timeout=10
            )
            results.append({
                "method": "shell=True",
                "returncode": result1.returncode,
                "stdout": result1.stdout,
                "stderr": result1.stderr,
                "success": result1.returncode == 0
            })
            print(f"Method 1 result: {result1.returncode}")
        except Exception as e:
            results.append({
                "method": "shell=True",
                "error": str(e),
                "success": False
            })
            print(f"Method 1 error: {str(e)}")
        
        # Method 2: Using subprocess.run with arguments list
        print("\nTrying subprocess with args list:")
        try:
            result2 = subprocess.run(
                [python_executable, test_script_path],
                cwd=current_dir,
                capture_output=True,
                text=True,
                timeout=10
            )
            results.append({
                "method": "args list",
                "returncode": result2.returncode,
                "stdout": result2.stdout,
                "stderr": result2.stderr,
                "success": result2.returncode == 0
            })
            print(f"Method 2 result: {result2.returncode}")
        except Exception as e:
            results.append({
                "method": "args list",
                "error": str(e),
                "success": False
            })
            print(f"Method 2 error: {str(e)}")
        
        # Method 3: Using os.system
        print("\nTrying os.system:")
        try:
            cmd = f"{python_executable} {test_script_path}"
            exit_code = os.system(cmd)
            results.append({
                "method": "os.system",
                "returncode": exit_code,
                "success": exit_code == 0
            })
            print(f"Method 3 result: {exit_code}")
        except Exception as e:
            results.append({
                "method": "os.system",
                "error": str(e),
                "success": False
            })
            print(f"Method 3 error: {str(e)}")
        
        return jsonify({
            "message": "Subprocess testing completed",
            "results": results
        })
        
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# If the python executable is in AppData, try an alternate approach
@app.route('/api/fetch-reports-alternate', methods=['POST'])
def fetch_reports_alternate():
    try:
        # Get the current directory of app.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build path to the script
        scrape_script_path = os.path.join(current_dir, 'test_scrape.py')
        
        # Try using python command directly (assumes python is in PATH)
        print(f"Current directory: {current_dir}")
        print(f"Scrape script path: {scrape_script_path}")
        
        # Check if the script exists
        if not os.path.exists(scrape_script_path):
            error_message = f"Script file not found: {scrape_script_path}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        # Use os.system which has different process creation semantics
        print("Running test_scrape.py using os.system...")
        cmd = f"python {scrape_script_path}"
        exit_code = os.system(cmd)
        
        if exit_code != 0:
            error_message = f"Command failed with exit code: {exit_code}"
            print(error_message)
            return jsonify({"error": error_message}), 500
        
        return jsonify({
            "message": "Reports fetching process initiated. Check server logs for details.",
            "exit_code": exit_code
        })
        
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)