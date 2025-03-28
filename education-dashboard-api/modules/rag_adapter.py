import logging
from typing import List, Dict, Any
from langchain.embeddings.base import Embeddings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class SentenceTransformerEmbeddings(Embeddings):
    """
    Adapter class to make sentence-transformers compatible with the LangChain Embeddings interface.
    This allows us to use sentence-transformers with newer langchain versions.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the adapter with a sentence-transformers model.
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        self.model_name = model_name
        logger.info(f"Initializing LangChain-compatible SentenceTransformer: {model_name}")
        self.model = SentenceTransformer(model_name)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of documents.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate an embedding for a single query text.
        
        Args:
            text: Query text to embed
            
        Returns:
            Embedding vector
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

# Create a function to convert between your custom EmbeddingGenerator and LangChain's embeddings
def get_langchain_embeddings(model_name: str = "all-MiniLM-L6-v2") -> SentenceTransformerEmbeddings:
    """
    Get a LangChain-compatible embedding model.
    
    Args:
        model_name: Name of the embedding model
        
    Returns:
        LangChain-compatible embedding model
    """
    return SentenceTransformerEmbeddings(model_name=model_name) 