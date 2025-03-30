# Education Dashboard

An interactive education analytics platform with AI-powered insights. This application provides institutions with comprehensive visualizations of enrollment trends, financial metrics, and program performance, supported by an intelligent chatbot that can analyze education reports.

This project utilizes [Next.js](https://nextjs.org) for the frontend and Flask for the backend API.

## Key Features

- **Interactive Dashboards**: Visualize education data including enrollment trends, financial metrics, and program performance.
- **Multi-university Support**: Compare data across different institutions.
- **Chatbot with RAG Technology**: Ask questions about education reports using natural language.
- **Real-time News Integration**: Stay updated with the latest education sector news.

## AI Chatbot with RAG (Retrieval-Augmented Generation)

The dashboard includes an AI-powered chatbot that can answer questions about the education reports in the system. The chatbot uses Retrieval-Augmented Generation (RAG) technology to:

1. Automatically index all PDF and TXT reports in the Reports directory
2. Find the most relevant information when you ask a question
3. Generate a comprehensive response based on the actual report content
4. Provide source citations so you can verify the information

### Chatbot Features

- Natural language understanding
- Context-aware conversations
- Source attribution for transparency
- Support for complex queries about education data

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- OpenRouter API key (for the RAG chatbot and news service)

### Installation

1. Clone the repository

2. Set up the backend:

```bash
# Navigate to the API directory
cd education-dashboard-api

# Create and activate a Python virtual environment
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

3. Set up the frontend:

```bash
# Navigate to the frontend directory
cd education-dashboard

# Install dependencies
npm install
```

4. Configure environment variables:
   - Copy `.env.example` to `.env` in both the root directory and the `education-dashboard-api` directory
   - Update the `.env` files with your API keys:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

5. Add Education Reports:
   - The system requires reports to be organized in specific subdirectories:
     - Financial reports should be placed in: `education-dashboard-api/Reports/Financial Reports/`
     - Enrollment reports should be placed in: `education-dashboard-api/Reports/Enrollment Reports/`
     - Other general reports can be placed directly in: `education-dashboard-api/Reports/`
   - The system will automatically index these files for the RAG chatbot
   - Supported formats: PDF and plain text files

### Running the Application

1. Start the backend API:

```bash
# Navigate to the API directory and ensure your virtual environment is activated
cd education-dashboard-api

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate

# Start the API server
python app.py
```

The API will be available at [http://localhost:5000](http://localhost:5000).

2. Start the frontend:

```bash
# In a new terminal, navigate to the education-dashboard directory
cd education-dashboard
npm run dev
```

3. Open your browser to `http://localhost:3000`


