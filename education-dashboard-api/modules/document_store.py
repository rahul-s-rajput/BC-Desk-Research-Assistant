import os
import logging
import json
import numpy as np
from typing import List, Dict, Any, Optional
import pickle
from datetime import datetime

logger = logging.getLogger(__name__)

class DocumentStore:
    def __init__(self, persist_directory: str = "vector_db"):
        """
        Initialize the document store.
        
        Args:
            persist_directory: Directory to persist embeddings
        """
        self.persist_directory = persist_directory
        self.documents = []
        self.embeddings = []
        self.metadata = []
        
        # Create the persist directory if it doesn't exist
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Load existing data if available
        self._load()
        
    def _load(self):
        """Load documents, embeddings, and metadata from disk if available."""
        try:
            documents_path = os.path.join(self.persist_directory, "documents.pkl")
            embeddings_path = os.path.join(self.persist_directory, "embeddings.npy")
            metadata_path = os.path.join(self.persist_directory, "metadata.json")
            
            if os.path.exists(documents_path) and os.path.exists(embeddings_path) and os.path.exists(metadata_path):
                # Load documents
                with open(documents_path, "rb") as f:
                    self.documents = pickle.load(f)
                
                # Load embeddings and convert numpy array to list for compatibility
                embeddings_np = np.load(embeddings_path)
                self.embeddings = embeddings_np.tolist() if isinstance(embeddings_np, np.ndarray) else embeddings_np
                
                # Load metadata
                with open(metadata_path, "r") as f:
                    self.metadata = json.load(f)
                    
                logger.info(f"Loaded {len(self.documents)} documents from {self.persist_directory}")
        except Exception as e:
            logger.error(f"Error loading document store: {e}")
            # Start with empty collections
            self.documents = []
            self.embeddings = []
            self.metadata = []
            
    def _save(self):
        """Save documents, embeddings, and metadata to disk."""
        try:
            documents_path = os.path.join(self.persist_directory, "documents.pkl")
            embeddings_path = os.path.join(self.persist_directory, "embeddings.npy")
            metadata_path = os.path.join(self.persist_directory, "metadata.json")
            
            # Save documents
            with open(documents_path, "wb") as f:
                pickle.dump(self.documents, f)
            
            # Save embeddings as numpy array
            np.save(embeddings_path, np.array(self.embeddings))
            
            # Save metadata
            with open(metadata_path, "w") as f:
                json.dump(self.metadata, f)
                
            logger.info(f"Saved {len(self.documents)} documents to {self.persist_directory}")
        except Exception as e:
            logger.error(f"Error saving document store: {e}")
    
    def add_documents(self, doc_chunks_with_embeddings: List[Dict[str, Any]]):
        """
        Add documents with embeddings to the store.
        
        Args:
            doc_chunks_with_embeddings: List of document chunks with text, metadata, and embeddings
        """
        try:
            for chunk in doc_chunks_with_embeddings:
                # Check if the document chunk already exists (by content)
                existing_index = next(
                    (i for i, doc in enumerate(self.documents) if doc == chunk["text"]),
                    None
                )
                
                if existing_index is not None:
                    # Update existing document
                    self.documents[existing_index] = chunk["text"]
                    self.embeddings[existing_index] = chunk["embedding"]
                    self.metadata[existing_index] = chunk["metadata"]
                else:
                    # Add new document
                    self.documents.append(chunk["text"])
                    self.embeddings.append(chunk["embedding"])
                    self.metadata.append(chunk["metadata"])
            
            # Save to disk
            self._save()
            
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
    
    def similarity_search(self, query_embedding: List[float], top_k: int = 5, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Search for similar documents based on query embedding.
        
        Args:
            query_embedding: The embedding vector of the query
            top_k: Number of top results to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of document dictionaries with text and metadata
        """
        try:
            if not self.embeddings:
                logger.warning("No documents in store to search")
                return []
            
            # Convert embeddings to numpy arrays for efficient computation
            query_embedding_np = np.array(query_embedding)
            embeddings_np = np.array(self.embeddings)
            
            # Calculate cosine similarity
            # Normalize the vectors
            query_norm = np.linalg.norm(query_embedding_np)
            embeddings_norm = np.linalg.norm(embeddings_np, axis=1)
            
            # Avoid division by zero
            query_embedding_np = query_embedding_np / query_norm if query_norm > 0 else query_embedding_np
            embeddings_np = embeddings_np / embeddings_norm[:, np.newaxis] if np.any(embeddings_norm > 0) else embeddings_np
            
            # Calculate cosine similarities
            similarities = np.dot(embeddings_np, query_embedding_np)
            
            # Create indices array and sort by similarity (descending)
            indices = np.arange(len(similarities))
            sorted_indices = indices[np.argsort(-similarities)]
            
            # Filter by threshold and get top_k
            filtered_indices = [i for i in sorted_indices if similarities[i] >= threshold][:top_k]
            
            # Create result list
            results = []
            for i in filtered_indices:
                results.append({
                    "text": self.documents[i],
                    "metadata": self.metadata[i],
                    "similarity": float(similarities[i])
                })
                
            return results
            
        except Exception as e:
            logger.error(f"Error in similarity search: {e}")
            return [] 