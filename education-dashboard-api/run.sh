#!/bin/bash

# Activate the virtual environment if it exists
if [ -d "../deloitte_env" ]; then
    echo "Activating virtual environment..."
    source ../deloitte_env/bin/activate
fi

# Install requirements
echo "Installing required packages..."
pip install -r requirements.txt

# Ensure vector_db directory exists
mkdir -p vector_db

# Check if Reports directory exists
if [ ! -d "Reports" ]; then
    echo "Error: Reports directory not found!"
    echo "Please ensure the Reports directory exists and contains PDF/TXT files."
    exit 1
fi

# Run the application
echo "Starting the Education Dashboard API with RAG chatbot..."
python app.py 