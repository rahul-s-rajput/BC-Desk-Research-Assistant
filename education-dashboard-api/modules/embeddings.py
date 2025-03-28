import os
import logging
import numpy as np
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding generator with the specified model.
        
        Args:
            model_name: Name of the embedding model to use
        """
        self.model_name = model_name
        logger.info(f"Initializing sentence transformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding for a single text.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            # Ensure the text is not empty
            if not text or text.isspace():
                logger.warning("Attempted to generate embedding for empty text")
                return [0.0] * 384  # MiniLM-L6-v2 embedding dimension
            
            # Generate embedding using sentence-transformers
            embedding = self.model.encode(text, convert_to_numpy=True)
            
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
            
    def process_document_chunks(self, doc_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a list of document chunks and add embeddings to each.
        
        Args:
            doc_chunks: List of document chunks with text and metadata
            
        Returns:
            The same list with added embeddings
        """
        try:
            result = []
            
            # Process each chunk
            for chunk in doc_chunks:
                # Generate embedding for this chunk
                embedding = self.generate_embedding(chunk["text"])
                
                # Add the embedding to the chunk
                chunk_with_embedding = {
                    "text": chunk["text"],
                    "metadata": chunk["metadata"],
                    "embedding": embedding
                }
                
                result.append(chunk_with_embedding)
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing document chunks: {e}")
            return doc_chunks  # Return original chunks without embeddings 