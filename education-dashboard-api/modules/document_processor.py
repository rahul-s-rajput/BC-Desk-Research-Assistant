import os
import logging
from typing import List, Dict, Any, Optional
import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """
        Initialize the document processor with chunking parameters.
        
        Args:
            chunk_size: The size of text chunks
            chunk_overlap: The overlap between consecutive chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
    def process_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process a document and split it into chunks.
        
        Args:
            file_path: Path to the document
            
        Returns:
            List of document chunks with text and metadata
        """
        logger.info(f"Processing document: {file_path}")
        
        # Extract the file extension
        _, file_extension = os.path.splitext(file_path)
        file_extension = file_extension.lower()
        
        # Process the document based on its type
        if file_extension == '.pdf':
            return self._process_pdf(file_path)
        elif file_extension == '.txt':
            return self._process_txt(file_path)
        else:
            logger.warning(f"Unsupported file type: {file_extension}")
            return []
            
    def _process_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Process a PDF document."""
        try:
            # Extract the filename for metadata
            filename = os.path.basename(file_path)
            
            # Open and read the PDF
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                num_pages = len(pdf_reader.pages)
                
                # Extract text from each page
                full_text = ""
                for page_num in range(num_pages):
                    page = pdf_reader.pages[page_num]
                    full_text += page.extract_text() + "\n\n"
                    
                # Split the text into chunks
                chunks = self.text_splitter.create_documents([full_text])
                
                # Create document chunks with metadata
                doc_chunks = []
                for i, chunk in enumerate(chunks):
                    # Calculate the approximate page range for this chunk
                    # This is a rough estimate
                    chunk_size = len(chunk.page_content)
                    total_size = len(full_text)
                    start_page = max(1, int((i * chunk_size / total_size) * num_pages))
                    end_page = min(num_pages, int(((i + 1) * chunk_size / total_size) * num_pages))
                    
                    # Create chunk with metadata
                    doc_chunks.append({
                        "text": chunk.page_content,
                        "metadata": {
                            "source": filename,
                            "page_range": f"{start_page}-{end_page}",
                            "chunk_id": i
                        }
                    })
                    
                return doc_chunks
                
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {e}")
            return []
            
    def _process_txt(self, file_path: str) -> List[Dict[str, Any]]:
        """Process a text document."""
        try:
            # Extract the filename for metadata
            filename = os.path.basename(file_path)
            
            # Read the text file
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
                
            # Split the text into chunks
            chunks = self.text_splitter.create_documents([text])
            
            # Create document chunks with metadata
            doc_chunks = []
            for i, chunk in enumerate(chunks):
                doc_chunks.append({
                    "text": chunk.page_content,
                    "metadata": {
                        "source": filename,
                        "chunk_id": i
                    }
                })
                
            return doc_chunks
            
        except Exception as e:
            logger.error(f"Error processing text file {file_path}: {e}")
            return [] 