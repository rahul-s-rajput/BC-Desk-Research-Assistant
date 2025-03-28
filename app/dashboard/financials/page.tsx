"use client"

import { useState, useMemo } from "react"
import DashboardLayout from "../../components/layout/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react"
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
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"

// Define types for the financial data items
interface FinancialDataItem {
  university: string;
  fiscal_year: number;
  government_grants: number;
  tuition_fees: number;
  faculty_salaries: number;
  net_assets: number;
  total_operational_costs: number;
  faculty_staff_costs: number;
  sales_and_services: number;
  non_government_grants_and_donations: number;
  investment_income: number;
  learning_expenses: number;
  research_expenses: number;
  facilities_expenses: number;
  students_expenses: number;
  community_engagement_expenses: number;
  administration_expenses: number;
  [key: string]: string | number; // This allows for dynamic property access
}

interface UniversityGroupedData {
  name: string;
  shortName: string;
  university: string;
  "Government Grants": number;
  "Tuition Fees": number;
  "Non-Gov Grants & Donations": number;
  "Sales & Services": number;
  "Investment Income": number;
  count: number;
}

interface ExpenseGroupedData {
  name: string;
  shortName: string;
  university: string;
  "Total Operational Costs": number;
  "Learning Expenses": number;
  "Research Expenses": number;
  "Facilities Expenses": number;
  "Students Expenses": number;
  count: number;
}

interface YearlyRevenueData {
  name: string;
  year: number;
  "Government Grants": number;
  "Tuition Fees": number;
  "Non-Gov Grants & Donations": number;
  "Sales & Services": number;
  "Investment Income": number;
  count: number;
}

interface YearlyExpenseData {
  name: string;
  year: number;
  "Total Operational Costs": number;
  "Learning Expenses": number;
  "Research Expenses": number;
  "Facilities Expenses": number;
  "Students Expenses": number;
  count: number;
}

interface TrendDataItem {
  university: string;
  year: number;
  [key: string]: string | number;
}

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

// University short names mapping (fixed to avoid duplicates)
const UNIVERSITY_SHORT_NAMES: Record<string, string> = {
  "university of british columbia": "UBC",
  "the university of british columbia": "UBC",
  "simon fraser university": "SFU", 
  "university of victoria": "UVic",
  "mcgill university": "McGill"
};

// Helper function to get university short name
const getUniversityShortName = (university: string): string => {
  const normalizedName = university.toLowerCase().trim();
  return UNIVERSITY_SHORT_NAMES[normalizedName] || university;
};

// Calculate percentage change
const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Helper for type signature of chart data
interface ChartData {
  [key: string]: any;
}

// Custom tooltip styles
const CustomTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid #ddd',
  padding: '10px',
  borderRadius: '5px',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
  fontSize: '12px'
};

