"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw, Info, Settings, X, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface NewsItem {
  title: string
  date: string
  summary: string
  url: string
}

interface NewsData {
  news: NewsItem[]
}

interface NewsSidebarProps {
  universities: string[]
  kpis?: any
}

export default function NewsSidebar({ universities, kpis }: NewsSidebarProps) {
  const [newsData, setNewsData] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [showSourcesDialog, setShowSourcesDialog] = useState(false)
  const [sources, setSources] = useState<string[]>([])
  const [newSource, setNewSource] = useState("")
  const [isSavingSources, setIsSavingSources] = useState(false)

  const fetchNews = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('http://localhost:5000/api/news')
      
      if (!response.ok) {
        throw new Error('Failed to fetch news data')
      }
      
      const data: NewsData = await response.json()
      setNewsData(data.news || [])
    } catch (err) {
      console.error('Error fetching news:', err)
      setError('Failed to load news')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSources = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/news/sources')
      
      if (!response.ok) {
        throw new Error('Failed to fetch news sources')
      }
      
      const data = await response.json()
      setSources(data.sources || [])
    } catch (err) {
      console.error('Error fetching sources:', err)
      // Use default sources if API fails
      setSources([
        "postsecondarybc.ca",
        "news.gov.bc.ca",
        "cufa.bc.ca",
        "bccampus.ca",
        "wearebcstudents.ca",
        "bccolleges.ca",
        "bcstudents.ca",
        "vanderhooflibrary.com/information-by-subject/students-post-secondary-planning"
      ])
    }
  }

  useEffect(() => {
    fetchNews()
    fetchSources()
  }, [])

  const handleRefreshNews = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      
      const response = await fetch('http://localhost:5000/api/news/refresh', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refresh news data')
      }
      
      const result = await response.json()
      
      // Update the news data with the refreshed data
      if (result.data && result.data.news) {
        setNewsData(result.data.news)
      } else {
        // If no data came back in the response, fetch again
        await fetchNews()
      }
    } catch (err: any) {
      console.error('Error refreshing news:', err)
      setError(`Failed to refresh news: ${err.message}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveSources = async () => {
    try {
      setIsSavingSources(true)
      
      const response = await fetch('http://localhost:5000/api/news/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sources })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save sources')
      }
      
      setShowSourcesDialog(false)
    } catch (err) {
      console.error('Error saving sources:', err)
      // Keep dialog open if save fails
    } finally {
      setIsSavingSources(false)
    }
  }

  const handleAddSource = () => {
    if (newSource && !sources.includes(newSource)) {
      setSources([...sources, newSource])
      setNewSource("")
    }
  }

  const handleRemoveSource = (source: string) => {
    setSources(sources.filter(s => s !== source))
  }

  // Format large numbers for display
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // Format date to readable format (e.g., "2 days ago", "Today", etc.)
  const formatDate = (dateString: string): string => {
    try {
      const now = new Date()
      const date = new Date(dateString)
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffInDays === 0) {
        return 'Today'
      } else if (diffInDays === 1) {
        return 'Yesterday'
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      }
    } catch (err) {
      return dateString
    }
  }

  const toggleDetail = (index: number) => {
    if (showDetail === index) {
      setShowDetail(null)
    } else {
      setShowDetail(index)
    }
  }

  return (
    <div className="hidden lg:block w-[300px] border-l p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">Higher Education News</div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowSourcesDialog(true)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
            title="Edit sources"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRefreshNews} 
            disabled={isRefreshing}
            className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
            title="Refresh news"
          >
            <RefreshCw 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} 
            />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading || isRefreshing ? (
          <div className="text-sm text-muted-foreground">
            {isRefreshing ? 'Refreshing news...' : 'Loading news...'}
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : newsData.length === 0 ? (
          <div className="text-sm text-muted-foreground">No news available</div>
        ) : (
          newsData.slice(0, 5).map((item, index) => (
            <div key={index} className="border-b pb-2 last:border-0">
              <div className="flex justify-between items-start">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline line-clamp-2 flex-1"
                >
                  {item.title}
                </a>
                <button 
                  onClick={() => toggleDetail(index)}
                  className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
                  title="Show details"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              {showDetail === index && (
                <p className="text-xs mt-1 text-gray-600 bg-gray-50 p-2 rounded">
                  {item.summary}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <div className="font-semibold mb-4">Previously Viewed Universities</div>

        <div className="space-y-3">
          {universities.map((uni, index) => (
            <div key={uni} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-sm flex items-center justify-center text-xs">
                {uni
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 3)}
              </div>
              <span className="text-sm">{uni}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="font-semibold mb-4">Filter</div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="h-9 pl-8 pr-4 w-full" placeholder="Search" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="public" />
            <label
              htmlFor="public"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Public Universities
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="community" />
            <label
              htmlFor="community"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Community Colleges
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="polytechnic" />
            <label
              htmlFor="polytechnic"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Polytechnic Colleges
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="4year" />
            <label
              htmlFor="4year"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              4-Year Schools
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="research" />
            <label
              htmlFor="research"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Research Universities
            </label>
          </div>
        </div>
      </div>

      {/* Sources Edit Dialog */}
      <Dialog open={showSourcesDialog} onOpenChange={setShowSourcesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit News Sources</DialogTitle>
          </DialogHeader>
          <div className="p-1 space-y-4">
            <div className="flex items-center">
              <Input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Add new source URL/domain"
                className="flex-1"
              />
              <Button 
                onClick={handleAddSource} 
                variant="outline" 
                size="icon" 
                className="ml-2"
                disabled={!newSource}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {sources.map((source, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                  <span className="text-sm truncate max-w-[250px]">{source}</span>
                  <Button 
                    onClick={() => handleRemoveSource(source)} 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {sources.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No sources added yet. Add sources to customize your news feed.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSourcesDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSources} 
              disabled={isSavingSources}
              className="ml-2"
            >
              {isSavingSources ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 