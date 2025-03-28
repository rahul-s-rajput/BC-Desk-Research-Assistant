import logging
from typing import List, Dict, Any, Optional
import numpy as np

from modules.embeddings import EmbeddingGenerator
from modules.document_store import DocumentStore
from modules.query_enhancer import QueryEnhancer

logger = logging.getLogger(__name__)

class Retriever:
    def __init__(
        self,
        embedding_generator: EmbeddingGenerator,
        document_store: DocumentStore,
        query_enhancer: Optional[QueryEnhancer] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.5,
        use_query_enhancement: bool = True,
        max_docs_per_source: int = 3
    ):
        """
        Initialize the retriever component.
        
        Args:
            embedding_generator: Component to generate embeddings
            document_store: Component to store and retrieve documents
            query_enhancer: Optional component to enhance queries
            top_k: Number of top results to retrieve
            similarity_threshold: Minimum similarity threshold
            use_query_enhancement: Whether to use query enhancement
            max_docs_per_source: Maximum documents to retrieve per source
        """
        self.embedding_generator = embedding_generator
        self.document_store = document_store
        self.query_enhancer = query_enhancer
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        self.use_query_enhancement = use_query_enhancement and query_enhancer is not None
        self.max_docs_per_source = max_docs_per_source
        
    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: User query
            
        Returns:
            List of relevant document chunks
        """
        try:
            # Enhance the query if enabled
            if self.use_query_enhancement and self.query_enhancer is not None:
                enhanced_query = self.query_enhancer.enhance_query(query)
            else:
                enhanced_query = query
                
            # Generate embedding for the query
            query_embedding = self.embedding_generator.generate_embedding(enhanced_query)
            
            # Retrieve similar documents
            similar_docs = self.document_store.similarity_search(
                query_embedding=query_embedding,
                top_k=self.top_k * 2,  # Retrieve more initially to allow for source diversification
                threshold=self.similarity_threshold
            )
            
            # Diversify results by source if needed
            if self.max_docs_per_source > 0:
                diversified_docs = self._diversify_by_source(similar_docs)
                final_docs = diversified_docs[:self.top_k]  # Limit to top_k after diversification
            else:
                final_docs = similar_docs[:self.top_k]
                
            # Log retrieval results
            if final_docs:
                logger.info(f"Retrieved {len(final_docs)} relevant documents for query: '{query}'")
                for i, doc in enumerate(final_docs):
                    source = doc['metadata'].get('source', 'unknown')
                    similarity = doc.get('similarity', 0.0)
                    logger.info(f"  Doc {i+1}: {source} (similarity: {similarity:.3f})")
            else:
                logger.warning(f"No relevant documents found for query: '{query}'")
                
            return final_docs
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return []
            
    def _diversify_by_source(self, docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Diversify retrieved documents by source to avoid single-source dominance.
        
        Args:
            docs: Initial list of retrieved documents
            
        Returns:
            Re-ranked list with source diversity
        """
        # Group documents by source
        sources = {}
        for doc in docs:
            source = doc['metadata'].get('source', 'unknown')
            if source not in sources:
                sources[source] = []
            sources[source].append(doc)
            
        # Take up to max_docs_per_source from each source in round-robin fashion
        diversified = []
        remaining = True
        current_position = 0
        
        while remaining and len(diversified) < len(docs):
            remaining = False
            for source_docs in sources.values():
                if current_position < len(source_docs) and current_position < self.max_docs_per_source:
                    diversified.append(source_docs[current_position])
                    remaining = True
            current_position += 1
            
        return diversified 