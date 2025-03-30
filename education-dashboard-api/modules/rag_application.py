import os
import sys
import gc
import logging
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import traceback

import modules.config as config
from modules.document_processor import DocumentProcessor
from modules.embeddings import EmbeddingGenerator
from modules.document_store import DocumentStore
from modules.query_enhancer import QueryEnhancer
from modules.retriever import Retriever
from modules.llm_interface import LLMInterface, generate_verified_response
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
        
        self.query_enhancer = QueryEnhancer(
            model=config.QUERY_ENHANCER_MODEL
        )
        
        self.retriever = Retriever(
            document_store=self.document_store,
            embedding_generator=self.embedding_generator,
            query_enhancer=self.query_enhancer,
            top_k=config.TOP_K,
            similarity_threshold=config.SIMILARITY_THRESHOLD,
            use_query_enhancement=True,
            max_docs_per_source=3
        )
        
        self.llm = LLMInterface(
            model=config.LLM_MODEL
        )
        
        # Dictionary to store conversation histories
        self.conversations = {}
        
        # Load metadata files
        self.metadata_files = self._load_metadata_files()
        
    def _load_metadata_files(self) -> List[Dict[str, Any]]:
        """
        Load JSON metadata files for use in RAG.
        
        Returns:
            List of metadata file content dictionaries
        """
        metadata_files = []
        
        # Define metadata files to load
        file_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "financial_results.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "enrollment_results.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "financial_results1.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "enrollment_results1.json")
        ]
        
        for file_path in file_paths:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        content = json.load(f)
                        metadata_files.append({
                            "filename": os.path.basename(file_path),
                            "content": content
                        })
                        logger.info(f"Loaded metadata file: {file_path}")
                except Exception as e:
                    logger.error(f"Error loading metadata file {file_path}: {e}")
        
        logger.info(f"Loaded {len(metadata_files)} metadata files")
        return metadata_files
    
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
            
            # Convert documents to appropriate format for the LLM
            context_docs = []
            for doc in retrieved_docs:
                if isinstance(doc, dict):
                    # Document is already a dictionary
                    context_docs.append(doc)
                else:
                    # Document is an object with attributes - convert to dictionary
                    doc_dict = {
                        "text": doc.page_content if hasattr(doc, "page_content") else getattr(doc, "content", ""),
                        "metadata": getattr(doc, "metadata", {})
                    }
                    context_docs.append(doc_dict)
            
            # Generate response using the enhanced LLM interface
            logger.info("Generating response...")
            result = await asyncio.to_thread(
                self.llm.generate_response,
                query=message,
                context_docs=context_docs,
                max_tokens=config.MAX_TOKENS,
                conversation_history=chat_history,
                metadata_files=self.metadata_files  # Pass the metadata files to the LLM
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
            
            # Process retrieved_docs for storing in conversation history
            processed_docs = []
            for doc in retrieved_docs:
                if isinstance(doc, dict):
                    processed_docs.append(doc)
                else:
                    # Convert to dictionary
                    doc_dict = {
                        "id": getattr(doc, "id", "unknown"),
                        "content": getattr(doc, "page_content", getattr(doc, "content", "")),
                        "source": getattr(doc, "metadata", {}).get("source", "unknown"),
                        "score": getattr(doc, "score", 0.0)
                    }
                    processed_docs.append(doc_dict)
            
            # Add to conversation history
            conversation.add_interaction(
                user_message=message,
                system_response=result.get("response", ""),
                retrieved_docs=processed_docs
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

    async def process_query(self, query: str, conversation_id: Optional[str] = None) -> Any:
        """
        Process a query using the RAG pipeline and return a structured result.
        
        Args:
            query: User's query
            conversation_id: Optional conversation ID for context
        
        Returns:
            Object containing response and relevant retrieved documents
        """
        try:
            # Get or create conversation history
            conv_id, conversation = self.get_or_create_conversation(conversation_id)
            
            # Retrieve relevant documents with the retriever
            logger.info(f"Retrieving relevant information for query: '{query}'")
            retrieved_docs = await asyncio.to_thread(
                self.retriever.retrieve,
                query
            )
            
            # Convert documents to appropriate format if needed
            context_docs = []
            for doc in retrieved_docs:
                if isinstance(doc, dict):
                    # Document is already a dictionary
                    text = doc.get("text", doc.get("page_content", ""))
                    metadata = doc.get("metadata", {})
                    context_docs.append({
                        "text": text,
                        "metadata": metadata
                    })
                else:
                    # Document is an object with attributes
                    text = doc.page_content if hasattr(doc, "page_content") else getattr(doc, "content", "")
                    metadata = getattr(doc, "metadata", {})
                    context_docs.append({
                        "text": text,
                        "metadata": metadata
                    })
            
            # Log document conversion results
            logger.info(f"Converted {len(retrieved_docs)} documents to context format")
            
            # Prepare conversation history in the format expected by the LLM
            history = []
            if conversation is not None:
                history = conversation.get_messages_for_llm()
            
            # Generate response using the verified response pipeline
            logger.info("Generating verified response with LLM pipeline...")
            
            # Always use web verification with online model
            llm_response = generate_verified_response(
                query=query,
                context_docs=context_docs,
                primary_model=config.LLM_MODEL,
                verification_model="anthropic/claude-3.7-sonnet:thinking:online",
                conversation_history=history,
                metadata_files=self.metadata_files,
                web_verification=True
            )
            
            # Get the verified response
            response_text = llm_response.get("verified_response", "")
            
            # If verified response failed, fallback to primary response
            if not response_text and "primary_response" in llm_response:
                response_text = llm_response.get("primary_response", "")
                logger.warning("Verification failed, falling back to primary response")
            
            # If both failed, provide a generic error message
            if not response_text:
                response_text = "I apologize, but I couldn't generate a proper response to your query."
            
            # Add to conversation history
            if conversation is not None:
                # Ensure retrieved_docs is in a format suitable for ConversationHistory
                processed_docs = []
                for doc in retrieved_docs:
                    if isinstance(doc, dict):
                        processed_docs.append(doc)
                    else:
                        # Convert object to dictionary with essential properties
                        doc_dict = {
                            "id": getattr(doc, "id", "unknown"),
                            "content": getattr(doc, "page_content", getattr(doc, "content", "")),
                            "source": getattr(doc, "metadata", {}).get("source", "unknown"),
                            "score": getattr(doc, "score", 0.0)
                        }
                        processed_docs.append(doc_dict)
                
                conversation.add_interaction(
                    user_message=query,
                    system_response=response_text,
                    retrieved_docs=processed_docs
                )
            
            # Create the result object
            from types import SimpleNamespace
            result = SimpleNamespace()
            result.response = response_text
            
            # Prepare retrieved documents for the result
            processed_result_docs = []
            for doc in retrieved_docs:
                if isinstance(doc, dict):
                    # If already a dict, make sure it has the required properties
                    doc_obj = SimpleNamespace()
                    doc_obj.id = doc.get("id", "unknown")
                    doc_obj.content = doc.get("content", doc.get("text", doc.get("page_content", "")))
                    doc_obj.source = doc.get("source", doc.get("metadata", {}).get("source", "unknown"))
                    doc_obj.score = doc.get("score", 0.0)
                    processed_result_docs.append(doc_obj)
                else:
                    # Convert object to a SimpleNamespace with required properties
                    doc_obj = SimpleNamespace()
                    doc_obj.id = getattr(doc, "id", "unknown")
                    doc_obj.content = getattr(doc, "page_content", getattr(doc, "content", ""))
                    doc_obj.source = getattr(doc, "metadata", {}).get("source", "unknown")
                    doc_obj.score = getattr(doc, "score", 0.0)
                    processed_result_docs.append(doc_obj)
            
            result.retrieved_documents = processed_result_docs
            result.conversation_id = conv_id
            result.web_sources = llm_response.get("web_sources", [])
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            logger.error(traceback.format_exc())
            
            # Create error result
            from types import SimpleNamespace
            error_result = SimpleNamespace()
            error_result.response = f"I'm sorry, I encountered an error while processing your query: {str(e)}"
            error_result.retrieved_documents = []  # Empty but properly structured list
            error_result.conversation_id = conversation_id
            error_result.web_sources = []
            
            return error_result 