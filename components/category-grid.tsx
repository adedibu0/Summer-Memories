"use client"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { MediaItem } from "@/lib/media"
import type { Category } from "@/lib/category"

interface CategoryGridProps {
  categories: Category[]
  mediaItems: MediaItem[]
  onCategorySelect: (category: string) => void
}

export default function CategoryGrid({ categories, mediaItems, onCategorySelect }: CategoryGridProps) {
  // Group media items by category
  const mediaByCategory: Record<string, MediaItem[]> = {}

  categories.forEach((category) => {
    mediaByCategory[category.name] = mediaItems.filter(
      (item) => item.categories && item.categories.includes(category.name),
    )
  })

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const categoryMedia = mediaByCategory[category.name] || []
          const mediaCount = categoryMedia.length

          if (mediaCount === 0) return null

          return (
            <Card
              key={category.name}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onCategorySelect(category.name)}
            >
              <CardContent className="p-0">
                {mediaCount === 1 ? (
                  // Single image layout
                  <SingleMediaDisplay media={categoryMedia[0]} />
                ) : (
                  // Multiple images layout
                  <MultipleMediaDisplay media={categoryMedia} />
                )}
                <div className="p-4 bg-gradient-to-t from-black/60 to-transparent absolute bottom-0 left-0 right-0 text-white">
                  <h3 className="font-bold">{category.name}</h3>
                  <p className="text-sm">
                    {mediaCount} {mediaCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function SingleMediaDisplay({ media }: { media: MediaItem }) {
  return (
    <div className="relative aspect-square w-full">
      {media.type === "image" ? (
        <Image
          src={media.url || "/placeholder.svg"}
          alt={media.description || "Category image"}
          fill
          className="object-cover"
        />
      ) : (
        <div className="relative w-full h-full">
          <video src={media.url} className="object-cover w-full h-full" muted loop autoPlay />
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
  )
}

function MultipleMediaDisplay({ media }: { media: MediaItem[] }) {
  // Show up to 4 items in a grid
  const displayMedia = media.slice(0, 4)

  return (
    <div className="relative aspect-square w-full">
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
        {displayMedia.map((item, index) => (
          <div key={item.id} className="relative overflow-hidden">
            {item.type === "image" ? (
              <Image
                src={item.url || "/placeholder.svg"}
                alt={item.description || `Category image ${index + 1}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="relative w-full h-full">
                <video src={item.url} className="object-cover w-full h-full" muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/30 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {media.length > 4 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl">
            +{media.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}
