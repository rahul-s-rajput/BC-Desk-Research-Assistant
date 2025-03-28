import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ConversationHistory:
    def __init__(self, max_history: int = 10):
        """
        Initialize a conversation history tracker.
        
        Args:
            max_history: Maximum number of interaction turns to store
        """
        self.max_history = max_history
        self.history = []
        
    def add_interaction(
        self, 
        user_message: str, 
        system_response: str,
        retrieved_docs: List[Dict[str, Any]] = None
    ) -> None:
        """
        Add an interaction to the conversation history.
        
        Args:
            user_message: User's message
            system_response: System's response
            retrieved_docs: Optional retrieved documents used for the response
        """
        # Create an interaction record
        interaction = {
            "user_message": user_message,
            "system_response": system_response,
            "retrieved_docs": retrieved_docs or []
        }
        
        # Add to history
        self.history.append(interaction)
        
        # Trim history if needed
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
            
    def get_messages_for_llm(self) -> List[Dict[str, str]]:
        """
        Get conversation history in the format needed for the LLM interface.
        
        Returns:
            List of message dictionaries in the format expected by the LLM API
        """
        messages = []
        
        for interaction in self.history:
            # Add user message
            messages.append({
                "role": "user",
                "content": interaction["user_message"]
            })
            
            # Add system response
            messages.append({
                "role": "assistant",
                "content": interaction["system_response"]
            })
            
        return messages
        
    def clear(self) -> None:
        """Clear the conversation history."""
        self.history = [] 