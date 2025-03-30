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

// University short names mapping
const UNIVERSITY_SHORT_NAMES: Record<string, string> = {
  "university of british columbia": "UBC",
  "the university of british columbia": "UBC",
  "university of victoria": "UVic",
  "simon fraser university": "SFU"
};

// Helper function to get university short name
const getUniversityShortName = (university: string): string => {
  const normalizedName = university.toLowerCase().trim().replace(/^the\s+/, '');
  return UNIVERSITY_SHORT_NAMES[normalizedName] || university;
};

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
    formatNumber,
    processedFinancialData,
    filteredFinancialData,
    processedEnrollmentData,
    filteredEnrollmentData
  } = useDashboard()

  // Custom tooltip styles
  const CustomTooltipStyle = {
    backgroundColor: "white",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    boxShadow: "2px 2px 5px rgba(0, 0, 0, 0.1)"
  };

  // Custom tooltip for enrollment pie chart
  const EnrollmentPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={CustomTooltipStyle}>
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">{formatNumber(data.value)} students</p>
        </div>
      );
    }
    return null;
  };

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
      
      // Sum values using the new schema
      acc[item.fiscal_year].revenue += item.total_revenue || (
        item.government_grants + 
        item.tuition_fees + 
        item.sales_and_services +
        item.non_government_grants_and_donations + 
        item.investment_income
      );
      
      acc[item.fiscal_year].expenses += item.total_expenses || item.total_operational_costs;
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
  
  // Enrollment data from actual dataset
  const enrollmentData = useMemo(() => {
    // Get universities data for the pie chart
    const relevantYears = selectedYears.includes("all") ? 
      [...new Set(filteredEnrollmentData.map(item => item.academic_year))].sort((a, b) => b - a) :
      selectedYears.map(y => parseInt(y)).sort((a, b) => b - a);
      
    if (relevantYears.length === 0) return [];
    
    const latestYear = relevantYears[0];
    
    // Group by university for the latest year
    const universityData = filteredEnrollmentData
      .filter(item => item.academic_year === latestYear)
      .reduce((acc, item) => {
        const uniName = item.university;
        if (!acc[uniName]) {
          acc[uniName] = {
            name: uniName,
            value: 0
          };
        }
        
        // Sum total enrollment for each university
        acc[uniName].value += item.total_enrollment_headcount || 0;
        
        return acc;
      }, {} as Record<string, {name: string, value: number}>);
    
    // Convert to array and sort by value
    return Object.values(universityData)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        name: getUniversityShortName(item.name),
        value: item.value
      }));
  }, [filteredEnrollmentData, selectedYears]);
  
  // Operational costs data from actual dataset
  const costData = useMemo(() => {
    // Updated to match the financial_results.json schema
    const costCategories = [
      { key: 'faculty_salaries', name: 'Faculty Salaries' },
      { key: 'learning_expenses', name: 'Learning' },
      { key: 'research_expenses', name: 'Research' },
      { key: 'utilities_expenses', name: 'Utilities' },
      { key: 'community_engagement_expenses', name: 'Community Engagement' }
    ];
    
    // Get the most recent year's data across selected universities
    const relevantYears = selectedYears.includes("all") ? 
      [...new Set(filteredFinancialData.map(item => item.fiscal_year))].sort((a, b) => b - a) :
      selectedYears.map(y => parseInt(y)).sort((a, b) => b - a);
      
    if (relevantYears.length === 0) return [];
    
    const latestYear = relevantYears[0];
    
    // Filter for the latest year
    const latestYearData = filteredFinancialData.filter(item => item.fiscal_year === latestYear);
    
    // Create data for each cost category
    const costsData = costCategories.map(category => {
      // Sum across all selected universities
      const totalValue = latestYearData.reduce((sum, item) => {
        const value = item[category.key] as number;
        return sum + (value || 0);
      }, 0);
      
      return {
        name: category.name,
        value: totalValue
      };
    }).filter(item => item.value > 0); // Only include categories with values
    
    // Sort by value, descending
    return costsData.sort((a, b) => b.value - a.value);
  }, [filteredFinancialData, selectedYears]);
  
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
          <div className="text-lg font-medium mb-1">Domestic Tuition Revenue</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.enrollment_domestic.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Annual</div>
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
          <div className="text-lg font-medium mb-1">International Tuition Revenue</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {kpis ? formatCurrency(kpis.enrollment_intl.value) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">Annual</div>
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
            <div className="text-sm text-muted-foreground">Annual Grants</div>
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

      {/* Visualizations from each dashboard - Emphasis on enrollment and operational costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Financial Chart - Top Left */}
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
                View Full Financial Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Operational Costs Chart - Top Right */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Costs</CardTitle>
            <CardDescription>Major expense categories</CardDescription>
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
                  <Bar 
                    dataKey="value" 
                    name="Amount" 
                    fill="#8884d8"
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/operational-costs" className="text-sm text-primary hover:underline">
                View Full Operational Costs Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Chart - Bottom Left */}
        <Card>
          <CardHeader>
            <CardTitle>Student Population</CardTitle>
            <CardDescription>Total enrollment by university</CardDescription>
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
                  <Tooltip content={<EnrollmentPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-right">
              <Link href="/dashboard/enrollment" className="text-sm text-primary hover:underline">
                View Full Enrollment Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Program Outcomes Chart - Bottom Right */}
        <Card>
          <CardHeader>
            <CardTitle>Program Outcomes</CardTitle>
            <CardDescription>Completion, employment, and satisfaction rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={outcomeData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="program" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar 
                    name="Completion" 
                    dataKey="completion" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Employment" 
                    dataKey="employment" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Satisfaction" 
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
                View Full Program Dashboard →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 