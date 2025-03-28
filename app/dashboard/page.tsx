"use client"

import { useState, useMemo } from "react"
import { ArrowUpRight } from "lucide-react"
import DashboardLayout from "../components/layout/DashboardLayout"
import { useDashboard } from "../context/DashboardContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

export default function Dashboard() {
  const {
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    universities,
    years,
    kpis,
    formatCurrency,
    processedFinancialData,
    filteredFinancialData
  } = useDashboard()

  // Financial data for trends chart
  const financialData = useMemo(() => {
    // Group data by year
    interface YearData {
      year: number;
      revenue: number;
      expenses: number;
      count: number;
    }
    
    const dataByYear = processedFinancialData.reduce<Record<number, YearData>>((acc, item) => {
      // Filter based on selected universities
      if (!selectedUniversities.includes("all") && 
          !selectedUniversities.includes(item.university)) {
        return acc;
      }
      
      // Filter based on selected years
      if (!selectedYears.includes("all") && 
          !selectedYears.includes(item.fiscal_year.toString())) {
        return acc;
      }
      
      // Only include years that are also in the enrollment data if 'all' years are selected
      // This ensures overview dashboard shows consistent data across all datasets
      if (selectedYears.includes("all") && !years.includes(item.fiscal_year)) {
        return acc;
      }
      
      // Initialize year entry if it doesn't exist
      if (!acc[item.fiscal_year]) {
        acc[item.fiscal_year] = {
          year: item.fiscal_year,
          revenue: 0,
          expenses: 0,
          count: 0
        };
      }
      
      // Sum values
      acc[item.fiscal_year].revenue += item.government_grants + item.tuition_fees + 
                                      ((item.research_funding as number) || 0) + ((item.donations as number) || 0) + ((item.other_income as number) || 0);
      acc[item.fiscal_year].expenses += (item.total_operational_costs as number) + 
                                       ((item.program_expenses as number) || 0) + ((item.administrative_expenses as number) || 0);
      acc[item.fiscal_year].count++;
      
      return acc;
    }, {});
    
    // Convert to array and sort by year
    return Object.values(dataByYear)
      .sort((a: YearData, b: YearData) => a.year - b.year)
      .map((item: YearData) => ({
        year: item.year,
        revenue: item.revenue,
        expenses: item.expenses
      }));
  }, [processedFinancialData, selectedUniversities, selectedYears, years]);
  
  // Enrollment data
  const enrollmentData = [
    { name: "Domestic Undergraduate", value: 12500 },
    { name: "International Undergraduate", value: 5000 },
    { name: "Domestic Graduate", value: 3500 },
    { name: "International Graduate", value: 1500 },
  ]
  
  // Operational costs data
  const costData = [
    { name: "Faculty Salaries", value: 145000000 },
    { name: "Staff Salaries", value: 95000000 },
    { name: "Facilities", value: 80000000 },
    { name: "Administrative", value: 65000000 },
    { name: "Research", value: 40000000 },
  ]
  
  // Program outcome data
  const outcomeData = [
    { program: "Business", completion: 85, employment: 88, satisfaction: 82 },
    { program: "Engineering", completion: 78, employment: 92, satisfaction: 75 },
    { program: "Sciences", completion: 80, employment: 83, satisfaction: 79 },
    { program: "Arts", completion: 88, employment: 75, satisfaction: 86 },
    { program: "Medicine", completion: 95, employment: 98, satisfaction: 90 },
  ]

  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="overview"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Financial Stability</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.financial_stability.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Net Assets</div>
          </div>
          {kpis && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight
                className={`w-4 h-4 ${kpis.financial_stability.change >= 0 ? "text-green-500" : "text-red-500"}`}
              />
              <span
                className={`${kpis.financial_stability.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
              >
                {kpis.financial_stability.change.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">LY</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Enrollment (Domestic)</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.enrollment_domestic.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Tuition Revenue</div>
          </div>
          {kpis && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight
                className={`w-4 h-4 ${kpis.enrollment_domestic.change >= 0 ? "text-green-500" : "text-red-500"}`}
              />
              <span
                className={`${kpis.enrollment_domestic.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
              >
                {kpis.enrollment_domestic.change.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">LY</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Enrollment (Int'l)</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.enrollment_intl.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Tuition Revenue</div>
          </div>
          {kpis && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight
                className={`w-4 h-4 ${kpis.enrollment_intl.change >= 0 ? "text-green-500" : "text-red-500"}`}
              />
              <span
                className={`${kpis.enrollment_intl.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
              >
                {kpis.enrollment_intl.change.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">LY</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Government Funding</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.government_funding.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Grants</div>
          </div>
          {kpis && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight
                className={`w-4 h-4 ${kpis.government_funding.change >= 0 ? "text-green-500" : "text-red-500"}`}
              />
              <span
                className={`${kpis.government_funding.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
              >
                {kpis.government_funding.change.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">LY</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>
      </div>

      {/* Visualizations from each dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Financial Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Trends</CardTitle>
            <CardDescription>Revenue vs. Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={financialData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Total Revenue" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Total Expenses" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/financials" className="text-sm text-primary hover:underline">
                View Full Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Student Population</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enrollmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {enrollmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} students`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/enrollment" className="text-sm text-primary hover:underline">
                View Full Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Operational Costs Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Costs</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/operational-costs" className="text-sm text-primary hover:underline">
                View Full Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Program Outcomes Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Program Outcomes Assessment</CardTitle>
            <CardDescription>Completion, employment, and satisfaction rates by program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={outcomeData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="program" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar 
                    name="Completion Rate" 
                    dataKey="completion" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Employment Rate" 
                    dataKey="employment" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Satisfaction Rate" 
                    dataKey="satisfaction" 
                    stroke="#ffc658" 
                    fill="#ffc658" 
                    fillOpacity={0.6} 
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/program-curriculum" className="text-sm text-primary hover:underline">
                View Full Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 