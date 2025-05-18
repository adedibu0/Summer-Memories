"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, VideoIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MediaViewer from "@/components/media-viewer";
import type { MediaItem } from "@/lib/media";

interface MediaGridProps {
  mediaItems: MediaItem[];
  isLoading: boolean;
  onUpdate: () => void;
  userId: string;
  showJournal?: boolean;
  groupedMedia?: { [date: string]: MediaItem[] };
  categories: { id: string; name: string }[];
  refreshCategories: () => void;
}

export default function MediaGrid({
  mediaItems,
  isLoading,
  onUpdate,
  userId,
  showJournal = false,
  groupedMedia,
  categories,
  refreshCategories,
}: // ,
MediaGridProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const { toast } = useToast();

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Use categories prop for dropdown
  const userCategories = categories;

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete media item");
      }

      toast({
        title: "Success",
        description: "Media item deleted successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete media item",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (
      selectedIds.length ===
      (groupedMedia
        ? Object.values(groupedMedia).flat().length
        : mediaItems.length)
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        (groupedMedia ? Object.values(groupedMedia).flat() : mediaItems).map(
          (item) => item.id
        )
      );
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setIsAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add category");
      // await refreshCategories();
      // Set selectedCategory to the new category's id
      const data = await res.json();
      setSelectedCategory(data.id);
      setNewCategory("");
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to add category.",
        variant: "destructive",
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleApplyCategory = async () => {
    setIsApplying(true);
    let categoryToAdd = selectedCategory;
    if (selectedCategory === "__new__") {
      await handleAddCategory();
      categoryToAdd = selectedCategory;
    }
    const categoryObj = categories.find((cat) => cat.id === categoryToAdd);
    if (!categoryObj) {
      toast({
        title: "No category",
        description: "Please select or enter a category.",
        variant: "destructive",
      });
      setIsApplying(false);
      return;
    }
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const item = (
            groupedMedia ? Object.values(groupedMedia).flat() : mediaItems
          ).find((i) => i.id === id);
          if (!item) return;
          const categoriesArr = Array.from(
            new Set([...(item.categories || []), categoryObj])
            // new Set([...(item.categories || []), categoryObj.name])
          );
          await fetch(`/api/media/${id}?userId=${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categories: categoriesArr }),
          });
        })
      );
      toast({
        title: "Success",
        // description: `Added to category '${categoryObj.name}'.`,
      });
      setSelectedIds([]);
      setSelectionMode(false);
      setSelectedCategory("");
      setNewCategory("");
      onUpdate();
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update categories.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="gallery-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="gallery-item">
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    );
  }

  if (
    (groupedMedia ? Object.values(groupedMedia).flat() : mediaItems).length ===
    0
  ) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          {showJournal ? (
            <BookOpenIcon className="h-8 w-8 text-muted-foreground" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-lg font-medium mb-2">No media found</h3>
        <p className="text-muted-foreground mb-4">
          {showJournal
            ? "You haven't added any journal entries yet."
            : "Upload some photos or videos to get started."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={selectionMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setSelectionMode((v) => !v);
            setSelectedIds([]);
          }}
        >
          {selectionMode ? "Cancel" : "Select"}
        </Button>
        {selectionMode && (
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedIds.length ===
            (groupedMedia
              ? Object.values(groupedMedia).flat().length
              : mediaItems.length)
              ? "Unselect All"
              : "Select All"}
          </Button>
        )}
        {selectionMode && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                className="border rounded px-2 py-1"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {userCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__new__">+ Create new category</option>
              </select>
              {selectedCategory === "__new__" && (
                <div className="flex gap-2 mt-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCategory}
                    disabled={isAddingCategory || !newCategory.trim()}
                  >
                    {isAddingCategory ? "Adding..." : "Add"}
                  </Button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApplyCategory}
              disabled={isApplying}
            >
              {isApplying ? "Applying..." : "Add to Category"}
            </Button>
          </div>
        )}
      </div>
      {groupedMedia ? (
        <div className="flex flex-col gap-8">
          {Object.entries(groupedMedia).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h2 className="text-lg font-bold mb-4">{dateLabel}</h2>
              <div className="gallery-grid">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    className={`gallery-item ${
                      selectionMode && selectedIds.includes(item.id)
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    layoutId={`media-${item.id}`}
                    onClick={() =>
                      selectionMode
                        ? handleSelect(item.id)
                        : setSelectedItem(item)
                    }
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="absolute top-2 left-2 z-10 w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {item.type === "image" ? (
                      <img
                        src={`/api/media/file/${item.id}?userId=${userId}`}
                        alt={item.description || "Image"}
                      />
                    ) : (
                      <video>
                        <source
                          src={`/api/media/file/${item.id}?userId=${userId}`}
                          type="video/mp4"
                        />
                      </video>
                    )}
                    <div className="gallery-item-overlay">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium truncate">
                            {item.description || "Untitled"}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-white/70">
                            {item.type === "image" ? (
                              <ImageIcon className="h-3 w-3" />
                            ) : (
                              <VideoIcon className="h-3 w-3" />
                            )}
                            <span>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {item.journal && (
                        <div className="mt-2 text-xs text-white/90 flex items-center gap-1">
                          <BookOpenIcon className="h-3 w-3" />
                          <span className="line-clamp-1">{item.journal}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gallery-grid">
          {mediaItems.map((item) => (
            <motion.div
              key={item.id}
              className={`gallery-item ${
                selectionMode && selectedIds.includes(item.id)
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              layoutId={`media-${item.id}`}
              onClick={() =>
                selectionMode ? handleSelect(item.id) : setSelectedItem(item)
              }
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleSelect(item.id)}
                  className="absolute top-2 left-2 z-10 w-4 h-4"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {item.type === "image" ? (
                <img
                  src={`/api/media/file/${item.id}?userId=${userId}`}
                  alt={item.description || "Image"}
                />
              ) : (
                <video>
                  <source
                    src={`/api/media/file/${item.id}?userId=${userId}`}
                    type="video/mp4"
                  />
                </video>
              )}
              <div className="gallery-item-overlay">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium truncate">
                      {item.description || "Untitled"}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      {item.type === "image" ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <VideoIcon className="h-3 w-3" />
                      )}
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {item.journal && (
                  <div className="mt-2 text-xs text-white/90 flex items-center gap-1">
                    <BookOpenIcon className="h-3 w-3" />
                    <span className="line-clamp-1">{item.journal}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {selectedItem && (
          <MediaViewer
            item={selectedItem}
            userId={userId}
            onClose={() => setSelectedItem(null)}
            onUpdate={() => {
              onUpdate();
              setSelectedItem(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
