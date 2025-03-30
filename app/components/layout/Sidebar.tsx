"use client"

import {
  BarChart3,
  Building2,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  PieChart,
  Plus,
  Search,
  Users,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"

interface SidebarProps {
  activeTab: string
  sidebarTab: string
  setSidebarTab: (tab: string) => void
}

// Conversation interface for tracking chat history
interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  updated_at?: string;
}

export default function Sidebar({ activeTab, sidebarTab, setSidebarTab }: SidebarProps) {
  // Use router for client-side navigation
  const router = useRouter();
  
  // Add state for report fetching
  const [fetchingReports, setFetchingReports] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<{ message: string; type: 'success' | 'error' | null }>({ 
    message: '', 
    type: null 
  });
  
  // Add state for recent conversations
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track the current route and query parameters
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Add state for dropdown visibility
  const [showFetchOptions, setShowFetchOptions] = useState(false);

  // Load conversations from API on initial render
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:5000/api/conversations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        
        const data = await response.json();
        
        if (data.conversations && data.conversations.length > 0) {
          setRecentConversations(data.conversations);
          
          // Clean up any temporary conversations immediately
          const dbConversationIds = new Set(data.conversations.map((c: Conversation) => c.id as string));
          cleanupAllEmptyConversations(dbConversationIds as Set<string>);
        } else {
          // Initialize with default conversations if none exist
          const defaultConversations = [
            { id: "enrollment", title: "Enrollment trends analysis", timestamp: new Date().toISOString() },
            { id: "funding", title: "Funding comparison report", timestamp: new Date(Date.now() - 86400000).toISOString() },
            { id: "program", title: "Program performance metrics", timestamp: new Date(Date.now() - 172800000).toISOString() },
          ];
          
          // Create default conversations in the database
          for (const conv of defaultConversations) {
            await fetch('http://localhost:5000/api/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(conv),
            });
          }
          
          setRecentConversations(defaultConversations);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
        // Initialize with empty array on error
        setRecentConversations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, []);

  // Set sidebarTab to "chatbot" when on chatbot routes
  useEffect(() => {
    if (pathname.includes('/dashboard/chatbot')) {
      setSidebarTab("chatbot");
      
      // Get the current conversation ID from URL
      const conversationId = searchParams.get('id');
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
    }
  }, [pathname, searchParams, setSidebarTab]);

  // Function to create a new conversation
  const createNewConversation = async () => {
    try {
      // Check if there's already a temporary empty conversation
      // First, find conversations that don't exist in the database
      const response = await fetch('http://localhost:5000/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      const dbConversations = data.conversations || [];
      const dbConversationIds = new Set(dbConversations.map((c: Conversation) => c.id as string));
      
      // Find temporary conversations that don't exist in the database
      const tempConversations = recentConversations.filter(
        conv => !dbConversationIds.has(conv.id)
      );
      
      // If we already have a temporary conversation, use it instead of creating a new one
      if (tempConversations.length > 0) {
        const existingTempConv = tempConversations[0];
        setActiveConversationId(existingTempConv.id);
        router.push(`/dashboard/chatbot?id=${existingTempConv.id}`);
        return;
      }
      
      // Otherwise, create a new temporary conversation
      const newId = `chat-${Date.now()}`;
      
      // Create a temporary conversation object for the UI only
      // It won't be stored in the database until the user sends a message
      const newConversation: Conversation = {
        id: newId,
        title: `New conversation`,
        timestamp: new Date().toISOString(),
      };
      
      // Add to the UI conversation list
      const updatedConversations = [newConversation, ...recentConversations];
      setRecentConversations(updatedConversations);
      
      // Set as active conversation
      setActiveConversationId(newId);
      
      // Navigate to the new conversation using Next.js router (no page refresh)
      router.push(`/dashboard/chatbot?id=${newId}`);
    } catch (error) {
      console.error("Error creating new conversation:", error);
    }
  };

  // Function to update a conversation title
  const updateConversationTitle = async (id: string, title: string) => {
    try {
      // Update the conversation in the database
      const response = await fetch(`http://localhost:5000/api/conversations/${id}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update conversation title');
      }
      
      // Update the local state
      const updatedConversations = recentConversations.map(conv =>
        conv.id === id ? { ...conv, title } : conv
      );
      
      setRecentConversations(updatedConversations);
    } catch (error) {
      console.error("Error updating conversation title:", error);
    }
  };

  // Function to clean up empty temporary conversations
  const cleanupEmptyConversations = (dbConversationIds: Set<string>) => {
    // Keep only conversations that exist in the database or the active one
    const updatedConversations = recentConversations.filter(conv => 
      dbConversationIds.has(conv.id) || conv.id === activeConversationId
    );
    
    if (updatedConversations.length !== recentConversations.length) {
      setRecentConversations(updatedConversations);
    }
  };

  // Function to remove all temporary empty conversations (regardless of active status)
  const cleanupAllEmptyConversations = (dbConversationIds: Set<string>) => {
    // Keep only conversations that exist in the database (remove all temporary ones)
    const updatedConversations = recentConversations.filter(conv => 
      dbConversationIds.has(conv.id)
    );
    
    if (updatedConversations.length !== recentConversations.length) {
      console.log(`Removed ${recentConversations.length - updatedConversations.length} temporary conversations`);
      setRecentConversations(updatedConversations);
    }
  };

  // Add a function to explicitly remove all temporary conversations now
  const removeAllTemporaryConversations = async () => {
    try {
      // Get all database conversations
      const response = await fetch('http://localhost:5000/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      const dbConversations = data.conversations || [];
      const dbConversationIds = new Set(dbConversations.map((c: Conversation) => c.id as string));
      
      // Remove all temporary conversations
      cleanupAllEmptyConversations(dbConversationIds as Set<string>);
    } catch (error) {
      console.error("Error removing temporary conversations:", error);
    }
  };

  // Call this function to immediately remove all temporary conversations
  useEffect(() => {
    // Only run once after the initial loading of conversations
    if (!isLoading && recentConversations.length > 0) {
      removeAllTemporaryConversations();
    }
  }, [isLoading]);

  // Expose the update function and cleanup function to window for cross-component communication
  useEffect(() => {
    // @ts-ignore
    window.updateConversationTitle = updateConversationTitle;
    // @ts-ignore
    window.cleanupEmptyConversations = cleanupEmptyConversations;
    
    return () => {
      // @ts-ignore
      delete window.updateConversationTitle;
      // @ts-ignore
      delete window.cleanupEmptyConversations;
    };
  }, [recentConversations, activeConversationId]);

  // Add this useEffect near the top of the component, after other useEffect calls
  useEffect(() => {
    // Directly remove all empty conversations with title "New conversation"
    setRecentConversations(prev => 
      prev.filter(conv => conv.title !== "New conversation")
    );
    
    console.log("Cleaned up empty temporary conversations");
  }, []);

  // Add this function after other API-related functions
  const deleteEmptyConversationsFromDatabase = async () => {
    try {
      console.log("Checking for empty conversations in database...");
      
      // 1. Fetch all conversations from the database
      const response = await fetch('http://localhost:5000/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      const conversations = data.conversations || [];
      
      // 2. Filter conversations with title "New conversation"
      const emptyConversations = conversations.filter(
        (conv: Conversation) => conv.title === "New conversation"
      );
      
      console.log(`Found ${emptyConversations.length} empty conversations in database`);
      
      // 3. Delete each empty conversation
      for (const conv of emptyConversations) {
        console.log(`Deleting conversation: ${conv.id}`);
        const deleteResponse = await fetch(`http://localhost:5000/api/conversations/${conv.id}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          console.error(`Failed to delete conversation ${conv.id}`);
        }
      }
      
      if (emptyConversations.length > 0) {
        console.log(`Deleted ${emptyConversations.length} empty conversations from database`);
        
        // 4. Update the UI
        setRecentConversations(prev => 
          prev.filter(conv => conv.title !== "New conversation")
        );
      } else {
        console.log("No empty conversations found in database");
      }
    } catch (error) {
      console.error("Error deleting empty conversations:", error);
    }
  };

  // Execute once on component mount
  useEffect(() => {
    deleteEmptyConversationsFromDatabase();
  }, []);

  // Function to fetch new reports using the main endpoint
  const fetchNewReports = async () => {
    try {
      setFetchingReports(true);
      setFetchStatus({ message: 'Fetching and processing reports...', type: null });
      
      const response = await fetch('http://localhost:5000/api/fetch-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }
      
      setFetchStatus({ 
        message: 'Reports fetched successfully. Refresh the browser to see updates.', 
        type: 'success' 
      });
      
      // Clear the status message after 10 seconds
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 10000);
      
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setFetchStatus({ 
        message: `Error: ${error.message || 'Failed to fetch reports'}`, 
        type: 'error' 
      });
      
      // Clear the error message after 10 seconds
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 10000);
    } finally {
      setFetchingReports(false);
    }
  };

  // Function to test subprocess execution
  const testSubprocess = async () => {
    try {
      setFetchingReports(true);
      setFetchStatus({ message: 'Testing subprocess execution...', type: null });
      
      const response = await fetch('http://localhost:5000/api/test-subprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Subprocess test failed');
      }
      
      // Display success/failure for each method
      const summary = data.results.map((r: any) => 
        `${r.method}: ${r.success ? 'Success' : 'Failed'}`
      ).join(', ');
      
      setFetchStatus({ 
        message: `Test results: ${summary}`, 
        type: 'success' 
      });
      
      // Keep the status message longer for testing
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 15000);
      
    } catch (error: any) {
      console.error('Error testing subprocess:', error);
      setFetchStatus({ 
        message: `Error: ${error.message || 'Subprocess test failed'}`, 
        type: 'error' 
      });
      
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 15000);
    } finally {
      setFetchingReports(false);
    }
  };

  // Function to fetch reports using alternate method
  const fetchReportsAlternate = async () => {
    try {
      setFetchingReports(true);
      setFetchStatus({ message: 'Fetching reports using alternate method...', type: null });
      
      const response = await fetch('http://localhost:5000/api/fetch-reports-alternate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }
      
      setFetchStatus({ 
        message: data.message || 'Process initiated. Check server logs for details.', 
        type: 'success' 
      });
      
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 10000);
      
    } catch (error: any) {
      console.error('Error fetching reports (alternate):', error);
      setFetchStatus({ 
        message: `Error: ${error.message || 'Failed to fetch reports'}`, 
        type: 'error' 
      });
      
      setTimeout(() => {
        setFetchStatus({ message: '', type: null });
      }, 10000);
    } finally {
      setFetchingReports(false);
    }
  };

  return (
    <div className="hidden md:flex flex-col w-[220px] border-r bg-background h-screen overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="w-6 h-6 rounded-full bg-slate-800"></div>
        <span className="font-semibold text-sm">EDUSENSE</span>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="h-9 pl-8 pr-4 w-full bg-muted/50 border-none" placeholder="Search..." />
        </div>
      </div>

      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-sm font-medium ${sidebarTab === "dashboard" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setSidebarTab("dashboard")}
        >
          <LayoutDashboard className="w-4 h-4 mx-auto" />
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${sidebarTab === "chatbot" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setSidebarTab("chatbot")}
        >
          <MessageSquare className="w-4 h-4 mx-auto" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {sidebarTab === "dashboard" && (
          <div className="py-2">
            {/* Fetch Reports Button - Simplified to use only the working method */}
            <div className="p-3 mb-2">
              <div className="relative">
                <button 
                  onClick={() => !fetchingReports && fetchNewReports()} 
                  disabled={fetchingReports}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium text-white ${
                    fetchingReports 
                      ? "bg-blue-400 cursor-not-allowed" 
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {fetchingReports ? (
                    <span className="animate-pulse">Fetching...</span>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Fetch Reports</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Status message */}
              {fetchStatus.message && (
                <div className={`text-xs mt-1 p-1 rounded ${
                  fetchStatus.type === 'success' ? 'text-green-600 bg-green-50' : 
                  fetchStatus.type === 'error' ? 'text-red-600 bg-red-50' : 
                  'text-blue-600 bg-blue-50'
                }`}>
                  {fetchStatus.message}
                </div>
              )}
            </div>
            
            <div className="px-3 py-1 text-xs text-muted-foreground">Dashboards</div>
            <div className="mt-1">
              <Link href="/dashboard" passHref>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "overview" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                  <Home className={`w-4 h-4 ${activeTab === "overview" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={activeTab === "overview" ? "font-medium" : ""}>Overview</span>
                </button>
              </Link>
              <Link href="/dashboard/financials" passHref>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "financials" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                  <LineChart className={`w-4 h-4 ${activeTab === "financials" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={activeTab === "financials" ? "font-medium" : ""}>Financials</span>
                </button>
              </Link>
              <Link href="/dashboard/enrollment" passHref>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "enrollment" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                  <Users className={`w-4 h-4 ${activeTab === "enrollment" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={activeTab === "enrollment" ? "font-medium" : ""}>Enrollment</span>
                </button>
              </Link>
              <Link href="/dashboard/operational-costs" passHref>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "operational-costs" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                  <Building2 className={`w-4 h-4 ${activeTab === "operational-costs" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={activeTab === "operational-costs" ? "font-medium" : ""}>Operational</span>
                </button>
              </Link>
              <Link href="/dashboard/program-curriculum" passHref>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "program-curriculum" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                  <GraduationCap className={`w-4 h-4 ${activeTab === "program-curriculum" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={activeTab === "program-curriculum" ? "font-medium" : ""}>Programs</span>
                </button>
              </Link>
            </div>
          </div>
        )}

        {sidebarTab === "chatbot" && (
          <div className="flex flex-col h-full">
            <div className="p-3">
              <button onClick={createNewConversation} className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <div className="px-3 py-1 text-xs text-muted-foreground">Recent Conversations</div>
              
              {isLoading ? (
                <div className="text-xs text-muted-foreground text-center py-3">Loading...</div>
              ) : recentConversations.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3">No conversations yet</div>
              ) : (
                <div className="mt-1 space-y-1">
                  {recentConversations.map((conversation) => (
                    <Link key={conversation.id} href={`/dashboard/chatbot?id=${conversation.id}`} passHref>
                      <button 
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${
                          activeConversationId === conversation.id ? "bg-muted" : "hover:bg-muted"
                        } rounded-sm`}
                      >
                        <MessageSquare className={`w-4 h-4 ${
                          activeConversationId === conversation.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={activeConversationId === conversation.id ? "font-medium" : ""}>
                          {conversation.title}
                        </span>
                      </button>
                    </Link>
                  ))}
                </div>
              )}
              
              <div className="mt-2 border-t pt-2">
                <Link href="/dashboard/chatbot/admin" passHref>
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 