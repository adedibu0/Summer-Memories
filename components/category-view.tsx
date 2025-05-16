"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import MediaViewer from "./media-viewer"
import type { MediaItem } from "@/lib/media"

interface CategoryViewProps {
  categoryName: string
  mediaItems: MediaItem[]
  onBack: () => void
}

export default function CategoryView({ categoryName, mediaItems, onBack }: CategoryViewProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const openViewer = (index: number) => {
    setSelectedIndex(index)
    setViewerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{categoryName}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaItems.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-square cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openViewer(index)}
          >
            {item.type === "image" ? (
              <Image
                src={item.url || "/placeholder.svg"}
                alt={item.description || "Media"}
                fill
                className="object-cover rounded-md"
              />
            ) : (
              <div className="relative w-full h-full">
                <video src={item.url} className="object-cover w-full h-full rounded-md" muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/30 rounded-full p-2">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewerOpen && (
        <MediaViewer mediaItems={mediaItems} initialIndex={selectedIndex} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  )
}
