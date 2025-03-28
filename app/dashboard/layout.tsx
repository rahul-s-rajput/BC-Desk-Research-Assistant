"use client"

import { ReactNode } from "react"
import { DashboardProvider } from "../context/DashboardContext"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      {children}
    </DashboardProvider>
  )
} 