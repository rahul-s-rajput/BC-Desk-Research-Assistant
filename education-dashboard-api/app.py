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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize RAG application
rag_app = None
app_initialized = False

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
            error_msg = f"Script error (code {result.returncode}): {result.stderr}"
            print(error_msg)
            return jsonify({"error": error_msg}), 500
        
        print("Script completed successfully")
        
        # Load the newly generated news data
        data = load_news_data()
        return jsonify({"success": True, "message": "News data refreshed", "data": data})
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in refresh_news_data: {str(e)}")
        print(error_trace)
        return jsonify({"error": f"Error: {str(e)}"}), 500

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

# Chat API endpoints
@app.route('/api/chat', methods=['POST'])
async def chat():
    """Send a message to the RAG chat system."""
    global rag_app
    
    try:
        # Initialize RAG app if not already done
        if rag_app is None:
            await initialize_rag_app()
            
        # Get request data
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
            
        message = data['message']
        conversation_id = data.get('conversation_id')
        use_history = data.get('use_history', True)
        
        # Process the message
        result = await rag_app.process_message(
            message=message,
            conversation_id=conversation_id,
            use_history=use_history
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            "response": f"Error processing your message: {str(e)}",
            "sources": [],
            "conversation_id": "error",
            "success": False
        }), 500

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)