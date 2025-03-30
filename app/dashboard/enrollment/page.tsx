"use client"

import { useState, useMemo } from "react"
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react"
import DashboardLayout from "../../components/layout/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ScatterChart,
  Scatter,
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
  "university of victoria": "UVic",
  "simon fraser university": "SFU"
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

// Custom tooltip styles
const CustomTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid #ddd',
  padding: '10px',
  borderRadius: '5px',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
  fontSize: '12px'
};

export default function EnrollmentDashboard() {
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
    processedEnrollmentData,
    filteredEnrollmentData,
    enrollmentYears
  } = useDashboard()

  // State for grouping options
  const [enrollmentGroupBy, setEnrollmentGroupBy] = useState<'university' | 'year'>('university');
  const [completionGroupBy, setCompletionGroupBy] = useState<'university' | 'year'>('university');

  // Calculate enrollment KPIs from the actual data
  const enrollmentKPIs = useMemo(() => {
    // If no data is loaded yet, return empty metrics
    if (!processedEnrollmentData || processedEnrollmentData.length === 0) {
      return {
        total: { value: 0, change: 0, label: "Total Enrollment", metric: "students" },
        domestic: { value: 0, change: 0, label: "Domestic Students", metric: "students" },
        international: { value: 0, change: 0, label: "International Students", metric: "students" },
        completion: { value: 0, change: 0, label: "Completion Rate", metric: "percent" }
      };
    }

    // Sort by year, descending
    const sortedData = [...processedEnrollmentData].sort((a, b) => 
      b.academic_year - a.academic_year
    );
    
    // Group by year
    const dataByYear: Record<number, any[]> = {};
    sortedData.forEach(item => {
      if (!dataByYear[item.academic_year]) {
        dataByYear[item.academic_year] = [];
      }
      dataByYear[item.academic_year].push(item);
    });

    // Get data for current and previous year using enrollment years
    const yearsList = enrollmentYears;
    const currentYear = yearsList[0];
    const previousYear = yearsList[1];

    if (!currentYear || !previousYear) {
      return {
        total: { value: 0, change: 0, label: "Total Enrollment", metric: "students" },
        domestic: { value: 0, change: 0, label: "Domestic Students", metric: "students" },
        international: { value: 0, change: 0, label: "International Students", metric: "students" },
        completion: { value: 0, change: 0, label: "Completion Rate", metric: "percent" }
      };
    }

    // Filter for selected universities if needed
    let currentYearData = dataByYear[currentYear];
    let previousYearData = dataByYear[previousYear];

    const filterByUniversity = !selectedUniversities.includes("all");
    
    if (filterByUniversity) {
      currentYearData = currentYearData.filter(item => selectedUniversities.includes(item.university));
      previousYearData = previousYearData.filter(item => selectedUniversities.includes(item.university));
    }
    
    // Calculate current year metrics - ensure we handle potentially missing data
    const currentTotalStudents = currentYearData.reduce((sum, item) => sum + (item.total_enrollment_headcount || 0), 0);
    const currentDomesticStudents = currentYearData.reduce((sum, item) => sum + (item.domestic_students_headcount || 0), 0);
    const currentIntlStudents = currentYearData.reduce((sum, item) => sum + (item.international_students_headcount || 0), 0);
    
    // Calculate completion rates - weight by enrollment
    const currentCompletionRateSum = currentYearData.reduce((sum, item) => {
      const completionRate = item.completion_rate_undergraduate || 0;
      const weight = item.total_enrollment_headcount || 0;
      return sum + (completionRate * weight);
    }, 0);
    const currentTotalForCompletion = currentYearData.reduce((sum, item) => sum + (item.total_enrollment_headcount || 0), 0);
    const currentCompletionRate = currentTotalForCompletion > 0 ? 
      (currentCompletionRateSum / currentTotalForCompletion) * 100 : 0;
    
    // Calculate previous year metrics for comparison
    const previousTotalStudents = previousYearData.reduce((sum, item) => sum + (item.total_enrollment_headcount || 0), 0);
    const previousDomesticStudents = previousYearData.reduce((sum, item) => sum + (item.domestic_students_headcount || 0), 0);
    const previousIntlStudents = previousYearData.reduce((sum, item) => sum + (item.international_students_headcount || 0), 0);
    
    // Calculate previous completion rates
    const previousCompletionRateSum = previousYearData.reduce((sum, item) => {
      const completionRate = item.completion_rate_undergraduate || 0;
      const weight = item.total_enrollment_headcount || 0;
      return sum + (completionRate * weight);
    }, 0);
    const previousTotalForCompletion = previousYearData.reduce((sum, item) => sum + (item.total_enrollment_headcount || 0), 0);
    const previousCompletionRate = previousTotalForCompletion > 0 ? 
      (previousCompletionRateSum / previousTotalForCompletion) * 100 : 0;
    
    // Calculate percentage changes
    const totalStudentsChange = calculatePercentChange(currentTotalStudents, previousTotalStudents);
    const domesticStudentsChange = calculatePercentChange(currentDomesticStudents, previousDomesticStudents);
    const intlStudentsChange = calculatePercentChange(currentIntlStudents, previousIntlStudents);
    const completionRateChange = calculatePercentChange(currentCompletionRate, previousCompletionRate);

    return {
      total: {
        value: currentTotalStudents,
        change: totalStudentsChange,
        label: "Total Enrollment",
        metric: "students"
      },
      domestic: {
        value: currentDomesticStudents,
        change: domesticStudentsChange,
        label: "Domestic Students",
        metric: "students"
      },
      international: {
        value: currentIntlStudents,
        change: intlStudentsChange,
        label: "International Students",
        metric: "students"
      },
      completion: {
        value: currentCompletionRate,
        change: completionRateChange,
        label: "Completion Rate",
        metric: "percent"
      }
    };
  }, [processedEnrollmentData, selectedUniversities, enrollmentYears]);

  // Custom tooltip for enrollment trends
  const EnrollmentTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CustomTooltipStyle}>
          <div className="border-b pb-2 mb-2">
            <p className="font-semibold text-sm">{label}</p>
          </div>
          
          {payload.map((entry: any, index: number) => {
            // Extract university short name from entry name (format: "UBC - Total Enrollment")
            const entryName = entry.name.split(' - ')[0];
            
            return (
              <div key={`item-${index}`} className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 mr-2"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs">{entryName}</span>
                </div>
                <span className="text-xs font-semibold">{formatNumber(entry.value)} students</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Prepare enrollment data grouped by university or year
  const prepareEnrollmentData = (groupBy: 'university' | 'year') => {
    if (filteredEnrollmentData.length === 0) {
      return [];
    }
    
    const result: Record<string, any> = {};
    
    // Process enrollment data
    filteredEnrollmentData.forEach((item) => {
      const key = groupBy === 'university' ? item.university : item.academic_year.toString();
      
      // Skip if key is not defined
      if (!key) return;
      
      if (!result[key]) {
        result[key] = {
          name: key,
          shortName: groupBy === 'university' ? getUniversityShortName(item.university) : key,
          university: groupBy === 'university' ? item.university : '',
          year: groupBy === 'year' ? item.academic_year : 0,
          "Total Students": 0,
          "Domestic Students": 0,
          "International Students": 0,
          "Indigenous Students": 0,
          count: 0
        };
      }
      
      // Accumulate enrollment components - handle potentially missing values
      result[key]["Total Students"] += item.total_enrollment_headcount || 0;
      result[key]["Domestic Students"] += item.domestic_students_headcount || 0;
      result[key]["International Students"] += item.international_students_headcount || 0;
      result[key]["Indigenous Students"] += item.indigenous_students_headcount || 0;
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

  // Prepare completion rate data grouped by university or year
  const prepareCompletionData = (groupBy: 'university' | 'year') => {
    if (filteredEnrollmentData.length === 0) {
      return [];
    }
    
    const result: Record<string, any> = {};
    
    // Process enrollment data for completion rates
    filteredEnrollmentData.forEach((item) => {
      const key = groupBy === 'university' ? item.university : item.academic_year.toString();
      
      // Skip if key is not defined
      if (!key) return;
      
      if (!result[key]) {
        result[key] = {
          name: key,
          shortName: groupBy === 'university' ? getUniversityShortName(item.university) : key,
          university: groupBy === 'university' ? item.university : '',
          year: groupBy === 'year' ? item.academic_year : 0,
          "Undergraduate": 0,
          "Master": 0,
          "PhD": 0,
          count: 0
        };
      }
      
      // Set completion rates (we'll take averages later)
      if (item.completion_rate_undergraduate) {
        result[key]["Undergraduate"] += item.completion_rate_undergraduate * 100;
      }
      
      if (item.completion_rate_master) {
        result[key]["Master"] += item.completion_rate_master * 100;
      }
      
      if (item.completion_rate_phd) {
        result[key]["PhD"] += item.completion_rate_phd * 100;
      }
      
      if (item.completion_rate_undergraduate || item.completion_rate_master || item.completion_rate_phd) {
        result[key].count++;
      }
    });
    
    // Calculate averages
    Object.keys(result).forEach(key => {
      if (result[key].count > 0) {
        result[key]["Undergraduate"] = result[key]["Undergraduate"] / result[key].count;
        result[key]["Master"] = result[key]["Master"] / result[key].count;
        result[key]["PhD"] = result[key]["PhD"] / result[key].count;
      }
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

  // Prepare enrollment trend data
  const prepareEnrollmentTrendData = () => {
    if (filteredEnrollmentData.length === 0) {
      return [];
    }
    
    const data: any[] = [];
    
    // Group data by university and year
    const groupedData: Record<string, Record<number, any>> = {};
    
    filteredEnrollmentData.forEach((item) => {
      const uniName = item.university;
      const year = item.academic_year;
      
      if (!groupedData[uniName]) {
        groupedData[uniName] = {};
      }
      
      if (!groupedData[uniName][year]) {
        groupedData[uniName][year] = {
          university: uniName,
          shortName: getUniversityShortName(uniName),
          year: year,
          total: 0
        };
      }
      
      // Accumulate total enrollment only
      groupedData[uniName][year].total += item.total_enrollment_headcount || 0;
    });
    
    // Flatten the data
    Object.keys(groupedData).forEach((uni) => {
      Object.keys(groupedData[uni]).forEach((yearStr) => {
        data.push(groupedData[uni][parseInt(yearStr)]);
      });
    });
    
    return data.sort((a, b) => a.year - b.year);
  };

  // Prepare domestic vs international ratio data
  const prepareDomesticIntlRatioData = () => {
    if (filteredEnrollmentData.length === 0) {
      return [];
    }
    
    // Get the latest year for each university
    const latestYearByUni: Record<string, number> = {};
    filteredEnrollmentData.forEach((item) => {
      const uniName = item.university;
      const year = item.academic_year;
      
      if (!latestYearByUni[uniName] || year > latestYearByUni[uniName]) {
        latestYearByUni[uniName] = year;
      }
    });
    
    const result: Record<string, any> = {};
    
    // Process data for the latest year only
    filteredEnrollmentData.forEach((item) => {
      const uniName = item.university;
      const year = item.academic_year;
      
      // Only include latest year for each university
      if (year !== latestYearByUni[uniName]) {
        return;
      }
      
      if (!result[uniName]) {
        result[uniName] = {
          name: uniName,
          shortName: getUniversityShortName(uniName),
          "Domestic": 0,
          "International": 0,
          "Total": 0
        };
      }
      
      // Add values
      result[uniName]["Domestic"] += item.domestic_students_headcount || 0;
      result[uniName]["International"] += item.international_students_headcount || 0;
      result[uniName]["Total"] += item.total_enrollment_headcount || 0;
    });
    
    // Calculate percentages
    Object.keys(result).forEach(uni => {
      const total = result[uni]["Total"];
      if (total > 0) {
        result[uni]["Domestic %"] = (result[uni]["Domestic"] / total) * 100;
        result[uni]["International %"] = (result[uni]["International"] / total) * 100;
      }
    });
    
    // Convert to array and sort alphabetically
    return Object.values(result).sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="enrollment"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      {/* Enrollment KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(enrollmentKPIs).map(([key, data]) => (
          <div key={key} className="bg-card rounded-md border p-4">
            <div className="text-lg font-medium mb-1">{data.label}</div>
            <div className="flex items-baseline gap-1">
              <div className="text-3xl font-bold">
                {data.metric === "percent" ? data.value.toFixed(1) + "%" : formatNumber(data.value)}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.metric === "students" ? "students" : ""}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {data.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`${data.change >= 0 ? "text-green-500" : "text-red-500"} font-medium`}
              >
                {Math.abs(data.change).toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Since last academic year</div>
          </div>
        ))}
      </div>

      {/* Enrollment Trends Chart - Most important visualization (full width) */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Enrollment Trends</CardTitle>
            <CardDescription>Historical total enrollment data by university</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareEnrollmentTrendData()}
                margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  type="number" 
                  domain={['dataMin', 'dataMax']}
                  label={{ value: 'Academic Year', position: 'insideBottomRight', offset: -10 }}
                />
                <YAxis tickFormatter={val => formatNumber(val)} />
                <Tooltip content={<EnrollmentTooltip />} />
                <Legend />
                {
                  // Create one line for each university's total enrollment
                  [...new Set(prepareEnrollmentTrendData().map(item => item.university))].map((uni, index) => {
                    const uniData = prepareEnrollmentTrendData().filter(item => item.university === uni);
                    const colorIndex = index % COLORS.length;
                    
                    return (
                      <Line 
                        key={`${uni}-total`}
                        type="monotone" 
                        data={uniData}
                        dataKey="total" 
                        name={`${getUniversityShortName(uni)} - Total Enrollment`} 
                        stroke={COLORS[colorIndex]} 
                        strokeWidth={2}
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

      {/* Second Row: 2-column grid for secondary visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Student Population Distribution - Left column */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Distribution</CardTitle>
              <CardDescription>By student category</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={enrollmentGroupBy} onValueChange={(value: 'university' | 'year') => setEnrollmentGroupBy(value)}>
                <SelectTrigger className="w-[120px]">
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
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepareEnrollmentData(enrollmentGroupBy)}
                  margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={enrollmentGroupBy === 'university' ? "shortName" : "year"} 
                    angle={-45} 
                    textAnchor="end" 
                    height={50}
                  />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip content={<EnrollmentTooltip />} />
                  <Legend />
                  <Bar dataKey="Domestic Students" stackId="a" fill="#0088FE" />
                  <Bar dataKey="International Students" stackId="a" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Domestic vs International Ratio - Right column */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Domestic vs. International Ratio</CardTitle>
            <CardDescription>Latest data comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepareDomesticIntlRatioData()}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="shortName" width={60} />
                  <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, '']} />
                  <Legend />
                  <Bar dataKey="Domestic %" name="Domestic %" fill="#0088FE" />
                  <Bar dataKey="International %" name="International %" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analysis - Tabbed Interface for tertiary visualizations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Advanced Enrollment Analysis</CardTitle>
          <CardDescription>Detailed insights and comparative metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="completion">
            <TabsList className="mb-4">
              <TabsTrigger value="completion">Completion Rates</TabsTrigger>
              <TabsTrigger value="comparison">University Comparison</TabsTrigger>
            </TabsList>
            
            <TabsContent value="completion">
              <div className="flex items-center justify-end mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Group by:</span>
                  <Select value={completionGroupBy} onValueChange={(value: 'university' | 'year') => setCompletionGroupBy(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Group by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareCompletionData(completionGroupBy)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={completionGroupBy === 'university' ? "shortName" : "year"} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${value}%`}
                      label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, '']} />
                    <Legend />
                    <Bar dataKey="Undergraduate" fill="#0088FE" />
                    <Bar dataKey="Master" fill="#00C49F" />
                    <Bar dataKey="PhD" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="comparison">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareDomesticIntlRatioData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="shortName" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis tickFormatter={val => formatNumber(val)} />
                    <Tooltip formatter={(value) => [formatNumber(value as number), '']} />
                    <Legend />
                    <Bar dataKey="Total" name="Total Students" fill="#0088FE" />
                    <Bar dataKey="Domestic" name="Domestic Students" fill="#00C49F" />
                    <Bar dataKey="International" name="International Students" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
} 