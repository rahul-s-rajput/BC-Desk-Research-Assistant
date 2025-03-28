# PowerShell script to run the Education Dashboard API

# Check if virtual environment exists and activate it
if (Test-Path -Path "../deloitte_env") {
    Write-Host "Activating virtual environment..."
    & "../deloitte_env/Scripts/Activate.ps1"
}

# Install requirements
Write-Host "Installing required packages..."
pip install -r requirements.txt

# Ensure vector_db directory exists
if (-Not (Test-Path -Path "vector_db")) {
    New-Item -ItemType Directory -Path "vector_db"
}

# Check if Reports directory exists
if (-Not (Test-Path -Path "Reports")) {
    Write-Host "Error: Reports directory not found!" -ForegroundColor Red
    Write-Host "Please ensure the Reports directory exists and contains PDF/TXT files."
    exit 1
}

# Run the application
Write-Host "Starting the Education Dashboard API with RAG chatbot..."
python app.py 