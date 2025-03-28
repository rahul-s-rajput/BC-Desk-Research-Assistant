"use client"

import DashboardLayout from "../../components/layout/DashboardLayout"
import { useDashboard } from "../../context/DashboardContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function ProgramCurriculumDashboard() {
  const {
    selectedUniversities,
    setSelectedUniversities,
    selectedYears,
    setSelectedYears,
    universities,
    years,
    kpis,
    formatCurrency,
  } = useDashboard()

  // Sample data for program distribution
  const programData = [
    { name: "Business", value: 3500 },
    { name: "Engineering", value: 3200 },
    { name: "Sciences", value: 2800 },
    { name: "Arts", value: 2500 },
    { name: "Medicine", value: 1500 },
    { name: "Education", value: 1200 },
    { name: "Law", value: 800 },
  ]

  // Sample data for course offerings
  const courseData = [
    { year: 2018, undergraduate: 1200, graduate: 450 },
    { year: 2019, undergraduate: 1250, graduate: 480 },
    { year: 2020, undergraduate: 1300, graduate: 500 },
    { year: 2021, undergraduate: 1320, graduate: 520 },
    { year: 2022, undergraduate: 1350, graduate: 540 },
    { year: 2023, undergraduate: 1380, graduate: 560 },
  ]

  // Sample data for outcomes assessment
  const outcomeData = [
    { program: "Business", completion: 85, employment: 88, satisfaction: 82 },
    { program: "Engineering", completion: 78, employment: 92, satisfaction: 75 },
    { program: "Sciences", completion: 80, employment: 83, satisfaction: 79 },
    { program: "Arts", completion: 88, employment: 75, satisfaction: 86 },
    { program: "Medicine", completion: 95, employment: 98, satisfaction: 90 },
    { program: "Education", completion: 90, employment: 87, satisfaction: 84 },
  ]

  return (
    <DashboardLayout
      selectedUniversities={selectedUniversities}
      setSelectedUniversities={setSelectedUniversities}
      selectedYears={selectedYears}
      setSelectedYears={setSelectedYears}
      activeTab="program-curriculum"
      universities={universities}
      years={years}
      kpis={kpis}
    >
      {/* Program & Curriculum KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Total Programs</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">148</div>
            <div className="text-sm text-muted-foreground">programs</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">3.5%</span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last academic year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Course Offerings</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">1,940</div>
            <div className="text-sm text-muted-foreground">courses</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">2.1%</span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last academic year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Graduation Rate</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">84.2%</div>
            <div className="text-sm text-muted-foreground">average</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">1.7%</span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since last academic year</div>
        </div>

        <div className="bg-card rounded-md border p-4">
          <div className="text-lg font-medium mb-1">Employment Rate</div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold">86.5%</div>
            <div className="text-sm text-muted-foreground">graduates</div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">2.3%</span>
            <span className="text-sm text-muted-foreground">LY</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Within 6 months of graduation</div>
        </div>
      </div>

      {/* Tabs for different visualizations */}
      <Tabs defaultValue="distribution" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="distribution">Program Distribution</TabsTrigger>
          <TabsTrigger value="courses">Course Offerings</TabsTrigger>
          <TabsTrigger value="outcomes">Program Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Distribution by Program</CardTitle>
              <CardDescription>Analysis of student enrollment across academic programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={programData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {programData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} students`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Offerings Trend</CardTitle>
              <CardDescription>Year-over-year course offering trends by level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={courseData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="undergraduate" 
                      name="Undergraduate Courses" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="graduate" 
                      name="Graduate Courses" 
                      stroke="#82ca9d" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Outcomes Assessment</CardTitle>
              <CardDescription>Metrics on program completion, employment, and satisfaction rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
} 