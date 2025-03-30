"use client"

import { MultiSelect } from "@/components/ui/multi-select"
import { useState } from "react"

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
  // Add state for university type filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);

  // Define university types
  const universityTypes = [
    { value: "all", label: "All Types" },
    { value: "public", label: "Public Universities" },
    { value: "community", label: "Community Colleges" },
    { value: "polytechnic", label: "Polytechnic Colleges" },
    { value: "fourYear", label: "4-Year Schools" },
    { value: "research", label: "Research Universities" }
  ];

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

  // Handle university type selection
  const handleTypeChange = (values: string[]) => {
    // If "all" is selected along with other options, just keep "all"
    if (values.includes("all") && values.length > 1) {
      if (selectedTypes.includes("all")) {
        // If "all" was already selected, user wants to select specific types
        setSelectedTypes(values.filter(v => v !== "all"));
      } else {
        // User just selected "all", so set to only "all"
        setSelectedTypes(["all"]);
      }
    } else if (values.length === 0) {
      // If nothing is selected, default to "all"
      setSelectedTypes(["all"]);
    } else {
      setSelectedTypes(values);
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

  const getTypeDisplayText = () => {
    if (selectedTypes.includes("all")) return "All Types";
    if (selectedTypes.length === 1) {
      const typeObj = universityTypes.find(t => t.value === selectedTypes[0]);
      return typeObj ? typeObj.label : selectedTypes[0];
    }
    return `${selectedTypes.length} Types Selected`;
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
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

          <MultiSelect
            options={universityTypes}
            selectedValues={selectedTypes}
            onChange={handleTypeChange}
            placeholder="Select Types"
            displayText={getTypeDisplayText()}
          />
        </div>
      </div>
    </div>
  )
} 