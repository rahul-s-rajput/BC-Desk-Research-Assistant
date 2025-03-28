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

// Message type definition
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

// Interface for chat response from API
interface ChatResponse {
  response: string;
  sources: string[];
  conversation_id: string;
  success: boolean;
}

export default function ChatbotPage() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"connected" | "connecting" | "error">("connecting");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Function to add a new message
  const addMessage = (role: "user" | "assistant", content: string, sources?: string[]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content,
        sources,
        timestamp: new Date(),
      },
    ]);
  };

  // Function to check system status
  const checkSystemStatus = async () => {
    try {
      const response = await fetch("/api/chat/index-reports", {
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

  // Function to send a message to the API
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
          use_history: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from chatbot");
      }

      const data: ChatResponse = await response.json();
      
      if (data.success) {
        addMessage("assistant", data.response, data.sources);
        setConversationId(data.conversation_id);
        setSystemStatus("connected");
      } else {
        addMessage("assistant", data.response || "Sorry, I couldn't process your request. Please try again.");
        if (data.conversation_id === "error") {
          setSystemStatus("error");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage("assistant", "An error occurred while processing your request. Please try again later.");
      setSystemStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add welcome message when component mounts
  useEffect(() => {
    addMessage(
      "assistant",
      "Hello! I'm your education data assistant. Ask me anything about the education reports in the system."
    );
    checkSystemStatus();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="container mx-auto py-4">
      <Card className="w-full max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Education Reports Chatbot</CardTitle>
              <CardDescription>
                Ask questions about education reports and get AI-powered insights
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Badge variant={
                systemStatus === "connected" ? "default" : 
                systemStatus === "connecting" ? "secondary" : "destructive"
              }>
                {systemStatus === "connected" ? "Connected" : 
                 systemStatus === "connecting" ? "Connecting..." : "Connection Error"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
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
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t pt-4">
          <div className="flex w-full items-center space-x-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                systemStatus === "error" 
                  ? "Connection error. Please try again later." 
                  : "Ask about education data, enrollment trends, programs..."
              }
              className="flex-grow resize-none"
              rows={2}
              disabled={isLoading || systemStatus === "error"}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputValue.trim() || systemStatus === "error"}
              className="h-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : systemStatus === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 