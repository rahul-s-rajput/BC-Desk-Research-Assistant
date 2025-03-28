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

interface SidebarProps {
  activeTab: string
  sidebarTab: string
  setSidebarTab: (tab: string) => void
}

export default function Sidebar({ activeTab, sidebarTab, setSidebarTab }: SidebarProps) {
  return (
    <div className="hidden md:flex flex-col w-[220px] border-r bg-background">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="w-6 h-6 rounded-full bg-slate-800"></div>
        <span className="font-semibold text-sm">DASHBOARD NAME</span>
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
          Dashboard
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${sidebarTab === "chatbot" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setSidebarTab("chatbot")}
        >
          Chatbot
        </button>
      </div>

      {sidebarTab === "dashboard" && (
        <div className="py-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">Dashboards</div>
          <div className="mt-1">
            <Link href="/dashboard" passHref>
              <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "overview" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                <LayoutDashboard className={`w-4 h-4 ${activeTab === "overview" ? "text-primary" : "text-muted-foreground"}`} />
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
                <PieChart className={`w-4 h-4 ${activeTab === "operational-costs" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={activeTab === "operational-costs" ? "font-medium" : ""}>Operational Costs</span>
              </button>
            </Link>
            <Link href="/dashboard/program-curriculum" passHref>
              <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "program-curriculum" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                <FileText className={`w-4 h-4 ${activeTab === "program-curriculum" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={activeTab === "program-curriculum" ? "font-medium" : ""}>Program/Curriculum</span>
              </button>
            </Link>
            <Link href="/dashboard/chatbot" passHref>
              <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${activeTab === "chatbot" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}>
                <MessageSquare className={`w-4 h-4 ${activeTab === "chatbot" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={activeTab === "chatbot" ? "font-medium" : ""}>Chatbot</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {sidebarTab === "chatbot" && (
        <div className="py-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">Conversations</div>
          <div className="mt-1">
            <Link href="/dashboard/chatbot" passHref>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 rounded-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>New Chat</span>
                <Plus className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </button>
            </Link>
            
            <div className="mt-2">
              <div className="px-3 py-1.5 text-xs text-muted-foreground">Recent Conversations</div>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Enrollment trends analysis</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Funding comparison report</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Program performance metrics</span>
              </button>
            </div>
            
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

      <div className="mt-auto p-4 flex items-center justify-center">
        <div className="flex items-center gap-1 text-xs text-blue-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 9H9.01" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 9H15.01" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>snowUI</span>
        </div>
      </div>
    </div>
  )
} 