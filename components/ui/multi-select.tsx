"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Option = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  displayText?: string
  className?: string
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  displayText,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleOptionClick = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-[220px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          className
        )}
      >
        <span className="truncate">{displayText || placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-1">
            {options.map((option) => (
              <div 
                key={option.value} 
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  selectedValues.includes(option.value) && "bg-accent/50"
                )}
                onClick={() => handleOptionClick(option.value)}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                  {selectedValues.includes(option.value) && (
                    <CheckIcon className="h-3 w-3" />
                  )}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 