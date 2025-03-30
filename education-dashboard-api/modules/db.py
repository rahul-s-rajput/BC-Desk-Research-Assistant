import sqlite3
import os
import json
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "conversations.db"):
        """
        Initialize database connection and create tables if they don't exist.
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self._create_tables_if_not_exist()
    
    def _create_tables_if_not_exist(self):
        """Create the necessary tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create conversations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        ''')
        
        # Create messages table with foreign key to conversations
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            retrieved_docs TEXT,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_conversations(self) -> List[Dict[str, Any]]:
        """
        Get all conversations ordered by updated_at timestamp (newest first).
        
        Returns:
            List of conversation dictionaries
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, title, timestamp, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        ''')
        
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return result
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a conversation by ID.
        
        Args:
            conversation_id: The ID of the conversation to retrieve
            
        Returns:
            Conversation dictionary or None if not found
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get conversation metadata
        cursor.execute('''
        SELECT id, title, timestamp, updated_at
        FROM conversations
        WHERE id = ?
        ''', (conversation_id,))
        
        conversation = cursor.fetchone()
        if not conversation:
            conn.close()
            return None
        
        conversation = dict(conversation)
        
        # Get all messages for this conversation
        cursor.execute('''
        SELECT role, content, timestamp, retrieved_docs
        FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
        ''', (conversation_id,))
        
        messages = []
        for row in cursor.fetchall():
            message = dict(row)
            if message['retrieved_docs']:
                message['retrieved_docs'] = json.loads(message['retrieved_docs'])
            else:
                message['retrieved_docs'] = []
            messages.append(message)
        
        conversation['messages'] = messages
        conn.close()
        
        return conversation
    
    def create_conversation(self, conversation_id: str, title: str) -> Dict[str, Any]:
        """
        Create a new conversation.
        
        Args:
            conversation_id: Unique ID for the conversation
            title: Title of the conversation
            
        Returns:
            Newly created conversation dictionary
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute('''
        INSERT INTO conversations (id, title, timestamp, updated_at)
        VALUES (?, ?, ?, ?)
        ''', (conversation_id, title, now, now))
        
        conn.commit()
        conn.close()
        
        return {
            "id": conversation_id,
            "title": title,
            "timestamp": now,
            "updated_at": now,
            "messages": []
        }
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """
        Update a conversation's title.
        
        Args:
            conversation_id: ID of the conversation to update
            title: New title
            
        Returns:
            True if successful, False if conversation not found
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute('''
        UPDATE conversations
        SET title = ?, updated_at = ?
        WHERE id = ?
        ''', (title, now, conversation_id))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success
    
    def add_message(self, conversation_id: str, role: str, content: str, retrieved_docs: Optional[List] = None) -> bool:
        """
        Add a message to a conversation.
        
        Args:
            conversation_id: ID of the conversation
            role: 'user' or 'assistant'
            content: Message content
            retrieved_docs: Optional retrieved documents
            
        Returns:
            True if successful, False if conversation not found
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if conversation exists
        cursor.execute('SELECT id FROM conversations WHERE id = ?', (conversation_id,))
        if not cursor.fetchone():
            conn.close()
            return False
        
        now = datetime.now().isoformat()
        
        # Insert message
        cursor.execute('''
        INSERT INTO messages (conversation_id, role, content, timestamp, retrieved_docs)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            conversation_id, 
            role, 
            content, 
            now, 
            json.dumps(retrieved_docs) if retrieved_docs else None
        ))
        
        # Update conversation's updated_at timestamp
        cursor.execute('''
        UPDATE conversations
        SET updated_at = ?
        WHERE id = ?
        ''', (now, conversation_id))
        
        conn.commit()
        conn.close()
        
        return True
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages.
        
        Args:
            conversation_id: ID of the conversation to delete
            
        Returns:
            True if successful, False if conversation not found
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Delete messages first (should cascade, but being explicit)
        cursor.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
        
        # Delete conversation
        cursor.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success 