import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# Model Settings
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-3.5-turbo")
QUERY_ENHANCER_MODEL = os.getenv("QUERY_ENHANCER_MODEL", "openai/gpt-3.5-turbo")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Document Processing Settings
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

# Vector Storage Settings
PERSIST_DIRECTORY = os.getenv("PERSIST_DIRECTORY", "vector_db")

# Retrieval Settings
TOP_K = int(os.getenv("TOP_K", "5"))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.5"))

# Response Generation Settings
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "10"))

# Reports directory
REPORTS_DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Reports") 