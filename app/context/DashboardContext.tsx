"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Define the financial data type based on the JSON structure
interface FinancialData {
  university: string
  fiscal_year: number
  government_grants: number
  tuition_fees: number
  faculty_salaries: number
  net_assets: number
  total_operational_costs: number
  faculty_staff_costs: number
  sales_and_services: number
  non_government_grants_and_donations: number
  investment_income: number
  learning_expenses: number
  research_expenses: number
  facilities_expenses: number
  students_expenses: number
  community_engagement_expenses: number
  administration_expenses: number
  [key: string]: string | number // For dynamic access
}

// Define the enrollment data type based on the JSON structure
interface EnrollmentData {
  university: string
  academic_year: number
  total_enrollment_headcount: number
  domestic_students_headcount: number
  international_students_headcount: number
  indigenous_students_headcount: number
  completion_rate_undergraduate: number
  completion_rate_master: number
  completion_rate_phd: number
  [key: string]: string | number // For dynamic access
}

interface DashboardContextType {
  financialData: Record<string, FinancialData>
  enrollmentData: Record<string, EnrollmentData>
  processedFinancialData: FinancialData[]
  processedEnrollmentData: EnrollmentData[]
  selectedUniversities: string[]
  setSelectedUniversities: (universities: string[]) => void
  selectedYears: string[]
  setSelectedYears: (years: string[]) => void
  selectedMetric: string
  setSelectedMetric: (metric: string) => void
  loading: boolean
  universities: string[]
  years: number[]
  financialYears: number[]
  enrollmentYears: number[]
  kpis: any
  calculateKPIs: () => any
  filteredFinancialData: FinancialData[]
  filteredEnrollmentData: EnrollmentData[]
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  // Sample data for initial rendering
  const sampleFinancialData: Record<string, FinancialData> = {
    sample: {
      university: "Loading...",
      fiscal_year: 2024,
      government_grants: 0,
      tuition_fees: 0,
      faculty_salaries: 0,
      net_assets: 0,
      total_operational_costs: 0,
      faculty_staff_costs: 0,
      sales_and_services: 0,
      non_government_grants_and_donations: 0,
      investment_income: 0,
      learning_expenses: 0,
      research_expenses: 0,
      facilities_expenses: 0,
      students_expenses: 0,
      community_engagement_expenses: 0,
      administration_expenses: 0,
    },
  }

  const sampleEnrollmentData: Record<string, EnrollmentData> = {
    sample: {
      university: "Loading...",
      academic_year: 2024,
      total_enrollment_headcount: 0,
      domestic_students_headcount: 0,
      international_students_headcount: 0,
      indigenous_students_headcount: 0,
      completion_rate_undergraduate: 0,
      completion_rate_master: 0,
      completion_rate_phd: 0,
    },
  }

