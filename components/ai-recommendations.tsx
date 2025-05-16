"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SparklesIcon, RefreshCwIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AIRecommendationsProps {
  userId: string
  onGroupSelect: () => void
}

interface GroupSuggestion {
  name: string
  items: string[]
}

export default function AIRecommendations({ userId, onGroupSelect }: AIRecommendationsProps) {
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/ai/suggestions?userId=${userId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch AI suggestions")
      }

      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load AI suggestions",
        variant: "destructive",
      })
      setSuggestions([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchSuggestions()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <span>AI Recommendations</span>
          </CardTitle>
          <CardDescription>Our AI analyzes your media to suggest meaningful groups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <span>AI Recommendations</span>
          </CardTitle>
          <CardDescription>Our AI analyzes your media to suggest meaningful groups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Add more photos and videos to get AI-powered group suggestions.
            </p>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <span>AI Recommendations</span>
          </CardTitle>
          <CardDescription>Our AI analyzes your media to suggest meaningful groups</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCwIcon className="h-3 w-3" />
          <span>Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatePresence mode="wait">
            {suggestions.map((group, index) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <CardDescription>{group.items.length} items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // Here you would implement viewing this group
                        toast({
                          title: "Group Selected",
                          description: `Viewing "${group.name}" group`,
                        })
                        onGroupSelect()
                      }}
                    >
                      View Group
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
