"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.includes("/admin");
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Education Reports Chatbot</h2>
      </div>
      
      <Tabs defaultValue={isAdmin ? "admin" : "chat"} className="space-y-4">
        <TabsList>
          <Link href="/dashboard/chatbot" passHref>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </Link>
          <Link href="/dashboard/chatbot/admin" passHref>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </TabsTrigger>
          </Link>
        </TabsList>
        
        <div className="p-0">{children}</div>
      </Tabs>
    </div>
  );
} 