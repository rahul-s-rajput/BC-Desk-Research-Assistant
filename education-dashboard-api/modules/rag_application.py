import os
import sys
import gc
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

import modules.config as config
from modules.document_processor import DocumentProcessor
from modules.embeddings import EmbeddingGenerator
from modules.document_store import DocumentStore
from modules.query_enhancer import QueryEnhancer
from modules.retriever import Retriever
from modules.llm_interface import LLMInterface
from modules.conversation_history import ConversationHistory

logger = logging.getLogger(__name__)

class EnhancedRAGApplication:
    def __init__(self):
        """Initialize the enhanced RAG application with all its components."""
        # Initialize components
        logger.info("Initializing RAG application components...")
        
        self.document_processor = DocumentProcessor(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP
        )
        
        self.embedding_generator = EmbeddingGenerator(
            model_name=config.EMBEDDING_MODEL
        )
        
        self.document_store = DocumentStore(
            persist_directory=config.PERSIST_DIRECTORY
        )
        
        try:
            # Initialize the query enhancer
            self.query_enhancer = QueryEnhancer(
                api_key=config.OPENROUTER_API_KEY, 
                model=config.QUERY_ENHANCER_MODEL
            )
            
            # Initialize the enhanced retriever
            self.retriever = Retriever(
                embedding_generator=self.embedding_generator,
                document_store=self.document_store,
                query_enhancer=self.query_enhancer,
                top_k=config.TOP_K,
                similarity_threshold=config.SIMILARITY_THRESHOLD,
                use_query_enhancement=True,
                max_docs_per_source=3
            )
            
            # Initialize the enhanced LLM interface with chat capabilities
            self.llm = LLMInterface(
                api_key=config.OPENROUTER_API_KEY,
                model=config.LLM_MODEL
            )
            
            # Dictionary to store conversation histories by ID
            self.conversations = {}
            
            logger.info("RAG application components initialized successfully")
            
        except ValueError as e:
            logger.error(f"Error initializing components: {e}")
            logger.error("Please set your OPENROUTER_API_KEY in a .env file or as an environment variable.")
            sys.exit(1)
    
    def get_or_create_conversation(self, conversation_id: Optional[str] = None) -> tuple:
        """Get an existing conversation or create a new one."""
        if conversation_id and conversation_id in self.conversations:
            return conversation_id, self.conversations[conversation_id]
        
        # Create a new conversation
        new_id = conversation_id or datetime.now().strftime("%Y%m%d%H%M%S")
        self.conversations[new_id] = ConversationHistory(
            max_history=config.MAX_HISTORY_TURNS
        )
        return new_id, self.conversations[new_id]
    
    async def index_all_reports(self) -> int:
        """
        Index all reports in the reports directory.
        
        Returns:
            Number of documents indexed
        """
        try:
            reports_dir = config.REPORTS_DIRECTORY
            if not os.path.exists(reports_dir):
                logger.error(f"Reports directory not found: {reports_dir}")
                return 0
                
            logger.info(f"Indexing all reports in {reports_dir}")
            
            # Get all PDF and TXT files in the main directory and subdirectories
            indexed_count = 0
            
            # Walk through directory structure
            for root, _, files in os.walk(reports_dir):
                for file in files:
                    if file.lower().endswith(('.pdf', '.txt')):
                        file_path = os.path.join(root, file)
                        
                        # Process and index the file
                        success = await self.index_document(file_path)
                        if success:
                            indexed_count += 1
                        
                        # Force garbage collection
                        gc.collect()
            
            logger.info(f"Successfully indexed {indexed_count} reports")
            return indexed_count
            
        except Exception as e:
            logger.error(f"Error indexing reports: {e}")
            return 0
    
    async def index_document(self, file_path: str) -> bool:
        """
        Process and index a single document.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Boolean indicating success
        """
        try:
            # Check if the file exists
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return False
                
            # Get filename for checking if already processed
            filename = os.path.basename(file_path)
            
            # Check if this document has already been indexed by looking for its filename in metadata
            already_indexed = any(
                meta.get("source", "").endswith(filename) 
                for meta in self.document_store.metadata
            )
            
            if already_indexed:
                logger.info(f"Document already indexed, skipping: {filename}")
                return True
                
            # Check the file size to determine processing method
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # Convert to MB
            
            # Process the document
            logger.info(f"Processing document: {file_path}, Size= {file_size:.2f}MB")
            
            # Process document chunks
            doc_chunks = await asyncio.to_thread(
                self.document_processor.process_document,
                file_path
            )
                
            if not doc_chunks:
                logger.warning(f"No chunks extracted from document: {file_path}")
                return False
                
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(doc_chunks)} chunks...")
            doc_chunks_with_embeddings = await asyncio.to_thread(
                self.embedding_generator.process_document_chunks,
                doc_chunks
            )
                
            # Add to vector store
            logger.info("Adding to vector store...")
            await asyncio.to_thread(
                self.document_store.add_documents,
                doc_chunks_with_embeddings
            )
                
            logger.info(f"Successfully indexed document: {file_path}")
            return True
        
        except Exception as e:
            logger.error(f"Error indexing document {file_path}: {e}")
            return False
    
    async def process_message(self, message: str, conversation_id: Optional[str] = None, use_history: bool = True) -> Dict[str, Any]:
        """
        Process a user message in the context of a conversation.
        
        Args:
            message: User's message
            conversation_id: ID of the conversation
            use_history: Whether to incorporate conversation history
        
        Returns:
            Dictionary with the system response and related information
        """
        try:
            # Get or create conversation history
            conv_id, conversation = self.get_or_create_conversation(conversation_id)
            
            # Retrieve relevant documents with the retriever
            logger.info(f"Retrieving relevant information for query: '{message}'")
            retrieved_docs = await asyncio.to_thread(
                self.retriever.retrieve,
                message
            )
            
            if not retrieved_docs:
                response_text = "I couldn't find any relevant information in the reports to answer your question. You might want to rephrase your question or ask something related to the education reports available."
                
                # Add to conversation history
                conversation.add_interaction(
                    user_message=message,
                    system_response=response_text,
                    retrieved_docs=[]
                )
                
                return {
                    "response": response_text,
                    "sources": [],
                    "conversation_id": conv_id,
                    "success": True
                }
            
            # Get conversation history for context if needed
            chat_history = None
            if use_history and len(conversation.history) > 0:
                chat_history = conversation.get_messages_for_llm()
            
            # Generate response using the enhanced LLM interface
            logger.info("Generating response...")
            result = await asyncio.to_thread(
                self.llm.generate_response,
                query=message,
                context_docs=retrieved_docs,
                max_tokens=config.MAX_TOKENS,
                conversation_history=chat_history
            )
            
            # Extract source information
            sources = []
            for doc in result.get("used_context", []):
                if "metadata" in doc:
                    source = doc["metadata"].get("source", "unknown")
                    page_range = doc["metadata"].get("page_range", "")
                    if page_range:
                        source = f"{source} (Pages {page_range})"
                    sources.append(source)
            
            # Add to conversation history
            conversation.add_interaction(
                user_message=message,
                system_response=result.get("response", ""),
                retrieved_docs=retrieved_docs
            )
            
            return {
                "response": result.get("response", ""),
                "sources": list(set(sources)),  # Remove duplicates
                "conversation_id": conv_id,
                "success": result.get("success", False)
            }
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            error_response = f"I apologize, but I encountered an error processing your message. Please try again or contact support if the issue persists."
            
            # Add error to conversation history if we have a valid conversation
            if conv_id in self.conversations:
                self.conversations[conv_id].add_interaction(
                    user_message=message,
                    system_response=error_response,
                    retrieved_docs=[]
                )
            
            return {
                "response": error_response,
                "sources": [],
                "conversation_id": conv_id or "error",
                "success": False
            }
        finally:
            # Force garbage collection
            gc.collect() 