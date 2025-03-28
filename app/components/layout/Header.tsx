"use client"

import { 
  Bell, 
  Clock, 
  Sun
} from "lucide-react"

export default function Header() {
  return (
    <header className="h-12 border-b flex items-center px-4 justify-end">
      <div className="flex items-center gap-3">
        <button className="p-1.5 hover:bg-muted rounded-full">
          <Sun className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="p-1.5 hover:bg-muted rounded-full">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="p-1.5 hover:bg-muted rounded-full">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
} 