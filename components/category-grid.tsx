"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  VideoIcon,
  ChevronLeftIcon,
  EyeIcon,
  Grid2X2Icon,
} from "lucide-react";
import type { MediaItem } from "@/lib/media";
import MediaViewer from "@/components/media-viewer";
import { Category } from "@/lib/category";

interface CategoryGridProps {
  mediaItems: MediaItem[];
  categories: Category[];

  isLoading: boolean;
  userId: string;
  onUpdate: () => void;
  refreshCategories: () => void;
}

export default function CategoryGrid({
  mediaItems,
  categories,
  isLoading,
  userId,
  onUpdate,
  refreshCategories,
}: CategoryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Group media by category
  const categoryMap: { [catName: string]: MediaItem[] } = {};
  for (const item of mediaItems) {
    for (const cat of item.categories || []) {
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(item);
    }
  }
  // Modal viewer navigation handlers
  const handleOpenViewer = (idx: number) => setViewerIndex(idx);
  const handleCloseViewer = () => setViewerIndex(null);
  const handlePrev = (items: MediaItem[]) => {
    if (viewerIndex === null) return;
    setViewerIndex((viewerIndex - 1 + items.length) % items.length);
  };
  const handleNext = (items: MediaItem[]) => {
    if (viewerIndex === null) return;
    setViewerIndex((viewerIndex + 1) % items.length);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    // Show all media in the selected category
    const items = categoryMap[selectedCategory] || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategory(null);
              setViewerIndex(null);
            }}
            className="group"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to Categories
          </Button>
          <h2 className="text-2xl font-bold">{selectedCategory}</h2>
          <Badge variant="outline" className="ml-auto">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                className="relative rounded-xl overflow-hidden aspect-square bg-muted shadow-md hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => handleOpenViewer(idx)}
              >
                {item.type === "image" ? (
                  <img
                    src={`/api/media/file/${item.id}?userId=${userId}`}
                    alt={item.description || "Image"}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video className="w-full h-full object-cover">
                      <source
                        src={`/api/media/file/${item.id}?userId=${userId}`}
                        type="video/mp4"
                      />
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <VideoIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoverIndex === idx ? 1 : 0.6 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-white font-medium truncate text-sm">
                    {item.description || "Untitled"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                    {item.type === "image" ? (
                      <ImageIcon className="h-3 w-3" />
                    ) : (
                      <VideoIcon className="h-3 w-3" />
                    )}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute top-3 right-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: hoverIndex === idx ? 1 : 0,
                    scale: hoverIndex === idx ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal Viewer */}
        {viewerIndex !== null && (
          <MediaViewer
            item={items[viewerIndex]}
            userId={userId}
            onClose={handleCloseViewer}
            onUpdate={onUpdate}
            onPrev={
              viewerIndex > 0
                ? () => setViewerIndex(viewerIndex - 1)
                : undefined
            }
            onNext={
              viewerIndex < items.length - 1
                ? () => setViewerIndex(viewerIndex + 1)
                : undefined
            }
            showPrev={items.length > 1 && viewerIndex > 0}
            showNext={items.length > 1 && viewerIndex < items.length - 1}
          />
        )}
      </div>
    );
  }

  // Show categories grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat) => {
        const items = categoryMap[cat.name] || [];
        if (items.length === 0) return null;

        if (items.length === 1) {
          // Single item category design
          const item = items[0];
          return (
            <motion.div
              key={cat.id}
              className="group relative rounded-xl overflow-hidden shadow-lg cursor-pointer h-80"
              onClick={() => setSelectedCategory(cat.name)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
            >
              {/* Background image with gradient overlay */}
              <div className="absolute inset-0">
                {item.type === "image" ? (
                  <img
                    src={`/api/media/file/${item.id}?userId=${userId}`}
                    alt={item.description || "Image"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <video className="w-full h-full object-cover">
                    <source
                      src={`/api/media/file/${item.id}?userId=${userId}`}
                      type="video/mp4"
                    />
                  </video>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>

              {/* Content overlay */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <motion.div
                  initial={{ y: 10, opacity: 0.8 }}
                  whileHover={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="font-bold text-2xl text-white mb-1">
                    {cat.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white hover:bg-white/30"
                    >
                      1 item
                    </Badge>
                    {item.type === "image" ? (
                      <Badge
                        variant="outline"
                        className="bg-white/10 text-white border-white/20"
                      >
                        <ImageIcon className="h-3 w-3 mr-1" /> Image
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-white/10 text-white border-white/20"
                      >
                        <VideoIcon className="h-3 w-3 mr-1" /> Video
                      </Badge>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          );
        } else {
          // Multiple items category design with cascade effect
          return (
            <motion.div
              key={cat.id}
              className="group relative rounded-xl overflow-hidden shadow-lg cursor-pointer h-80 bg-card"
              onClick={() => setSelectedCategory(cat.name)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
            >
              {/* Background blurred image (second image) */}
              {items.length > 1 && (
                <div className="absolute inset-0 scale-110">
                  {items[1].type === "image" ? (
                    <img
                      src={`/api/media/file/${items[1].id}?userId=${userId}`}
                      alt=""
                      className="w-full h-full object-cover blur-md opacity-60"
                    />
                  ) : (
                    <video className="w-full h-full object-cover blur-md opacity-60">
                      <source
                        src={`/api/media/file/${items[1].id}?userId=${userId}`}
                        type="video/mp4"
                      />
                    </video>
                  )}
                  <div className="absolute inset-0 bg-black/40"></div>
                </div>
              )}

              {/* Cascade effect with stacked cards */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[85%] h-[85%]">
                  {/* Additional stacked images indicators */}
                  {items.length > 2 && (
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-full h-full rounded-xl bg-black/20 border border-white/10"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 3 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  {items.length > 1 && (
                    <motion.div
                      className="absolute -bottom-2 -right-2 w-full h-full rounded-xl bg-black/30 border border-white/20"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 6 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  {/* Main foreground image (first image) */}
                  <motion.div
                    className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-white/30"
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {items[0].type === "image" ? (
                      <img
                        src={`/api/media/file/${items[0].id}?userId=${userId}`}
                        alt={items[0].description || "Image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video className="w-full h-full object-cover">
                          <source
                            src={`/api/media/file/${items[0].id}?userId=${userId}`}
                            type="video/mp4"
                          />
                        </video>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <VideoIcon className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    )}

                    {/* Content overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <motion.div
                        initial={{ y: 10, opacity: 0.8 }}
                        whileHover={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h3 className="font-bold text-2xl text-white mb-1">
                          {cat.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-white/20 text-white hover:bg-white/30"
                          >
                            {items.length} items
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-white/10 text-white border-white/20"
                          >
                            <Grid2X2Icon className="h-3 w-3 mr-1" /> Collection
                          </Badge>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Item count indicator */}
              <div className="absolute top-3 right-3 bg-black/60 rounded-full h-8 w-8 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  +{items.length - 1}
                </span>
              </div>

              {/* Hover effect button */}
              <motion.div
                className="absolute bottom-4 right-4 z-10"
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  View All
                </Button>
              </motion.div>
            </motion.div>
          );
        }
      })}
    </div>
  );
}
