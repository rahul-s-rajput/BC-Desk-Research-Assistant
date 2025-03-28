# Education Dashboard RAG Chatbot

This implementation adds a Retrieval-Augmented Generation (RAG) chatbot to the Education Dashboard, allowing users to ask questions about education reports and get intelligent responses.

## Features

- Pre-indexes all PDF and TXT reports in the Reports directory
- Uses OpenRouter API for LLM access (compatible with various models)
- Query enhancement for better retrieval
- Conversation history support for contextual responses
- Source attribution for transparency

## Setup and Installation

1. Make sure all dependencies are installed:

```bash
pip install -r requirements.txt
```

2. Set up your .env file with the necessary configuration:

```
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Model Settings
LLM_MODEL=openai/gpt-3.5-turbo
QUERY_ENHANCER_MODEL=openai/gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-ada-002

# Configure this based on your needs
MAX_TOKENS=2048
MAX_HISTORY_TURNS=10
```

3. Run the Flask application:

```bash
python app.py
```

## API Endpoints

### Chat

```
POST /api/chat
```

Send a message to the chatbot and get a response.

**Request Body:**

```json
{
  "message": "What are the enrollment trends at UBC?",
  "conversation_id": "optional-conversation-id",
  "use_history": true
}
```

**Response:**

```json
{
  "response": "Based on the reports, UBC has seen steady growth in enrollment...",
  "sources": ["UBC-Annual-Enrollment-Report-2024-25.pdf (Pages 3-5)"],
  "conversation_id": "20240328120000",
  "success": true
}
```

### Manually Index Reports

```
POST /api/chat/index-reports
```

Manually trigger indexing of all reports in the Reports directory.

**Response:**

```json
{
  "success": true,
  "message": "Successfully indexed 5 reports",
  "count": 5
}
```

## System Architecture

The RAG chatbot is built with the following components:

1. **Document Processor**: Extracts and chunks text from documents
2. **Embedding Generator**: Creates vector embeddings for document chunks
3. **Document Store**: Stores and retrieves embeddings and metadata
4. **Query Enhancer**: Improves user queries for better retrieval 
5. **Retriever**: Finds the most relevant document chunks for a given query
6. **LLM Interface**: Generates responses using OpenRouter API
7. **Conversation History**: Maintains context across multiple interactions

The system automatically indexes all reports on first startup. 