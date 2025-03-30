"use client"

import { ReactNode, useState } from "react"
import Sidebar from "./Sidebar"
import FilterBar from "./FilterBar"
import NewsSidebar from "./NewsSidebar"
import { useDashboard } from "../../context/DashboardContext"

interface DashboardLayoutProps {
  children: ReactNode
  selectedUniversities: string[]
  setSelectedUniversities: (universities: string[]) => void
  selectedYears: string[]
  setSelectedYears: (years: string[]) => void
  activeTab: string
  universities: string[]
  years: number[]
  loading?: boolean
  kpis?: any
}

export default function DashboardLayout({
  children,
  selectedUniversities,
  setSelectedUniversities,
  selectedYears,
  setSelectedYears,
  activeTab,
  universities,
  years,
  loading,
  kpis,
}: DashboardLayoutProps) {
  const [sidebarTab, setSidebarTab] = useState("dashboard")
  const { financialYears, enrollmentYears } = useDashboard()
  
  // Determine which years to show based on the active tab
  const getFilterYears = () => {
    switch(activeTab) {
      case "financials":
      case "operational-costs":
        return financialYears // Use financial years for finance-related dashboards
      case "enrollment":
      case "program-curriculum":
        return enrollmentYears // Use enrollment years for education-related dashboards
      default:
        return years // Use common years for overview dashboard
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Sidebar - sticky */}
      <div className="sticky top-0 h-screen">
        <Sidebar activeTab={activeTab} sidebarTab={sidebarTab} setSidebarTab={setSidebarTab} />
      </div>

      {/* Main Content - scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Dashboard - scrollable */}
          <div className="flex-1 overflow-auto h-screen">
            <div className="p-4">
              {activeTab !== "chatbot" && (
                <FilterBar
                  selectedUniversities={selectedUniversities}
                  setSelectedUniversities={setSelectedUniversities}
                  selectedYears={selectedYears}
                  setSelectedYears={setSelectedYears}
                  universities={universities}
                  years={getFilterYears()}
                  activeTab={activeTab}
                />
              )}
              
              {/* Main content (children) */}
              {children}
            </div>
          </div>

          {/* Right Sidebar - sticky */}
          <div className="sticky top-0 h-screen">
            <NewsSidebar universities={universities} kpis={kpis} />
          </div>
        </div>
      </div>
    </div>
  )
} 