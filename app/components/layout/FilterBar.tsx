"use client"

import { MultiSelect } from "@/components/ui/multi-select"

interface FilterBarProps {
  selectedUniversities: string[]
  setSelectedUniversities: (universities: string[]) => void
  selectedYears: string[]
  setSelectedYears: (years: string[]) => void
  universities: string[]
  years: number[]
  activeTab: string
}

export default function FilterBar({
  selectedUniversities,
  setSelectedUniversities,
  selectedYears,
  setSelectedYears,
  universities,
  years,
  activeTab,
}: FilterBarProps) {
  let title = "Overview"
  
  switch(activeTab) {
    case "financials":
      title = "Financials"
      break
    case "enrollment":
      title = "Enrollment"
      break
    case "operational-costs":
      title = "Operational Costs"
      break
    case "program-curriculum":
      title = "Program/Curriculum"
      break
  }

  // Handle university selection
  const handleUniversityChange = (values: string[]) => {
    // If "all" is selected along with other options, just keep "all"
    if (values.includes("all") && values.length > 1) {
      if (selectedUniversities.includes("all")) {
        // If "all" was already selected, user wants to select specific unis
        setSelectedUniversities(values.filter(v => v !== "all"));
      } else {
        // User just selected "all", so set to only "all"
        setSelectedUniversities(["all"]);
      }
    } else if (values.length === 0) {
      // If nothing is selected, default to "all"
      setSelectedUniversities(["all"]);
    } else {
      setSelectedUniversities(values);
    }
  };

  // Handle year selection
  const handleYearChange = (values: string[]) => {
    // If "all" is selected along with other options, just keep "all"
    if (values.includes("all") && values.length > 1) {
      if (selectedYears.includes("all")) {
        // If "all" was already selected, user wants to select specific years
        setSelectedYears(values.filter(v => v !== "all"));
      } else {
        // User just selected "all", so set to only "all"
        setSelectedYears(["all"]);
      }
    } else if (values.length === 0) {
      // If nothing is selected, default to "all"
      setSelectedYears(["all"]);
    } else {
      setSelectedYears(values);
    }
  };

  // Format display text for selections
  const getUniversityDisplayText = () => {
    if (selectedUniversities.includes("all")) return "All Universities";
    if (selectedUniversities.length === 1) return selectedUniversities[0];
    return `${selectedUniversities.length} Universities Selected`;
  };

  const getYearDisplayText = () => {
    if (selectedYears.includes("all")) return "All Years";
    if (selectedYears.length === 1) return selectedYears[0];
    return `${selectedYears.length} Years Selected`;
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <MultiSelect
          options={[{ value: "all", label: "All Universities" }, ...universities.map(uni => ({ value: uni, label: uni }))]}
          selectedValues={selectedUniversities}
          onChange={handleUniversityChange}
          placeholder="Select Universities"
          displayText={getUniversityDisplayText()}
        />

        <MultiSelect
          options={[{ value: "all", label: "All Years" }, ...years.map(year => ({ value: year.toString(), label: year.toString() }))]}
          selectedValues={selectedYears}
          onChange={handleYearChange}
          placeholder="Select Years"
          displayText={getYearDisplayText()}
        />
      </div>
    </div>
  )
} 