export default function FinancialsDashboard() {
  const {
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    selectedMetric,
    setSelectedMetric,
    universities,
    years,
    kpis,
    formatCurrency,
    filteredFinancialData,
    processedFinancialData,
  } = useDashboard()

  // Custom tooltip for the trend chart
  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Get previous year data if available
      const currentYear = Number(label);
      const prevYear = currentYear - 1;
      
      // Find data from previous year for each university
      const prevYearData: Record<string, number> = {};
      
      if (payload.length > 0) {
        payload.forEach((entry: any) => {
          const uniName = entry.name;
          
          // Find the same university's data from previous year
          const prevData = prepareTrendData().find(
            (item: any) => item.university === uniName && item.year === prevYear
          );
          
          if (prevData && typeof prevData[selectedMetric] === 'number') {
            prevYearData[uniName] = prevData[selectedMetric] as number;
          }
        });
      }
      
      // Format metric name for display
      const formatMetricName = (metric: string) => {
        return metric
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };
      
      return (
        <div style={CustomTooltipStyle} className="min-w-[220px]">
          <div className="border-b pb-2 mb-2">
            <p className="font-semibold text-sm">Fiscal Year: {label}</p>
            <p className="text-xs text-gray-500">{formatMetricName(selectedMetric)}</p>
          </div>
          
          {payload.map((entry: any, index: number) => {
            const currentValue = entry.value;
            const previousValue = prevYearData[entry.name];
            const hasChange = previousValue !== undefined;
            const changePercent = hasChange 
              ? ((currentValue - previousValue) / previousValue) * 100 
              : 0;
            
            return (
              <div key={`item-${index}`} className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 mr-2"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs font-medium">{entry.name}</span>
                </div>
                <div className="text-xs">
                  <span className="font-semibold">{formatCurrency(currentValue)}</span>
                  {hasChange && (
                    <span 
                      className={`ml-2 ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the stacked bar chart
  const StackedBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CustomTooltipStyle}>
          <div className="border-b pb-2 mb-2">
            <p className="font-semibold text-sm">{label}</p>
          </div>
          
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 mr-2"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-xs">{entry.name}</span>
              </div>
              <span className="text-xs font-semibold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          
          {/* Calculate and show total */}
          <div className="border-t mt-2 pt-1 flex justify-between">
            <span className="text-xs font-medium">Total</span>
            <span className="text-xs font-bold">
              {formatCurrency(payload.reduce((sum: number, entry: any) => sum + entry.value, 0))}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the comparison chart
  const ComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CustomTooltipStyle}>
          <div className="border-b pb-2 mb-2">
            <p className="font-semibold text-sm">{label}</p>
          </div>
          
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 mr-2"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-xs">{entry.name}</span>
              </div>
              <span className="text-xs font-semibold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare revenue data grouped by university or year
  const prepareRevenueData = (groupBy: 'university' | 'year') => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const result: Record<string, ChartData> = {};
    
    // Process financial data to extract revenue components
    filteredFinancialData.forEach((item) => {
      const key = groupBy === 'university' ? item.university : item.fiscal_year.toString();
      
      // Skip if key is not defined
      if (!key) return;
      
      if (!result[key]) {
        result[key] = {
          name: key,
          shortName: groupBy === 'university' ? getUniversityShortName(item.university) : key,
          university: groupBy === 'university' ? item.university : '',
          year: groupBy === 'year' ? item.fiscal_year : 0,
          "Government Grants": 0,
          "Tuition Fees": 0,
          "Non-Gov Grants & Donations": 0,
          "Sales & Services": 0,
          "Investment Income": 0,
          count: 0
        };
      }
      
      // Accumulate revenue components
      result[key]["Government Grants"] += item.government_grants || 0;
      result[key]["Tuition Fees"] += item.tuition_fees || 0;
      result[key]["Non-Gov Grants & Donations"] += item.non_government_grants_and_donations || 0;
      result[key]["Sales & Services"] += item.sales_and_services || 0;
      result[key]["Investment Income"] += item.investment_income || 0;
      result[key].count++;
    });
    
    // Convert to array and sort
    let dataArray = Object.values(result);
    
    if (groupBy === 'university') {
      // Sort universities alphabetically
      dataArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (groupBy === 'year') {
      // Sort years ascending
      dataArray.sort((a, b) => a.year - b.year);
    }
    
    return dataArray;
  };

  // Prepare expense data grouped by university or year
  const prepareExpenseData = (groupBy: 'university' | 'year') => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const result: Record<string, ChartData> = {};
    
    // Process financial data to extract expense components
    filteredFinancialData.forEach((item) => {
      const key = groupBy === 'university' ? item.university : item.fiscal_year.toString();
      
      // Skip if key is not defined
      if (!key) return;
      
      if (!result[key]) {
        result[key] = {
          name: key,
          shortName: groupBy === 'university' ? getUniversityShortName(item.university) : key,
          university: groupBy === 'university' ? item.university : '',
          year: groupBy === 'year' ? item.fiscal_year : 0,
          "Total Operational Costs": 0,
          "Learning Expenses": 0,
          "Research Expenses": 0,
          "Facilities Expenses": 0,
          "Students Expenses": 0,
          count: 0
        };
      }
      
      // Accumulate expense components
      result[key]["Total Operational Costs"] += item.total_operational_costs || 0;
      result[key]["Learning Expenses"] += item.learning_expenses || 0;
      result[key]["Research Expenses"] += item.research_expenses || 0;
      result[key]["Facilities Expenses"] += item.facilities_expenses || 0;
      result[key]["Students Expenses"] += item.students_expenses || 0;
      result[key].count++;
    });
    
    // Convert to array and sort
    let dataArray = Object.values(result);
    
    if (groupBy === 'university') {
      // Sort universities alphabetically
      dataArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (groupBy === 'year') {
      // Sort years ascending
      dataArray.sort((a, b) => a.year - b.year);
    }
    
    return dataArray;
  };

  // Prepare trend data for metrics over time by university
  const prepareTrendData = () => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const data: TrendDataItem[] = [];
    
    // Group data by university and year
    const groupedData: Record<string, Record<number, any>> = {};
    
    filteredFinancialData.forEach((item) => {
      const uniName = item.university;
      const year = item.fiscal_year;
      
      if (!groupedData[uniName]) {
        groupedData[uniName] = {};
      }
      
      if (!groupedData[uniName][year]) {
        groupedData[uniName][year] = {
          university: uniName,
          year: year,
          government_grants: 0,
          tuition_fees: 0,
          net_assets: 0,
          total_operational_costs: 0
        };
      }
      
      // Accumulate values
      groupedData[uniName][year].government_grants += item.government_grants || 0;
      groupedData[uniName][year].tuition_fees += item.tuition_fees || 0;
      groupedData[uniName][year].net_assets += item.net_assets || 0;
      groupedData[uniName][year].total_operational_costs += item.total_operational_costs || 0;
    });
    
    // Flatten the data
    Object.keys(groupedData).forEach((uni) => {
      Object.keys(groupedData[uni]).forEach((yearStr) => {
        data.push(groupedData[uni][parseInt(yearStr)]);
      });
    });
    
    return data.sort((a, b) => (a.year as number) - (b.year as number));
  };

  // Prepare comparison data for universities
  const prepareComparisonData = () => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const result: Record<string, any> = {};
    
    // Get the latest year for each university
    const latestYearByUni: Record<string, number> = {};
    
    filteredFinancialData.forEach((item) => {
      const uniName = item.university;
      const year = item.fiscal_year;
      
      if (!latestYearByUni[uniName] || year > latestYearByUni[uniName]) {
        latestYearByUni[uniName] = year;
      }
    });
    
    // Process financial data for comparison
    filteredFinancialData.forEach((item) => {
      const uniName = item.university;
      const year = item.fiscal_year;
      
      // Only include the latest year's data for each university
      if (year !== latestYearByUni[uniName]) {
        return;
      }
      
      if (!result[uniName]) {
        result[uniName] = {
          name: uniName,
          shortName: getUniversityShortName(uniName),
          "Revenue": 0,
          "Expenses": 0,
          "Net Assets": 0,
          "Faculty Salaries": 0
        };
      }
      
      // Calculate total revenue
      const revenue = 
        (item.government_grants || 0) + 
        (item.tuition_fees || 0) + 
        (item.non_government_grants_and_donations || 0) + 
        (item.sales_and_services || 0) + 
        (item.investment_income || 0);
      
      // Accumulate values
      result[uniName]["Revenue"] += revenue;
      result[uniName]["Expenses"] += item.total_operational_costs || 0;
      result[uniName]["Net Assets"] += item.net_assets || 0;
      result[uniName]["Faculty Salaries"] += item.faculty_salaries || 0;
    });
    
    // Convert to array and sort alphabetically
    return Object.values(result).sort((a, b) => a.name.localeCompare(b.name));
  };

  // State for chart tabs and metric selection
  const [revenueGroupBy, setRevenueGroupBy] = useState<'university' | 'year'>('university');
  const [expenseGroupBy, setExpenseGroupBy] = useState<'university' | 'year'>('university');
  
  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="financials"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      {/* KPI Cards Section */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Revenue KPI */}
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Total Revenue</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {formatCurrency(
                filteredFinancialData.reduce(
                  (sum, item) => 
                    sum + 
                    (item.government_grants || 0) + 
                    (item.tuition_fees || 0) + 
                    (item.non_government_grants_and_donations || 0) + 
                    (item.sales_and_services || 0) + 
                    (item.investment_income || 0), 
                  0
                )
              )}
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          
          {(() => {
            // Calculate current year and previous year total revenue
            const years = [...new Set(filteredFinancialData.map(item => item.fiscal_year))].sort((a, b) => b - a);
            const currentYear = years[0] || 0;
            const prevYear = years[1] || 0;
            
            const currentYearData = filteredFinancialData.filter(item => item.fiscal_year === currentYear);
            const prevYearData = filteredFinancialData.filter(item => item.fiscal_year === prevYear);
            
            const currentRevenue = currentYearData.reduce(
              (sum, item) => 
                sum + 
                (item.government_grants || 0) + 
                (item.tuition_fees || 0) + 
                (item.non_government_grants_and_donations || 0) + 
                (item.sales_and_services || 0) + 
                (item.investment_income || 0), 
              0
            );
            
            const prevRevenue = prevYearData.reduce(
              (sum, item) => 
                sum + 
                (item.government_grants || 0) + 
                (item.tuition_fees || 0) + 
                (item.non_government_grants_and_donations || 0) + 
                (item.sales_and_services || 0) + 
                (item.investment_income || 0), 
              0
            );
            
            const change = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
            
            return (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight
                    className={`w-4 h-4 ${change >= 0 ? "text-green-500" : "text-red-500"}`}
                  />
                  <span
                    className={`${change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">LY</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
              </>
            );
          })()}
        </div>

        {/* Total Expenses KPI */}
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Total Expenses</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {formatCurrency(
                filteredFinancialData.reduce(
                  (sum, item) => sum + (item.total_operational_costs || 0),
                  0
                )
              )}
            </div>
            <div className="text-sm text-muted-foreground">Operational</div>
          </div>
          
          {(() => {
            // Calculate current year and previous year total expenses
            const years = [...new Set(filteredFinancialData.map(item => item.fiscal_year))].sort((a, b) => b - a);
            const currentYear = years[0] || 0;
            const prevYear = years[1] || 0;
            
            const currentYearData = filteredFinancialData.filter(item => item.fiscal_year === currentYear);
            const prevYearData = filteredFinancialData.filter(item => item.fiscal_year === prevYear);
            
            const currentExpenses = currentYearData.reduce(
              (sum, item) => sum + (item.total_operational_costs || 0),
              0
            );
            
            const prevExpenses = prevYearData.reduce(
              (sum, item) => sum + (item.total_operational_costs || 0),
              0
            );
            
            const change = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
            
            return (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight
                    className={`w-4 h-4 ${change >= 0 ? "text-red-500" : "text-green-500"}`}
                  />
                  <span
                    className={`${change >= 0 ? "text-red-500" : "text-green-500"} font-medium`}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">LY</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
              </>
            );
          })()}
        </div>

        {/* Net Assets KPI */}
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Net Assets</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {formatCurrency(
                filteredFinancialData.reduce(
                  (sum, item) => sum + (item.net_assets || 0),
                  0
                )
              )}
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          
          {(() => {
            // Calculate current year and previous year net assets
            const years = [...new Set(filteredFinancialData.map(item => item.fiscal_year))].sort((a, b) => b - a);
            const currentYear = years[0] || 0;
            const prevYear = years[1] || 0;
            
            const currentYearData = filteredFinancialData.filter(item => item.fiscal_year === currentYear);
            const prevYearData = filteredFinancialData.filter(item => item.fiscal_year === prevYear);
            
            const currentAssets = currentYearData.reduce(
              (sum, item) => sum + (item.net_assets || 0),
              0
            );
            
            const prevAssets = prevYearData.reduce(
              (sum, item) => sum + (item.net_assets || 0),
              0
            );
            
            const change = prevAssets > 0 ? ((currentAssets - prevAssets) / prevAssets) * 100 : 0;
            
            return (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight
                    className={`w-4 h-4 ${change >= 0 ? "text-green-500" : "text-red-500"}`}
                  />
                  <span
                    className={`${change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">LY</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
              </>
            );
          })()}
        </div>

        {/* Faculty Costs KPI */}
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Faculty Costs</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">
              {formatCurrency(
                filteredFinancialData.reduce(
                  (sum, item) => sum + (item.faculty_salaries || 0),
                  0
                )
              )}
            </div>
            <div className="text-sm text-muted-foreground">Salaries</div>
          </div>
          
          {(() => {
            // Calculate current year and previous year faculty costs
            const years = [...new Set(filteredFinancialData.map(item => item.fiscal_year))].sort((a, b) => b - a);
            const currentYear = years[0] || 0;
            const prevYear = years[1] || 0;
            
            const currentYearData = filteredFinancialData.filter(item => item.fiscal_year === currentYear);
            const prevYearData = filteredFinancialData.filter(item => item.fiscal_year === prevYear);
            
            const currentCosts = currentYearData.reduce(
              (sum, item) => sum + (item.faculty_salaries || 0),
              0
            );
            
            const prevCosts = prevYearData.reduce(
              (sum, item) => sum + (item.faculty_salaries || 0),
              0
            );
            
            const change = prevCosts > 0 ? ((currentCosts - prevCosts) / prevCosts) * 100 : 0;
            
            return (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight
                    className={`w-4 h-4 ${change >= 0 ? "text-red-500" : "text-green-500"}`}
                  />
                  <span
                    className={`${change >= 0 ? "text-red-500" : "text-green-500"} font-medium`}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">LY</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Financial Trends Chart - Priority visualization at the top (full width) */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Financial Metrics Trends</CardTitle>
            <CardDescription>Track key financial metrics over time</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Metric:</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="government_grants">Government Grants</SelectItem>
                <SelectItem value="tuition_fees">Tuition Fees</SelectItem>
                <SelectItem value="net_assets">Net Assets</SelectItem>
                <SelectItem value="total_operational_costs">Operational Costs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareTrendData()}
                margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  tickFormatter={(value) => value.toString()}
                  label={{ value: 'Fiscal Year', position: 'insideBottomRight', offset: -10 }}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<TrendTooltip />} />
                <Legend />
                {
                  // Create a line for each unique university
                  [...new Set(prepareTrendData().map(item => item.university))].map((uni, index) => (
                    <Line
                      key={uni as string}
                      type="monotone"
                      dataKey={selectedMetric}
                      data={prepareTrendData().filter(item => item.university === uni)}
                      name={uni as string}
                      stroke={COLORS[index % COLORS.length]}
                      activeDot={{ r: 8 }}
                      connectNulls
                    />
                  ))
                }
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Grid layout for Revenue and Expense Analysis (2 charts per row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Revenue Analysis */}
        <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Analysis</CardTitle>
            <CardDescription>Breakdown of revenue sources</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select value={revenueGroupBy} onValueChange={(value: 'university' | 'year') => setRevenueGroupBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
            <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareRevenueData(revenueGroupBy)}
                  margin={{ top: 20, right: 20, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={revenueGroupBy === 'university' ? "shortName" : "year"} 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<StackedBarTooltip />} />
                <Legend />
                <Bar dataKey="Government Grants" stackId="a" fill="#0088FE" />
                <Bar dataKey="Tuition Fees" stackId="a" fill="#00C49F" />
                <Bar dataKey="Non-Gov Grants & Donations" stackId="a" fill="#FFBB28" />
                <Bar dataKey="Sales & Services" stackId="a" fill="#FF8042" />
                <Bar dataKey="Investment Income" stackId="a" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

        {/* Expenses Analysis */}
        <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expenses Analysis</CardTitle>
            <CardDescription>Breakdown of expense categories</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select value={expenseGroupBy} onValueChange={(value: 'university' | 'year') => setExpenseGroupBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
            <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareExpenseData(expenseGroupBy)}
                  margin={{ top: 20, right: 20, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={expenseGroupBy === 'university' ? "shortName" : "year"} 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<StackedBarTooltip />} />
                <Legend />
                <Bar dataKey="Learning Expenses" stackId="a" fill="#0088FE" />
                <Bar dataKey="Research Expenses" stackId="a" fill="#00C49F" />
                <Bar dataKey="Facilities Expenses" stackId="a" fill="#FFBB28" />
                <Bar dataKey="Students Expenses" stackId="a" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Secondary Analysis Tabs (University Comparison and Revenue/Expense Ratio) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Advanced Financial Analysis</CardTitle>
          <CardDescription>Detailed financial performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="comparison">
            <TabsList className="mb-4">
              <TabsTrigger value="comparison">University Comparison</TabsTrigger>
              <TabsTrigger value="ratio">Revenue/Expense Ratio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="comparison">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={prepareComparisonData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<ComparisonTooltip />} />
                <Legend />
                <Bar dataKey="Revenue" fill="#0088FE" />
                <Bar dataKey="Expenses" fill="#FF8042" />
                <Line dataKey="Net Assets" stroke="#8884d8" strokeWidth={2} dot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
            </TabsContent>
            
            <TabsContent value="ratio">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  label={{ value: 'Fiscal Year', position: 'insideBottomRight', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Ratio', angle: -90, position: 'insideLeft' }}
                  domain={[0.7, 1.3]}
                />
                <Tooltip />
                <Legend />
                {
                  // Create a line for each unique university showing revenue/expense ratio
                  [...new Set(prepareTrendData().map(item => item.university))].map((uni, index) => {
                    // Generate data with calculated ratio
                    const uniData = prepareTrendData()
                      .filter(item => item.university === uni)
                      .map(item => {
                        const revenue = 
                          (item.government_grants as number) + 
                          (item.tuition_fees as number) + 
                          (item.non_government_grants_and_donations as number || 0) + 
                          (item.sales_and_services as number || 0) + 
                          (item.investment_income as number || 0);
                        
                        const expenses = item.total_operational_costs as number;
                        
                        return {
                          year: item.year,
                          ratio: expenses > 0 ? revenue / expenses : 0
                        };
                      });
                      
                    return (
                      <Line
                        key={uni as string}
                        type="monotone"
                        data={uniData}
                        dataKey="ratio"
                        name={uni as string}
                        stroke={COLORS[index % COLORS.length]}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                    );
                  })
                }
                {/* Add reference line at ratio=1 */}
                <Line 
                  dataKey={() => 1} 
                  stroke="#888" 
                  strokeDasharray="5 5" 
                  name="Break Even" 
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
} 