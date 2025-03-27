"use client"

import { useState } from "react"
import { 
  BarChart3, Building2, Clock, FileText, GraduationCap, 
  Home, LayoutDashboard, LineChart, Menu, PieChart, 
  Search, Settings, Star, Sun, User, Users
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Bell icon component
function Bell(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
  universities: string[]
  years: number[]
  selectedUniversity: string
  setSelectedUniversity: (value: string) => void
  selectedYear: string
  setSelectedYear: (value: string) => void
  kpis: any
}

export default function DashboardLayout({
  children,
  universities,
  years,
  selectedUniversity,
  setSelectedUniversity,
  selectedYear,
  setSelectedYear,
  kpis
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState("favorites")
  const pathname = usePathname()

  // Format large numbers for display
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[220px] border-r bg-background">
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="w-6 h-6 rounded-full bg-slate-800"></div>
          <span className="font-semibold text-sm">DASHBOARD NAME</span>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "favorites" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("favorites")}
          >
            Favorites
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "recently" ? "border-b-2 border-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("recently")}
          >
            Recently
          </button>
        </div>

        <div className="py-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">Favorites</div>
          <div className="mt-1">
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Home className="w-4 h-4 text-muted-foreground" />
              <span>Overview</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span>Projects</span>
            </button>
          </div>
        </div>

        <div className="py-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">Dashboards</div>
          <div className="mt-1">
            <Link 
              href="/dashboard" 
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${pathname === "/dashboard" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}
            >
              <LayoutDashboard className={`w-4 h-4 ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={pathname === "/dashboard" ? "font-medium" : ""}>Overview</span>
            </Link>
            <Link 
              href="/dashboard/revenue" 
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${pathname === "/dashboard/revenue" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}
            >
              <LineChart className={`w-4 h-4 ${pathname === "/dashboard/revenue" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={pathname === "/dashboard/revenue" ? "font-medium" : ""}>Revenue Analysis</span>
            </Link>
            <Link 
              href="/dashboard/expenses" 
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${pathname === "/dashboard/expenses" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}
            >
              <Users className={`w-4 h-4 ${pathname === "/dashboard/expenses" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={pathname === "/dashboard/expenses" ? "font-medium" : ""}>Expense Analysis</span>
            </Link>
            <Link 
              href="/dashboard/trends" 
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${pathname === "/dashboard/trends" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}
            >
              <Building2 className={`w-4 h-4 ${pathname === "/dashboard/trends" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={pathname === "/dashboard/trends" ? "font-medium" : ""}>Trend Analysis</span>
            </Link>
            <Link 
              href="/dashboard/comparison" 
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm ${pathname === "/dashboard/comparison" ? "bg-muted" : "hover:bg-muted"} rounded-sm`}
            >
              <PieChart className={`w-4 h-4 ${pathname === "/dashboard/comparison" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={pathname === "/dashboard/comparison" ? "font-medium" : ""}>University Comparison</span>
            </Link>
          </div>
        </div>

        <div className="py-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">Pages</div>
          <div className="mt-1">
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>University Profile</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <LineChart className="w-4 h-4 text-muted-foreground" />
              <span>Trends</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Similar Schools</span>
            </button>
          </div>
        </div>

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-12 border-b flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-muted rounded-sm">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-1 hover:bg-muted rounded-sm">
              <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-1 hover:bg-muted rounded-sm">
              <Star className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="text-muted-foreground text-sm">Dashboards</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">
              {pathname === "/dashboard" && "Overview"}
              {pathname === "/dashboard/revenue" && "Revenue Analysis"}
              {pathname === "/dashboard/expenses" && "Expense Analysis"}
              {pathname === "/dashboard/trends" && "Trend Analysis"}
              {pathname === "/dashboard/comparison" && "University Comparison"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="h-9 pl-8 pr-4 w-[200px] bg-muted border-none" placeholder="Search" />
            </div>
            <button className="p-1.5 hover:bg-muted rounded-full">
              <Sun className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-1.5 hover:bg-muted rounded-full">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-1.5 hover:bg-muted rounded-full">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-1.5 hover:bg-muted rounded-full">
              <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Main Dashboard */}
            <div className="flex-1 p-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">
                  {pathname === "/dashboard" && "Overview"}
                  {pathname === "/dashboard/revenue" && "Revenue Analysis"}
                  {pathname === "/dashboard/expenses" && "Expense Analysis"}
                  {pathname === "/dashboard/trends" && "Trend Analysis"}
                  {pathname === "/dashboard/comparison" && "University Comparison"}
                </h1>
                <div className="flex items-center gap-4">
                  <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select University" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Universities</SelectItem>
                      {universities.map((uni) => (
                        <SelectItem key={uni} value={uni}>
                          {uni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Main content will be inserted here */}
              {children}
            </div>

            {/* Right Sidebar */}
            <div className="hidden lg:block w-[300px] border-l p-4">
              <div className="font-semibold mb-4">Higher Education News</div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm">International Students weigh new...</h3>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>

                <div>
                  <h3 className="font-medium text-sm">University Of Alberta ranked amo...</h3>
                  <p className="text-xs text-muted-foreground">59 minutes ago</p>
                </div>

                <div>
                  <h3 className="font-medium text-sm">Three Canadian Universities Ran...</h3>
                  <p className="text-xs text-muted-foreground">12 hours ago</p>
                </div>

                <div>
                  <h3 className="font-medium text-sm">Colleges on the brink forced to m...</h3>
                  <p className="text-xs text-muted-foreground">Today, 11:59 AM</p>
                </div>
              </div>

              <div className="mt-8">
                <div className="font-semibold mb-4">Previously Viewed Universities</div>

                <div className="space-y-3">
                  {universities.slice(0, 5).map((uni, index) => (
                    <div key={uni} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-sm flex items-center justify-center text-xs">
                        {uni
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 3)}
                      </div>
                      <span className="text-sm">{uni}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="font-semibold mb-4">Filter</div>

                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input className="h-9 pl-8 pr-4 w-full" placeholder="Search" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="public" />
                    <label
                      htmlFor="public"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Public Universities
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="community" />
                    <label
                      htmlFor="community"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Community Colleges
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="polytechnic" />
                    <label
                      htmlFor="polytechnic"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Polytechnic Colleges
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="font-semibold mb-4">Enrollment Metrics</div>
                <div className="text-sm text-muted-foreground">
                  {kpis && (
                    <>
                      <p>
                        Total Students:{" "}
                        {formatCurrency(kpis.enrollment_domestic.value + kpis.enrollment_intl.value).replace("$", "")}
                      </p>
                      <p>
                        Domestic: {formatCurrency(kpis.enrollment_domestic.value).replace("$", "")}
                      </p>
                      <p>
                        International: {formatCurrency(kpis.enrollment_intl.value).replace("$", "")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 