  const [financialData, setFinancialData] = useState<Record<string, FinancialData>>(sampleFinancialData)
  const [enrollmentData, setEnrollmentData] = useState<Record<string, EnrollmentData>>(sampleEnrollmentData)
  const [processedFinancialData, setProcessedFinancialData] = useState<FinancialData[]>([])
  const [processedEnrollmentData, setProcessedEnrollmentData] = useState<EnrollmentData[]>([])
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(["all"])
  const [selectedYears, setSelectedYears] = useState<string[]>(["all"])
  const [selectedMetric, setSelectedMetric] = useState<string>("government_grants")
  const [loading, setLoading] = useState<boolean>(true)

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(Math.round(value / 100000000) / 10).toFixed(1)}B`; // Always show 1 decimal
    } else if (value >= 1000000) {
      return `$${(Math.round(value / 100000) / 10).toFixed(1)}M`; // Always show 1 decimal
    } else if (value >= 1000) {
      return `$${(Math.round(value / 100) / 10).toFixed(1)}K`; // Always show 1 decimal
    } else {
      return `$${Math.round(value)}`;
    }
  }

  // Format numbers with K suffix for thousands
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(Math.round(value / 100000) / 10).toFixed(1)}M`; // Always show 1 decimal
    } else if (value >= 1000) {
      return `${(Math.round(value / 100) / 10).toFixed(1)}K`; // Always show 1 decimal
    }
    return Math.round(value).toString();
  };

  // Calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Add this utility function for normalizing university names
  const normalizeUniversityName = (name: string): string => {
    // Convert to lowercase and remove 'the' prefix
    let normalized = name.toLowerCase().trim();
    if (normalized.startsWith('the ')) {
      normalized = normalized.substring(4);
    }
    // Remove spaces and other special characters
    return normalized.replace(/\s+/g, '');
  };

  // Fetch and process both datasets
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Fetch financial data from the Flask API
        const financialResponse = await fetch('http://localhost:5000/api/financial-data')
        if (!financialResponse.ok) {
          throw new Error(`HTTP error! Status: ${financialResponse.status}`)
        }
        
        const financialDataResult = await financialResponse.json()
        setFinancialData(financialDataResult)
        
        // Process the financial data for charts
        const processedFinancial = Object.values(financialDataResult).map((item: any) => ({
          ...item,
          year: item.fiscal_year,
          total_revenue: item.government_grants + 
                        item.tuition_fees + 
                        item.non_government_grants_and_donations + 
                        item.sales_and_services + 
                        item.investment_income,
          total_expenses: item.total_operational_costs,
          normalizedUniversity: normalizeUniversityName(item.university)
        }))
        
        setProcessedFinancialData(processedFinancial)

        // Fetch enrollment data from the Flask API
        const enrollmentResponse = await fetch('http://localhost:5000/api/enrollment-data')
        if (!enrollmentResponse.ok) {
          throw new Error(`HTTP error! Status: ${enrollmentResponse.status}`)
        }
        
        const enrollmentDataResult = await enrollmentResponse.json()
        setEnrollmentData(enrollmentDataResult)
        
        // Process the enrollment data for charts
        const processedEnrollment = Object.values(enrollmentDataResult).map((item: any) => ({
          ...item,
          year: item.academic_year,
          normalizedUniversity: normalizeUniversityName(item.university)
        }))
        
        setProcessedEnrollmentData(processedEnrollment)
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Filter financial data based on selections
  const filteredFinancialData = processedFinancialData.filter((item) => {
    // If "all" is included in selections, don't filter by that criteria
    const filterByUniversity = !selectedUniversities.includes("all");
    const filterByYear = !selectedYears.includes("all");
    
    // Apply filters based on selections
    if (filterByUniversity && !selectedUniversities.includes(item.university)) return false;
    if (filterByYear && !selectedYears.includes(item.fiscal_year.toString())) return false;
    
    return true;
  });

  // Filter enrollment data based on selections
  const filteredEnrollmentData = processedEnrollmentData.filter((item) => {
    // If "all" is included in selections, don't filter by that criteria
    const filterByUniversity = !selectedUniversities.includes("all");
    const filterByYear = !selectedYears.includes("all");
    
    // Apply filters based on selections
    if (filterByUniversity && !selectedUniversities.includes(item.university)) return false;
    if (filterByYear && !selectedYears.includes(item.academic_year.toString())) return false;
    
    return true;
  });

  // Get unique universities and years for filters
  const universities = [...new Set([
    ...processedFinancialData.map((item) => item.university),
    ...processedEnrollmentData.map((item) => item.university)
  ])]

  // Years specific to each dataset
  const financialYears = [...new Set(processedFinancialData.map((item) => item.fiscal_year))].sort((a, b) => b - a);
  const enrollmentYears = [...new Set(processedEnrollmentData.map((item) => item.academic_year))].sort((a, b) => b - a);

  // Common years across all datasets (for overview dashboard)
  const years = financialYears.filter(year => enrollmentYears.includes(year)).sort((a, b) => b - a);

  // Calculate KPI metrics
  const calculateKPIs = () => {
    if (filteredFinancialData.length === 0) return null

    // Get the most recent year's data for each university
    const latestData: Record<string, any[]> = {}

    processedFinancialData.forEach((item) => {
      if (!latestData[item.university]) {
        latestData[item.university] = []
      }
      latestData[item.university].push(item)
    })

    // Sort by year and get the latest
    Object.keys(latestData).forEach((uni) => {
      latestData[uni].sort((a, b) => b.fiscal_year - a.fiscal_year)
    })

    // If specific universities are selected (not "all")
    if (!selectedUniversities.includes("all")) {
      // For multiple selected universities, aggregate their data
      const selectedUnisData = selectedUniversities.flatMap(uni => latestData[uni] || []);
      if (selectedUnisData.length < 2) return null;

      // Group by year for aggregation
      const dataByYear: Record<number, any[]> = {};
      selectedUnisData.forEach(item => {
        if (!dataByYear[item.fiscal_year]) {
          dataByYear[item.fiscal_year] = [];
        }
        dataByYear[item.fiscal_year].push(item);
      });

      // Get the two most recent years
      const yearsList = Object.keys(dataByYear).map(Number).sort((a, b) => b - a);
      const currentYear = yearsList[0];
      const previousYear = yearsList[1];

      if (!currentYear || !previousYear) return null;

      // Aggregate current year data
      const currentYearData = dataByYear[currentYear];
      const currentNetAssets = currentYearData.reduce((sum, item) => sum + item.net_assets, 0);
      const currentTuitionFees = currentYearData.reduce((sum, item) => sum + item.tuition_fees, 0);
      const currentGovGrants = currentYearData.reduce((sum, item) => sum + item.government_grants, 0);

      // Aggregate previous year data
      const previousYearData = dataByYear[previousYear];
      const previousNetAssets = previousYearData.reduce((sum, item) => sum + item.net_assets, 0);
      const previousTuitionFees = previousYearData.reduce((sum, item) => sum + item.tuition_fees, 0);
      const previousGovGrants = previousYearData.reduce((sum, item) => sum + item.government_grants, 0);

      return {
        financial_stability: {
          value: currentNetAssets,
          change: calculatePercentChange(currentNetAssets, previousNetAssets),
        },
        enrollment_domestic: {
          value: currentTuitionFees * 0.6, // Simulated domestic portion
          change: calculatePercentChange(currentTuitionFees * 0.6, previousTuitionFees * 0.6),
        },
        enrollment_intl: {
          value: currentTuitionFees * 0.4, // Simulated international portion
          change: calculatePercentChange(currentTuitionFees * 0.4, previousTuitionFees * 0.4),
        },
        government_funding: {
          value: currentGovGrants,
          change: calculatePercentChange(currentGovGrants, previousGovGrants),
        },
      };
    }

    // If all universities are selected, aggregate the data
    // First, determine the appropriate years array to use based on selected years
    const relevantYears = selectedYears.includes("all") ? years : 
      financialYears.filter(year => selectedYears.includes(year.toString())).sort((a, b) => b - a);
      
    if (relevantYears.length < 2) return null;
    
    const currentYear = relevantYears[0];
    const previousYear = relevantYears[1];

    const aggregatedCurrent = processedFinancialData
      .filter((item) => item.fiscal_year === currentYear)
      .reduce(
        (acc, item) => {
          acc.net_assets += item.net_assets
          acc.tuition_fees += item.tuition_fees
          acc.government_grants += item.government_grants
          return acc
        },
        { net_assets: 0, tuition_fees: 0, government_grants: 0 },
      )

    const aggregatedPrevious = processedFinancialData
      .filter((item) => item.fiscal_year === previousYear)
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

  const value = {
    financialData,
    enrollmentData,
    processedFinancialData,
    processedEnrollmentData,
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    selectedMetric,
    setSelectedMetric,
    loading,
    universities,
    years,
    financialYears,
    enrollmentYears,
    kpis,
    calculateKPIs,
    filteredFinancialData,
    filteredEnrollmentData,
    formatCurrency,
    formatNumber,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
} 