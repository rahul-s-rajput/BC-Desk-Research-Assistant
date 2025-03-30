"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useDashboard } from "../../context/DashboardContext";
import { useSearchParams, useRouter } from "next/navigation";

// Message type definition
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

// Interface for database message format
interface DBMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  retrieved_docs?: any[];
}

// Interface for conversation data from database
interface ConversationData {
  id: string;
  title: string;
  messages: DBMessage[];
}

// Interface for chat response from API
interface ChatResponse {
  response: string;
  retrieved_documents: any[];
  success?: boolean;
}

// Storage key prefix for messages
const MESSAGE_STORAGE_KEY_PREFIX = "education-dashboard-messages-";

export default function ChatbotPage() {
  // Get dashboard context
  const {
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    universities,
    years,
    kpis
  } = useDashboard();
  
  // Get router for navigation
  const router = useRouter();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"connected" | "connecting" | "error">("connecting");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Get conversation ID from URL
  const searchParams = useSearchParams();
  const urlConversationId = searchParams.get('id');

  // Set conversation ID from URL
  useEffect(() => {
    if (urlConversationId) {
      setConversationId(urlConversationId);
    } else {
      // Generate a new conversation ID if none exists
      setConversationId(`chat-${Date.now()}`);
    }
  }, [urlConversationId]);

  // Check system status on load
  useEffect(() => {
    checkSystemStatus();
  }, []);

  // Fetch conversation data when the component mounts or conversationId changes
  useEffect(() => {
    if (!conversationId) return;
    
    async function loadConversation() {
      try {
        setIsLoadingConversation(true);
        setError(null);
        
        // Fetch conversation from the API
        const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}`);
        
        if (response.status === 404) {
          // Conversation not found, but we won't create it now
          // We'll wait until the user sends a message
          setMessages([]);
        } else if (!response.ok) {
          throw new Error('Failed to load conversation');
        } else {
          // Conversation found, load messages
          const data: ConversationData = await response.json();
          
          // Set messages
          if (data.messages && data.messages.length > 0) {
            // Convert DB messages to our Message format
            const formattedMessages: Message[] = data.messages.map(msg => ({
              id: new Date(msg.timestamp).getTime().toString(),
              role: msg.role,
              content: msg.content,
              sources: msg.retrieved_docs ? msg.retrieved_docs.map(doc => doc.source || doc.id) : undefined,
              timestamp: new Date(msg.timestamp)
            }));
            
            setMessages(formattedMessages);
          }
        }
      } catch (err) {
        console.error("Error loading conversation:", err);
        setError("Failed to load conversation. Please try again.");
        setMessages([]);
      } finally {
        setIsLoadingConversation(false);
      }
    }
    
    loadConversation();
  }, [conversationId]);

  // Auto-scroll to the bottom of the messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Function to check system status
  const checkSystemStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/chat/index-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setSystemStatus("connected");
      } else {
        setSystemStatus("error");
      }
    } catch (error) {
      console.error("Error checking system status:", error);
      setSystemStatus("error");
    }
  };

  // Function to send a message to the RAG system
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversationId) return;
    
    try {
      // Create the user message object
      const userMessageObj: Message = {
        id: Date.now().toString(),
        role: "user",
        content: inputValue,
        timestamp: new Date()
      };
      
      // Add user message to the UI immediately
      setMessages(prev => [...prev, userMessageObj]);
      setInputValue("");
      setIsLoading(true);
      setError(null);
      
      // Check if conversation exists, create if it doesn't
      let conversation = null;
      const checkResponse = await fetch(`http://localhost:5000/api/conversations/${conversationId}`);
      let isNewConversation = false;
      
      if (checkResponse.status === 404) {
        isNewConversation = true;
        // Create a new conversation with a title based on the first message
        const title = userMessageObj.content.slice(0, 30) + (userMessageObj.content.length > 30 ? "..." : "");
        await fetch('http://localhost:5000/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: conversationId,
            title: title
          })
        });
        
        // Update conversation title in parent window if needed
        try {
          // @ts-ignore - updateConversationTitle is defined in Sidebar.tsx and attached to window
          if (window.updateConversationTitle) {
            // @ts-ignore
            window.updateConversationTitle(conversationId, title);
          }
        } catch (err) {
          console.error("Error updating conversation title:", err);
        }
        
        // Clean up any other temporary empty conversations
        try {
          // Get all conversations
          const allConvsResponse = await fetch('http://localhost:5000/api/conversations');
          if (allConvsResponse.ok) {
            const data = await allConvsResponse.json();
            const dbConversations = data.conversations || [];
            const dbConversationIds = new Set(dbConversations.map((c: any) => c.id));
            
            // @ts-ignore - this function is attached to window in Sidebar.tsx
            if (window.cleanupEmptyConversations && typeof window.cleanupEmptyConversations === 'function') {
              // @ts-ignore
              window.cleanupEmptyConversations(dbConversationIds);
            }
          }
        } catch (err) {
          console.error("Error cleaning up temporary conversations:", err);
        }
      } else if (checkResponse.ok) {
        conversation = await checkResponse.json();
      }
      
      // Add user message to the database
      await fetch(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: "user",
          content: userMessageObj.content
        })
      });
      
      // Send the message to the API
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessageObj.content,
          conversation_id: conversationId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get a response");
      }
      
      const data: ChatResponse = await response.json();
      
      // Add assistant response to UI
      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        sources: data.retrieved_documents?.map(doc => doc.source || doc.id),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessageObj]);
      
      // If this is an existing conversation with no title (newly created), update the title
      if (conversation && conversation.messages && conversation.messages.length <= 2 && 
          (!conversation.title || conversation.title.startsWith("New conversation"))) {
        // Generate a title based on the first user message
        const title = userMessageObj.content.slice(0, 30) + (userMessageObj.content.length > 30 ? "..." : "");
        
        // Update the conversation title in the database
        await fetch(`http://localhost:5000/api/conversations/${conversationId}/title`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });
        
        // Update conversation title in parent window if needed
        try {
          // @ts-ignore - updateConversationTitle is defined in Sidebar.tsx and attached to window
          if (window.updateConversationTitle) {
            // @ts-ignore
            window.updateConversationTitle(conversationId, title);
          }
        } catch (err) {
          console.error("Error updating conversation title:", err);
        }
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Chat component content to be wrapped by the dashboard layout
  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="chatbot"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      <Card className="flex flex-col h-[calc(100vh-8rem)]">
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">AI Education Assistant</CardTitle>
            <CardDescription>Ask questions about your educational institution data.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
              <div className="space-y-4 mb-4 p-4">
                {isLoadingConversation ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-pulse text-muted-foreground">Loading conversation...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-2">
                    <h3 className="text-xl font-semibold">How can I help you today?</h3>
                    <p className="text-muted-foreground max-w-md">
                      Ask me about enrollment trends, financial data, program metrics, or any other information
                      about your educational institution.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground max-w-[80%]"
                              : "bg-muted pb-3 pt-3 max-w-[85%]"
                          } rounded-lg px-4 py-2`}
                        >
                          {message.role === "assistant" ? (
                            <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-a:text-blue-600 prose-strong:font-bold prose-strong:text-primary-foreground prose-ul:pl-6 prose-ol:pl-6 prose-li:my-1 prose-table:border-collapse prose-table:w-full prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-th:bg-muted-foreground/10">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-base font-bold my-2" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-6 my-2" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-2" {...props} />,
                                  li: ({node, ...props}) => <li className="my-1" {...props} />,
                                  p: ({node, ...props}) => <p className="my-2" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                  table: ({node, ...props}) => <table className="border-collapse w-full my-4" {...props} />,
                                  th: ({node, ...props}) => <th className="border p-2 bg-muted-foreground/10" {...props} />,
                                  td: ({node, ...props}) => <td className="border p-2" {...props} />,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Sources:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {message.sources.map((source, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {error && (
                      <div className="flex justify-center">
                        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-red-100 text-red-800">
                          {error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="resize-none flex-1"
              rows={1}
              disabled={isLoading || isLoadingConversation}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !inputValue.trim() || systemStatus === "error"}
              className="h-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
          {systemStatus === "error" && (
            <div className="flex items-center mt-2 text-xs text-red-500">
              <AlertCircle className="h-3 w-3 mr-1" />
              System is currently unavailable. Please try again later.
            </div>
          )}
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
} 