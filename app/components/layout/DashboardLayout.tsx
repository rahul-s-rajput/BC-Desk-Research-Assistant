"use client"

import { ReactNode, useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
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
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} sidebarTab={sidebarTab} setSidebarTab={setSidebarTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <Header />

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Main Dashboard */}
            <div className="flex-1 p-4">
              <FilterBar
                selectedUniversities={selectedUniversities}
                setSelectedUniversities={setSelectedUniversities}
                selectedYears={selectedYears}
                setSelectedYears={setSelectedYears}
                universities={universities}
                years={getFilterYears()}
                activeTab={activeTab}
              />
              
              {/* Main content (children) */}
              {children}
            </div>

            {/* Right Sidebar */}
            <NewsSidebar universities={universities} kpis={kpis} />
          </div>
        </div>
      </div>
    </div>
  )
} 