"use client"

import { useState, useEffect } from "react"
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  Clock,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LineChart,
  Menu,
  MoreHorizontal,
  PieChart,
  Search,
  Settings,
  Star,
  Sun,
  User,
  Users,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

// Define the financial data type based on the JSON structure
interface FinancialData {
  university: string
  fiscal_year: number
  government_grants: number
  tuition_fees: number
  research_funding: number
  donations: number
  other_income: number
  operational_costs: number
  program_expenses: number
  infrastructure_investments: number
  faculty_salaries: number
  administrative_expenses: number
  net_assets: number
}

// Sample data for initial rendering
const sampleData: Record<string, FinancialData> = {
  sample: {
    university: "Loading...",
    fiscal_year: 2024,
    government_grants: 0,
    tuition_fees: 0,
    research_funding: 0,
    donations: 0,
    other_income: 0,
    operational_costs: 0,
    program_expenses: 0,
    infrastructure_investments: 0,
    faculty_salaries: 0,
    administrative_expenses: 0,
    net_assets: 0,
  },
}

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

// Calculate percentage change
const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

export default function EducationDashboard() {
  const [activeTab, setActiveTab] = useState("favorites")
  const [financialData, setFinancialData] = useState<Record<string, FinancialData>>(sampleData)
  const [processedData, setProcessedData] = useState<any[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMetric, setSelectedMetric] = useState<string>("government_grants")
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch and process the financial data
 // Inside the EducationDashboard component
useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from the Flask API
        const response = await fetch('http://localhost:5000/api/financial-data');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setFinancialData(data);
        
        // Process the data for charts
        const processed = Object.values(data).map((item: FinancialData) => ({
          ...item,
          year: item.fiscal_year,
          total_revenue:
            item.government_grants + item.tuition_fees + item.research_funding + item.donations + item.other_income,
          total_expenses: item.operational_costs,
        }));
        
        setProcessedData(processed);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter data based on selections
  const filteredData = processedData.filter((item) => {
    if (selectedUniversity !== "all" && item.university !== selectedUniversity) return false
    if (selectedYear !== "all" && item.fiscal_year !== Number.parseInt(selectedYear)) return false
    return true
  })

  // Get unique universities and years for filters
  const universities = [...new Set(processedData.map((item) => item.university))]
  const years = [...new Set(processedData.map((item) => item.fiscal_year))].sort((a, b) => b - a)

  // Calculate KPI metrics
  const calculateKPIs = () => {
    if (filteredData.length === 0) return null

    // Get the most recent year's data for each university
    const latestData: Record<string, FinancialData[]> = {}

    processedData.forEach((item) => {
      if (!latestData[item.university]) {
        latestData[item.university] = []
      }
      latestData[item.university].push(item)
    })

    // Sort by year and get the latest
    Object.keys(latestData).forEach((uni) => {
      latestData[uni].sort((a, b) => b.fiscal_year - a.fiscal_year)
    })

    // If a specific university is selected, only show that one
    if (selectedUniversity !== "all") {
      const uniData = latestData[selectedUniversity]
      if (!uniData || uniData.length < 2) return null

      const current = uniData[0]
      const previous = uniData[1]

      return {
        financial_stability: {
          value: current.net_assets,
          change: calculatePercentChange(current.net_assets, previous.net_assets),
        },
        enrollment_domestic: {
          value: current.tuition_fees,
          change: calculatePercentChange(current.tuition_fees, previous.tuition_fees),
        },
        enrollment_intl: {
          value: current.tuition_fees * 0.4, // Simulated international portion
          change: calculatePercentChange(current.tuition_fees * 0.4, previous.tuition_fees * 0.4),
        },
        government_funding: {
          value: current.government_grants,
          change: calculatePercentChange(current.government_grants, previous.government_grants),
        },
      }
    }

    // If all universities are selected, aggregate the data
    const aggregatedCurrent = processedData
      .filter((item) => item.fiscal_year === Math.max(...years))
      .reduce(
        (acc, item) => {
          acc.net_assets += item.net_assets
          acc.tuition_fees += item.tuition_fees
          acc.government_grants += item.government_grants
          return acc
        },
        { net_assets: 0, tuition_fees: 0, government_grants: 0 },
      )

    const aggregatedPrevious = processedData
      .filter((item) => item.fiscal_year === years[1] || years[0] - 1)
      .reduce(
        (acc, item) => {
          acc.net_assets += item.net_assets
          acc.tuition_fees += item.tuition_fees
          acc.government_grants += item.government_grants
          return acc
        },
        { net_assets: 0, tuition_fees: 0, government_grants: 0 },
      )

    return {
      financial_stability: {
        value: aggregatedCurrent.net_assets,
        change: calculatePercentChange(aggregatedCurrent.net_assets, aggregatedPrevious.net_assets),
      },
      enrollment_domestic: {
        value: aggregatedCurrent.tuition_fees * 0.6, // Simulated domestic portion
        change: calculatePercentChange(aggregatedCurrent.tuition_fees * 0.6, aggregatedPrevious.tuition_fees * 0.6),
      },
      enrollment_intl: {
        value: aggregatedCurrent.tuition_fees * 0.4, // Simulated international portion
        change: calculatePercentChange(aggregatedCurrent.tuition_fees * 0.4, aggregatedPrevious.tuition_fees * 0.4),
      },
      government_funding: {
        value: aggregatedCurrent.government_grants,
        change: calculatePercentChange(aggregatedCurrent.government_grants, aggregatedPrevious.government_grants),
      },
    }
  }

  const kpis = calculateKPIs()

  // Prepare data for revenue breakdown chart
  const prepareRevenueData = () => {
    if (selectedYear !== "all" && selectedUniversity !== "all") {
      // If both year and university are selected, just return the filtered data
      return filteredData.map((item) => ({
        name: `${item.university} (${item.fiscal_year})`,
        university: item.university,
        year: item.fiscal_year,
        "Government Grants": item.government_grants,
        "Tuition Fees": item.tuition_fees,
        "Research Funding": item.research_funding,
        Donations: item.donations,
        "Other Income": item.other_income,
      }))
    }

    if (selectedYear !== "all") {
      // If only year is selected, group by university
      const result = filteredData
        .sort((a, b) => {
          // Sort by university name
          return a.university.localeCompare(b.university)
        })
        .map((item) => ({
          name: item.university,
          university: item.university,
          year: item.fiscal_year,
          "Government Grants": item.government_grants,
          "Tuition Fees": item.tuition_fees,
          "Research Funding": item.research_funding,
          Donations: item.donations,
          "Other Income": item.other_income,
        }))
      return result
    }

    if (selectedUniversity !== "all") {
      // If only university is selected, group by year
      const result = filteredData
        .sort((a, b) => {
          // Sort by year in descending order
          return b.fiscal_year - a.fiscal_year
        })
        .map((item) => ({
          name: `${item.fiscal_year}`,
          university: item.university,
          year: item.fiscal_year,
          "Government Grants": item.government_grants,
          "Tuition Fees": item.tuition_fees,
          "Research Funding": item.research_funding,
          Donations: item.donations,
          "Other Income": item.other_income,
        }))
      return result
    }

    // If neither is selected, group by university and then by year
    // First, group by university
    const groupedByUniversity = {}
    filteredData.forEach((item) => {
      if (!groupedByUniversity[item.university]) {
        groupedByUniversity[item.university] = []
      }
      groupedByUniversity[item.university].push(item)
    })

    // Then, for each university, sort by year and create data points
    const result = []
    Object.keys(groupedByUniversity)
      .sort() // Sort universities alphabetically
      .forEach((university) => {
        // Sort years in descending order
        groupedByUniversity[university]
          .sort((a, b) => b.fiscal_year - a.fiscal_year)
          .forEach((item) => {
            result.push({
              name: `${university} (${item.fiscal_year})`,
              university: item.university,
              year: item.fiscal_year,
              "Government Grants": item.government_grants,
              "Tuition Fees": item.tuition_fees,
              "Research Funding": item.research_funding,
              Donations: item.donations,
              "Other Income": item.other_income,
            })
          })
      })

    return result
  }

  // Prepare data for expense breakdown chart
  const prepareExpenseData = () => {
    if (selectedYear !== "all" && selectedUniversity !== "all") {
      // If both year and university are selected, just return the filtered data
      return filteredData.map((item) => ({
        name: `${item.university} (${item.fiscal_year})`,
        university: item.university,
        year: item.fiscal_year,
        "Operational Costs": item.operational_costs,
        "Program Expenses": item.program_expenses,
        Infrastructure: item.infrastructure_investments,
        "Faculty Salaries": item.faculty_salaries,
        Administrative: item.administrative_expenses,
      }))
    }

    if (selectedYear !== "all") {
      // If only year is selected, group by university
      const result = filteredData
        .sort((a, b) => {
          // Sort by university name
          return a.university.localeCompare(b.university)
        })
        .map((item) => ({
          name: item.university,
          university: item.university,
          year: item.fiscal_year,
          "Operational Costs": item.operational_costs,
          "Program Expenses": item.program_expenses,
          Infrastructure: item.infrastructure_investments,
          "Faculty Salaries": item.faculty_salaries,
          Administrative: item.administrative_expenses,
        }))
      return result
    }

    if (selectedUniversity !== "all") {
      // If only university is selected, group by year
      const result = filteredData
        .sort((a, b) => {
          // Sort by year in descending order
          return b.fiscal_year - a.fiscal_year
        })
        .map((item) => ({
          name: `${item.fiscal_year}`,
          university: item.university,
          year: item.fiscal_year,
          "Operational Costs": item.operational_costs,
          "Program Expenses": item.program_expenses,
          Infrastructure: item.infrastructure_investments,
          "Faculty Salaries": item.faculty_salaries,
          Administrative: item.administrative_expenses,
        }))
      return result
    }

    // If neither is selected, group by university and then by year
    // First, group by university
    const groupedByUniversity = {}
    filteredData.forEach((item) => {
      if (!groupedByUniversity[item.university]) {
        groupedByUniversity[item.university] = []
      }
      groupedByUniversity[item.university].push(item)
    })

    // Then, for each university, sort by year and create data points
    const result = []
    Object.keys(groupedByUniversity)
      .sort() // Sort universities alphabetically
      .forEach((university) => {
        // Sort years in descending order
        groupedByUniversity[university]
          .sort((a, b) => b.fiscal_year - a.fiscal_year)
          .forEach((item) => {
            result.push({
              name: `${university} (${item.fiscal_year})`,
              university: item.university,
              year: item.fiscal_year,
              "Operational Costs": item.operational_costs,
              "Program Expenses": item.program_expenses,
              Infrastructure: item.infrastructure_investments,
              "Faculty Salaries": item.faculty_salaries,
              Administrative: item.administrative_expenses,
            })
          })
      })

    return result
  }

  // Prepare data for trend analysis
  const prepareTrendData = () => {
    // Group by university
    const groupedByUniversity: Record<string, any[]> = {}

    processedData.forEach((item) => {
      if (!groupedByUniversity[item.university]) {
        groupedByUniversity[item.university] = []
      }
      groupedByUniversity[item.university].push(item)
    })

    // Sort each university's data by year
    Object.keys(groupedByUniversity).forEach((uni) => {
      groupedByUniversity[uni].sort((a, b) => a.fiscal_year - b.fiscal_year)
    })

    // Format for line chart
    const result: any[] = []

    Object.keys(groupedByUniversity).forEach((uni) => {
      groupedByUniversity[uni].forEach((item) => {
        result.push({
          university: item.university,
          year: item.fiscal_year,
          [selectedMetric]: item[selectedMetric as keyof FinancialData] as number,
        })
      })
    })

    return result
  }

  // Prepare data for comparison chart
  const prepareComparisonData = () => {
    // Get the most recent year's data for each university
    const latestByUniversity: Record<string, FinancialData> = {}

    processedData.forEach((item) => {
      if (!latestByUniversity[item.university] || item.fiscal_year > latestByUniversity[item.university].fiscal_year) {
        latestByUniversity[item.university] = item as FinancialData
      }
    })

    return Object.values(latestByUniversity).map((item) => ({
      name: item.university,
      value: item[selectedMetric as keyof FinancialData] as number,
    }))
  }

  // Prepare data for the AI-driven cluster comparison
  const prepareClusterData = () => {
    return filteredData.map((item) => ({
      x: item.fiscal_year,
      y: item[selectedMetric as keyof FinancialData] as number,
      z:
        item.university === "University of British Columbia"
          ? 30
          : item.university === "Simon Fraser University"
            ? 20
            : 15,
      university: item.university,
      type:
        item.university === "University of British Columbia"
          ? "Public"
          : item.university === "Simon Fraser University"
            ? "Public"
            : "Public",
    }))
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[220px] border-r bg-background">
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="w-6 h-6 rounded-full bg-slate-800"></div>
          <span className="font-semibold text-sm">EDUSENSE</span>
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
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-sm">
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="font-medium">Overview</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <LineChart className="w-4 h-4 text-muted-foreground" />
              <span>Financials</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Enrollment</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Gov. Funding</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <PieChart className="w-4 h-4 text-muted-foreground" />
              <span>Operational Costs</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Program/Curriculum</span>
            </button>
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
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Documents</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Account</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Sector</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-sm">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span>Higher Ed News</span>
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
            <span className="text-sm">Default</span>
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
                <h1 className="text-xl font-semibold">Overview</h1>
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

              {/* Tabs for different visualizations */}
              <Tabs defaultValue="revenue" className="mb-6">
                <TabsList className="mb-4">
                  <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
                  <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
                  <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                  <TabsTrigger value="comparison">University Comparison</TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Breakdown</CardTitle>
                      <CardDescription>Analysis of revenue sources by university and fiscal year</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <Tabs defaultValue="byUniversity" className="mb-4">
                          <TabsList>
                            <TabsTrigger value="byUniversity">By University</TabsTrigger>
                            <TabsTrigger value="byYear">By Year</TabsTrigger>
                          </TabsList>
                          <TabsContent value="byUniversity">
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart
                                data={prepareRevenueData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="name"
                                  label={{ value: "University", position: "insideBottom", offset: -10 }}
                                />
                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                <Tooltip
                                  formatter={(value) => [formatCurrency(value as number), ""]}
                                  labelFormatter={(label) => `${label}`}
                                />
                                <Legend />
                                <Bar dataKey="Government Grants" stackId="a" fill="#8884d8" />
                                <Bar dataKey="Tuition Fees" stackId="a" fill="#82ca9d" />
                                <Bar dataKey="Research Funding" stackId="a" fill="#ffc658" />
                                <Bar dataKey="Donations" stackId="a" fill="#ff8042" />
                                <Bar dataKey="Other Income" stackId="a" fill="#0088FE" />
                              </BarChart>
                            </ResponsiveContainer>
                          </TabsContent>
                          <TabsContent value="byYear">
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart
                                data={prepareRevenueData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                layout="vertical"
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                <YAxis type="category" dataKey="name" width={150} />
                                <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                                <Legend />
                                <Bar dataKey="Government Grants" stackId="a" fill="#8884d8" />
                                <Bar dataKey="Tuition Fees" stackId="a" fill="#82ca9d" />
                                <Bar dataKey="Research Funding" stackId="a" fill="#ffc658" />
                                <Bar dataKey="Donations" stackId="a" fill="#ff8042" />
                                <Bar dataKey="Other Income" stackId="a" fill="#0088FE" />
                              </BarChart>
                            </ResponsiveContainer>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Breakdown</CardTitle>
                      <CardDescription>Analysis of expense categories by university and fiscal year</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <Tabs defaultValue="byUniversity" className="mb-4">
                          <TabsList>
                            <TabsTrigger value="byUniversity">By University</TabsTrigger>
                            <TabsTrigger value="byYear">By Year</TabsTrigger>
                          </TabsList>
                          <TabsContent value="byUniversity">
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart
                                data={prepareExpenseData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="name"
                                  label={{ value: "University", position: "insideBottom", offset: -10 }}
                                />
                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                <Tooltip
                                  formatter={(value) => [formatCurrency(value as number), ""]}
                                  labelFormatter={(label) => `${label}`}
                                />
                                <Legend />
                                <Bar dataKey="Operational Costs" stackId="a" fill="#8884d8" />
                                <Bar dataKey="Program Expenses" stackId="a" fill="#82ca9d" />
                                <Bar dataKey="Infrastructure" stackId="a" fill="#ffc658" />
                                <Bar dataKey="Faculty Salaries" stackId="a" fill="#ff8042" />
                                <Bar dataKey="Administrative" stackId="a" fill="#0088FE" />
                              </BarChart>
                            </ResponsiveContainer>
                          </TabsContent>
                          <TabsContent value="byYear">
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart
                                data={prepareExpenseData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                layout="vertical"
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                <YAxis type="category" dataKey="name" width={150} />
                                <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                                <Legend />
                                <Bar dataKey="Operational Costs" stackId="a" fill="#8884d8" />
                                <Bar dataKey="Program Expenses" stackId="a" fill="#82ca9d" />
                                <Bar dataKey="Infrastructure" stackId="a" fill="#ffc658" />
                                <Bar dataKey="Faculty Salaries" stackId="a" fill="#ff8042" />
                                <Bar dataKey="Administrative" stackId="a" fill="#0088FE" />
                              </BarChart>
                            </ResponsiveContainer>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Trend Analysis</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4">
                          <span>Tracking changes in financial metrics over time</span>
                          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select Metric" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="government_grants">Government Grants</SelectItem>
                              <SelectItem value="tuition_fees">Tuition Fees</SelectItem>
                              <SelectItem value="research_funding">Research Funding</SelectItem>
                              <SelectItem value="donations">Donations</SelectItem>
                              <SelectItem value="operational_costs">Operational Costs</SelectItem>
                              <SelectItem value="net_assets">Net Assets</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={prepareTrendData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} />
                            <Tooltip
                              formatter={(value) => [
                                formatCurrency(value as number),
                                selectedMetric.replace(/_/g, " "),
                              ]}
                              labelFormatter={(label) => `Year: ${label}`}
                            />
                            <Legend />
                            {universities.map((uni, index) => (
                              <Line
                                key={uni}
                                type="monotone"
                                dataKey={selectedMetric}
                                data={prepareTrendData().filter((item) => item.university === uni)}
                                name={uni}
                                stroke={COLORS[index % COLORS.length]}
                                activeDot={{ r: 8 }}
                              />
                            ))}
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comparison" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>University Comparison</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4">
                          <span>Comparing universities based on selected metric</span>
                          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select Metric" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="government_grants">Government Grants</SelectItem>
                              <SelectItem value="tuition_fees">Tuition Fees</SelectItem>
                              <SelectItem value="research_funding">Research Funding</SelectItem>
                              <SelectItem value="donations">Donations</SelectItem>
                              <SelectItem value="operational_costs">Operational Costs</SelectItem>
                              <SelectItem value="net_assets">Net Assets</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={prepareComparisonData()}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={150}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareComparisonData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Bottom Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI-Driven Cluster Comparison */}
                <div className="bg-card rounded-md border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-medium">AI-Driven Cluster Comparison</div>
                    <button>
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name="Year" domain={["dataMin", "dataMax"]} />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Value"
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(value, name) => {
                            if (name === "y")
                              return [formatCurrency(value as number), selectedMetric.replace(/_/g, " ")]
                            return [value, name]
                          }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border rounded shadow-sm">
                                  <p className="font-medium">{payload[0].payload.university}</p>
                                  <p>Year: {payload[0].payload.x}</p>
                                  <p>
                                    {selectedMetric.replace(/_/g, " ")}: {formatCurrency(payload[0].payload.y)}
                                  </p>
                                  <p>Type: {payload[0].payload.type}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Scatter
                          name="Public"
                          data={prepareClusterData().filter((item) => item.type === "Public")}
                          fill="#22c55e"
                        />
                        <Scatter
                          name="Private"
                          data={prepareClusterData().filter((item) => item.type === "Private")}
                          fill="#3b82f6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Public</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Private</span>
                    </div>
                  </div>
                </div>

                {/* Enrollment Metrics */}
                <div className="bg-card rounded-md border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-medium">Enrollment Metrics</div>
                    <button>
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex justify-center items-center h-[200px]">
                    {kpis && (
                      <div className="relative w-[150px] h-[150px]">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="10"
                            strokeDasharray="283"
                            strokeDashoffset="70"
                            transform="rotate(-90 50 50)"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="10"
                            strokeDasharray="283"
                            strokeDashoffset="200"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-xs text-muted-foreground">Students</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(kpis.enrollment_domestic.value + kpis.enrollment_intl.value).replace(
                              "$",
                              "",
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">International</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Domestic</span>
                    </div>
                  </div>
                </div>
              </div>
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
                  {universities.map((uni, index) => (
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

                  <div className="flex items-center space-x-2">
                    <Checkbox id="4year" />
                    <label
                      htmlFor="4year"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      4-Year Schools
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="research" />
                    <label
                      htmlFor="research"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Research Universities
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="undergrad" />
                    <label
                      htmlFor="undergrad"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Primarily Undergraduate Universities
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="comprehensive" />
                    <label
                      htmlFor="comprehensive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Comprehensive Universities
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="bc" />
                    <label
                      htmlFor="bc"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      BC Universities
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="font-semibold mb-4">Enrollment Metrics</div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    Total Students:{" "}
                    {kpis
                      ? formatCurrency(kpis.enrollment_domestic.value + kpis.enrollment_intl.value).replace("$", "")
                      : "Loading..."}
                  </p>
                  <p>
                    Domestic: {kpis ? formatCurrency(kpis.enrollment_domestic.value).replace("$", "") : "Loading..."}
                  </p>
                  <p>
                    International: {kpis ? formatCurrency(kpis.enrollment_intl.value).replace("$", "") : "Loading..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Missing Bell component
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

// Missing ScatterChart component
function ScatterChart({ children, ...props }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsScatterChart {...props}>{children}</RechartsScatterChart>
    </ResponsiveContainer>
  )
}

// Import for ScatterChart
import { ScatterChart as RechartsScatterChart, Scatter } from "recharts"

