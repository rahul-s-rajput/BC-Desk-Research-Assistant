"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ChatbotAdminPage() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [indexResult, setIndexResult] = useState<{
    status: "success" | "error" | null;
    message: string;
    count?: number;
  }>({
    status: null,
    message: "",
  });
  const [systemStatus, setSystemStatus] = useState({
    online: false,
    reportsIndexed: "Unknown",
    lastChecked: null as Date | null
  });

  // Function to trigger report indexing
  const handleIndexReports = async () => {
    setIsIndexing(true);
    setIndexResult({ status: null, message: "" });

    try {
      const response = await fetch("/api/chat/index-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIndexResult({
          status: "success",
          message: data.message || `Successfully indexed ${data.count} reports`,
          count: data.count,
        });
      } else {
        setIndexResult({
          status: "error",
          message: data.error || "Failed to index reports",
        });
      }
    } catch (error) {
      console.error("Error indexing reports:", error);
      setIndexResult({
        status: "error",
        message: "An error occurred while indexing reports",
      });
    } finally {
      setIsIndexing(false);
    }
  };

  // Function to check system status
  const checkSystemStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      const response = await fetch("/api/chat/index-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setSystemStatus({
          online: true,
          reportsIndexed: data.count || "Unknown",
          lastChecked: new Date()
        });
        
        // Also update the index result if successful
        if (data.success) {
          setIndexResult({
            status: "success",
            message: data.message || `Retrieved status: ${data.count} reports indexed`,
            count: data.count,
          });
        }
      } else {
        setSystemStatus({
          online: false,
          reportsIndexed: "Unknown",
          lastChecked: new Date()
        });
      }
    } catch (error) {
      console.error("Error checking system status:", error);
      setSystemStatus({
        online: false,
        reportsIndexed: "Unknown",
        lastChecked: new Date()
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };
  
  // Check status on component mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-6">Chatbot Administration</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reports Indexing</CardTitle>
            <CardDescription>
              Manually trigger indexing of all reports in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will process all PDF and TXT files in the Reports directory and add them to the
              vector database for retrieval. This process may take several minutes depending on the
              number and size of the reports.
            </p>

            {indexResult.status && (
              <Alert
                variant={indexResult.status === "success" ? "default" : "destructive"}
                className="mb-4"
              >
                {indexResult.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {indexResult.status === "success" ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>{indexResult.message}</AlertDescription>
                {indexResult.count !== undefined && (
                  <p className="mt-2 text-sm font-medium">
                    {indexResult.count} reports indexed
                  </p>
                )}
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleIndexReports}
              disabled={isIndexing}
              className="w-full"
            >
              {isIndexing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Indexing Reports...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Index All Reports
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chatbot Status</CardTitle>
            <CardDescription>
              View and manage the chatbot system status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">System Status:</span>
                <span className={`text-sm font-medium ${systemStatus.online ? 'text-green-500' : 'text-red-500'}`}>
                  {systemStatus.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Model:</span>
                <span className="text-sm">OpenRouter GPT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Embedding Model:</span>
                <span className="text-sm">all-MiniLM-L6-v2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reports Indexed:</span>
                <span className="text-sm">{systemStatus.reportsIndexed}</span>
              </div>
              {systemStatus.lastChecked && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Checked:</span>
                  <span className="text-sm">{systemStatus.lastChecked.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={checkSystemStatus}
              disabled={isCheckingStatus}
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Status
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 