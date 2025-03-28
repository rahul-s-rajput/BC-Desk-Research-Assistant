"use client"

import { useState, useMemo } from "react"
import DashboardLayout from "../../components/layout/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpRight } from "lucide-react"
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
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

// University short names mapping (fixed to avoid duplicates)
const UNIVERSITY_SHORT_NAMES: Record<string, string> = {
  "university of british columbia": "UBC",
  "the university of british columbia": "UBC",
  "simon fraser university": "SFU",
  "university of victoria": "UVic"
};

// Helper function to get university short name
const getUniversityShortName = (university: string): string => {
  const normalizedName = university.toLowerCase().trim();
  return UNIVERSITY_SHORT_NAMES[normalizedName] || university;
};

// Custom tooltip styles
const CustomTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid #ddd',
  padding: '10px',
  borderRadius: '5px',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
  fontSize: '12px'
};

export default function OperationalCostsDashboard() {
  const {
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    formatCurrency,
    universities,
    years,
    kpis,
    filteredFinancialData,
    processedFinancialData,
    financialYears
  } = useDashboard()

  // State for chart views
  const [costsGroupBy, setCostsGroupBy] = useState<'university' | 'year'>('university');
  const [trendMetric, setTrendMetric] = useState<string>("total_operational_costs");

  // Custom tooltip for cost breakdown
  const CostBreakdownTooltip = ({ active, payload, label }: any) => {
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

  // Prepare cost breakdown data by university or year
  const prepareCostBreakdownData = (groupBy: 'university' | 'year') => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const result: Record<string, any> = {};
    
    // Process financial data to extract cost components
    filteredFinancialData.forEach((item) => {
      const key = groupBy === 'university' ? item.university : item.fiscal_year.toString();
      
      // Skip if key is not defined
      if (!key) return;
      
      if (!result[key]) {
        result[key] = {
          name: key,
          shortName: groupBy === 'university' ? getUniversityShortName(item.university) : key,
          year: groupBy === 'year' ? item.fiscal_year : 0,
          "Faculty & Staff Costs": 0,
          "Learning Expenses": 0,
          "Research Expenses": 0,
          "Facilities Expenses": 0,
          "Students Expenses": 0,
          "Administration Expenses": 0,
          count: 0
        };
      }
      
      // Accumulate cost components
      result[key]["Faculty & Staff Costs"] += item.faculty_staff_costs || 0;
      result[key]["Learning Expenses"] += item.learning_expenses || 0;
      result[key]["Research Expenses"] += item.research_expenses || 0;
      result[key]["Facilities Expenses"] += item.facilities_expenses || 0;
      result[key]["Students Expenses"] += item.students_expenses || 0;
      result[key]["Administration Expenses"] += item.administration_expenses || 0;
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

  // Prepare cost trends data
  const prepareCostTrendsData = () => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    const data: any[] = [];
    
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
          total_operational_costs: 0,
          faculty_staff_costs: 0,
          learning_expenses: 0,
          research_expenses: 0,
          facilities_expenses: 0,
          students_expenses: 0
        };
      }
      
      // Accumulate values
      groupedData[uniName][year].total_operational_costs += item.total_operational_costs || 0;
      groupedData[uniName][year].faculty_staff_costs += item.faculty_staff_costs || 0;
      groupedData[uniName][year].learning_expenses += item.learning_expenses || 0;
      groupedData[uniName][year].research_expenses += item.research_expenses || 0;
      groupedData[uniName][year].facilities_expenses += item.facilities_expenses || 0;
      groupedData[uniName][year].students_expenses += item.students_expenses || 0;
    });
    
    // Flatten the data
    Object.keys(groupedData).forEach((uni) => {
      Object.keys(groupedData[uni]).forEach((yearStr) => {
        data.push(groupedData[uni][parseInt(yearStr)]);
      });
    });
    
    return data.sort((a, b) => a.year - b.year);
  };

  // Prepare per-student costs data
  const preparePerStudentCostsData = () => {
    if (filteredFinancialData.length === 0) {
      return [];
    }
    
    // Get the latest year for each university
    const latestYearByUni: Record<string, number> = {};
    filteredFinancialData.forEach((item) => {
      const uniName = item.university;
      const year = item.fiscal_year;
      
      if (!latestYearByUni[uniName] || year > latestYearByUni[uniName]) {
        latestYearByUni[uniName] = year;
      }
    });
    
    const result: Record<string, any> = {};
    
    // Process data for the latest year only
    filteredFinancialData.forEach((item) => {
      const uniName = item.university;
      const year = item.fiscal_year;
      
      // Only include latest year for each university
      if (year !== latestYearByUni[uniName]) {
        return;
      }
      
      if (!result[uniName]) {
        result[uniName] = {
          name: uniName,
          shortName: getUniversityShortName(uniName),
          "Learning": 0,
          "Research": 0,
          "Facilities": 0,
          "Student Services": 0,
          "Administration": 0,
          total_costs: 0,
          student_count: 0,
        };
      }
      
      // Add values (we'll calculate per-student later)
      result[uniName]["Learning"] += item.learning_expenses || 0;
      result[uniName]["Research"] += item.research_expenses || 0;
      result[uniName]["Facilities"] += item.facilities_expenses || 0;
      result[uniName]["Student Services"] += item.students_expenses || 0;
      result[uniName]["Administration"] += item.administration_expenses || 0;
      result[uniName].total_costs += item.total_operational_costs || 0;
      
      // Estimate student count based on tuition fees
      // In a real app, we would use actual enrollment data
      const avgTuitionPerStudent = 15000;
      const estimatedStudents = Math.round(item.tuition_fees / avgTuitionPerStudent);
      result[uniName].student_count += estimatedStudents;
    });
    
    // Calculate per-student costs
    Object.keys(result).forEach(uni => {
      if (result[uni].student_count > 0) {
        result[uni]["Learning"] = result[uni]["Learning"] / result[uni].student_count;
        result[uni]["Research"] = result[uni]["Research"] / result[uni].student_count;
        result[uni]["Facilities"] = result[uni]["Facilities"] / result[uni].student_count;
        result[uni]["Student Services"] = result[uni]["Student Services"] / result[uni].student_count;
        result[uni]["Administration"] = result[uni]["Administration"] / result[uni].student_count;
        result[uni]["Total Cost per Student"] = result[uni].total_costs / result[uni].student_count;
      }
    });
    
    // Convert to array and sort alphabetically
    return Object.values(result).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Format metric name for display
  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate operational costs KPIs from the actual data
  const operationalKPIs = useMemo(() => {
    // If no data is loaded yet, return empty metrics
    if (filteredFinancialData.length === 0) {
      return {
        totalCosts: { value: 0, change: 0, label: "Total Operational Costs" },
        staffCosts: { value: 0, change: 0, label: "Faculty & Staff Costs" },
        perStudent: { value: 0, change: 0, label: "Cost per Student" },
        efficiencyRatio: { value: 0, change: 0, label: "Cost Efficiency Ratio" }
      };
    }

    // Sort by year, descending
    const sortedData = [...filteredFinancialData].sort((a, b) => b.fiscal_year - a.fiscal_year);
    
    // Group by year
    const dataByYear: Record<number, any[]> = {};
    sortedData.forEach(item => {
      if (!dataByYear[item.fiscal_year]) {
        dataByYear[item.fiscal_year] = [];
      }
      dataByYear[item.fiscal_year].push(item);
    });

    // Get data for current and previous year using financial years
    const yearsList = financialYears;
    const currentYear = yearsList[0];
    const previousYear = yearsList[1];

    if (!currentYear || !previousYear) {
      return {
        totalCosts: { value: 0, change: 0, label: "Total Operational Costs" },
        staffCosts: { value: 0, change: 0, label: "Faculty & Staff Costs" },
        perStudent: { value: 0, change: 0, label: "Cost per Student" },
        efficiencyRatio: { value: 0, change: 0, label: "Cost Efficiency Ratio" }
      };
    }

    // Calculate current year metrics
    const currentYearData = dataByYear[currentYear];
    const currentTotalCosts = currentYearData.reduce((sum, item) => sum + (item.total_operational_costs || 0), 0);
    const currentStaffCosts = currentYearData.reduce((sum, item) => sum + (item.faculty_staff_costs || 0), 0);
    const currentTuitionFees = currentYearData.reduce((sum, item) => sum + (item.tuition_fees || 0), 0);
    const currentRevenue = currentYearData.reduce((sum, item) => 
      sum + (item.government_grants || 0) + (item.tuition_fees || 0) + 
      (item.non_government_grants_and_donations || 0) + (item.sales_and_services || 0) + 
      (item.investment_income || 0), 0);
    
    // Estimate student count based on tuition fees
    const avgTuitionPerStudent = 15000;
    const currentStudentCount = Math.round(currentTuitionFees / avgTuitionPerStudent);
    const currentPerStudent = currentStudentCount > 0 ? currentTotalCosts / currentStudentCount : 0;
    const currentEfficiencyRatio = currentTotalCosts > 0 ? currentRevenue / currentTotalCosts : 0;
    
    // Calculate previous year metrics
    const previousYearData = dataByYear[previousYear];
    const previousTotalCosts = previousYearData.reduce((sum, item) => sum + (item.total_operational_costs || 0), 0);
    const previousStaffCosts = previousYearData.reduce((sum, item) => sum + (item.faculty_staff_costs || 0), 0);
    const previousTuitionFees = previousYearData.reduce((sum, item) => sum + (item.tuition_fees || 0), 0);
    const previousRevenue = previousYearData.reduce((sum, item) => 
      sum + (item.government_grants || 0) + (item.tuition_fees || 0) + 
      (item.non_government_grants_and_donations || 0) + (item.sales_and_services || 0) + 
      (item.investment_income || 0), 0);
    
    const previousStudentCount = Math.round(previousTuitionFees / avgTuitionPerStudent);
    const previousPerStudent = previousStudentCount > 0 ? previousTotalCosts / previousStudentCount : 0;
    const previousEfficiencyRatio = previousTotalCosts > 0 ? previousRevenue / previousTotalCosts : 0;
    
    // Calculate percentage changes
    const totalCostsChange = previousTotalCosts > 0 ? ((currentTotalCosts - previousTotalCosts) / previousTotalCosts) * 100 : 0;
    const staffCostsChange = previousStaffCosts > 0 ? ((currentStaffCosts - previousStaffCosts) / previousStaffCosts) * 100 : 0;
    const perStudentChange = previousPerStudent > 0 ? ((currentPerStudent - previousPerStudent) / previousPerStudent) * 100 : 0;
    const efficiencyRatioChange = previousEfficiencyRatio > 0 ? ((currentEfficiencyRatio - previousEfficiencyRatio) / previousEfficiencyRatio) * 100 : 0;

    return {
      totalCosts: {
        value: currentTotalCosts,
        change: totalCostsChange,
        label: "Total Operational Costs"
      },
      staffCosts: {
        value: currentStaffCosts,
        change: staffCostsChange,
        label: "Faculty & Staff Costs"
      },
      perStudent: {
        value: currentPerStudent,
        change: perStudentChange,
        label: "Cost per Student"
      },
      efficiencyRatio: {
        value: currentEfficiencyRatio,
        change: efficiencyRatioChange,
        label: "Cost Efficiency Ratio"
      }
    };
  }, [filteredFinancialData, financialYears]);

  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="operational-costs"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      {/* Operational Costs KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Total Operational Costs</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">{formatCurrency(operationalKPIs.totalCosts.value)}</div>
            <div className="text-sm text-muted-foreground">annual</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className={`w-4 h-4 ${operationalKPIs.totalCosts.change >= 0 ? "text-red-500" : "text-green-500"}`} />
            <span className={`${operationalKPIs.totalCosts.change >= 0 ? "text-red-500" : "text-green-500"} font-medium`}>
              {Math.abs(operationalKPIs.totalCosts.change).toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Cost per Student</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">{formatCurrency(operationalKPIs.perStudent.value)}</div>
            <div className="text-sm text-muted-foreground">annual</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className={`w-4 h-4 ${operationalKPIs.perStudent.change >= 0 ? "text-red-500" : "text-green-500"}`} />
            <span className={`${operationalKPIs.perStudent.change >= 0 ? "text-red-500" : "text-green-500"} font-medium`}>
              {Math.abs(operationalKPIs.perStudent.change).toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Faculty & Staff Costs</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">{formatCurrency(operationalKPIs.staffCosts.value)}</div>
            <div className="text-sm text-muted-foreground">annual</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className={`w-4 h-4 ${operationalKPIs.staffCosts.change >= 0 ? "text-red-500" : "text-green-500"}`} />
            <span className={`${operationalKPIs.staffCosts.change >= 0 ? "text-red-500" : "text-green-500"} font-medium`}>
              {Math.abs(operationalKPIs.staffCosts.change).toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Cost Efficiency Ratio</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">{operationalKPIs.efficiencyRatio.value.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">ratio</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className={`w-4 h-4 ${operationalKPIs.efficiencyRatio.change >= 0 ? "text-green-500" : "text-red-500"}`} />
            <span className={`${operationalKPIs.efficiencyRatio.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}>
              {Math.abs(operationalKPIs.efficiencyRatio.change).toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last fiscal year</div>
        </div>
      </div>

      {/* Cost Breakdown Chart - Priority visualization at the top */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Operational Cost Breakdown</CardTitle>
            <CardDescription>Analysis of operational costs by category</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select value={costsGroupBy} onValueChange={(value: 'university' | 'year') => setCostsGroupBy(value)}>
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
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareCostBreakdownData(costsGroupBy)}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={costsGroupBy === 'university' ? "shortName" : "year"}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CostBreakdownTooltip />} />
                <Legend />
                <Bar dataKey="Faculty & Staff Costs" stackId="a" fill="#0088FE" />
                <Bar dataKey="Learning Expenses" stackId="a" fill="#00C49F" />
                <Bar dataKey="Research Expenses" stackId="a" fill="#FFBB28" />
                <Bar dataKey="Facilities Expenses" stackId="a" fill="#FF8042" />
                <Bar dataKey="Students Expenses" stackId="a" fill="#8884d8" />
                <Bar dataKey="Administration Expenses" stackId="a" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cost Trends Chart - Second priority visualization */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cost Trends</CardTitle>
            <CardDescription>Year-over-year operational cost trends</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Metric:</span>
            <Select value={trendMetric} onValueChange={setTrendMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_operational_costs">Total Operational Costs</SelectItem>
                <SelectItem value="faculty_staff_costs">Faculty & Staff Costs</SelectItem>
                <SelectItem value="learning_expenses">Learning Expenses</SelectItem>
                <SelectItem value="research_expenses">Research Expenses</SelectItem>
                <SelectItem value="facilities_expenses">Facilities Expenses</SelectItem>
                <SelectItem value="students_expenses">Students Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  type="number" 
                  domain={['dataMin', 'dataMax']}
                  label={{ value: 'Fiscal Year', position: 'insideBottomRight', offset: -10 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  label={{ value: formatMetricName(trendMetric), angle: -90, position: 'insideLeft' }}
                />
                <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                <Legend />
                {
                  // Create a line for each university
                  [...new Set(prepareCostTrendsData().map(item => item.university))].map((uni, index) => {
                    const uniData = prepareCostTrendsData().filter(item => item.university === uni);
                    
                    return (
                      <Line 
                        key={uni as string}
                        type="monotone" 
                        data={uniData}
                        dataKey={trendMetric} 
                        name={uni as string} 
                        stroke={COLORS[index % COLORS.length]} 
                        activeDot={{ r: 8 }} 
                        connectNulls
                      />
                    );
                  })
                }
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-Student Costs Chart - Third priority visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cost per Student</CardTitle>
          <CardDescription>Breakdown of per-student costs by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={preparePerStudentCostsData()}
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
                <Tooltip formatter={(value) => [formatCurrency(value as number), "Cost per Student"]} />
                <Legend />
                <Bar dataKey="Learning" stackId="a" fill="#0088FE" />
                <Bar dataKey="Research" stackId="a" fill="#00C49F" />
                <Bar dataKey="Facilities" stackId="a" fill="#FFBB28" />
                <Bar dataKey="Student Services" stackId="a" fill="#FF8042" />
                <Bar dataKey="Administration" stackId="a" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Total Cost Comparison - Fourth priority visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Total Cost Comparison</CardTitle>
          <CardDescription>Comparison of total operational costs between universities (latest data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareCostBreakdownData('university')}
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
                <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                <Legend />
                <Bar 
                  dataKey={(entry) => {
                    // Calculate total for each university
                    return (
                      entry["Faculty & Staff Costs"] +
                      entry["Learning Expenses"] +
                      entry["Research Expenses"] +
                      entry["Facilities Expenses"] +
                      entry["Students Expenses"] +
                      entry["Administration Expenses"]
                    );
                  }} 
                  name="Total Operational Costs" 
                  fill="#0088FE" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
} 