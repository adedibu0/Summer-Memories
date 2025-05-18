"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SunIcon,
  LogOutIcon,
  UploadIcon,
  ImageIcon,
  VideoIcon,
  BookOpenIcon,
  FolderIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MediaUploader from "@/components/media-uploader";
import MediaGrid from "@/components/media-grid";
import AIRecommendations from "@/components/ai-recommendations";
import { ThemeToggle } from "@/components/theme-toggle";
import type { MediaItem } from "@/lib/media";
import PexelsPicker from "@/components/PexelsPicker";
import { type Category } from "@/lib/category";
import CategoryGrid from "@/components/category-grid";
import { fetchCategories } from "@/lib/utils";

interface GalleryLayoutProps {
  userId: string;
}

export default function GalleryLayout({ userId }: GalleryLayoutProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [showUploader, setShowUploader] = useState(false);
  const [showPexelsPicker, setShowPexelsPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPexelsUploading, setIsPexelsUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  useEffect(() => {
    fetchMediaItems();
  }, [activeTab]);

  useEffect(() => {
    fetchCategory();
  }, []);

  const fetchMediaItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/media?userId=${userId}&type=${
          activeTab === "images"
            ? "image"
            : activeTab === "videos"
            ? "video"
            : activeTab
        }`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch media items");
      }
      const data = await response.json();
      // Sort by newest first (assuming createdAt or date field)
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.createdAt || b.date).getTime() -
          new Date(a.createdAt || a.date).getTime()
      );
      setMediaItems(sorted);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load media items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategory = async () => {
    setIsLoadingCategories(true);
    try {
      const data: Category[] = await fetchCategories(userId);
      setCategories(data);
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    fetchMediaItems();
    toast({
      title: "Success",
      description: "Media uploaded successfully",
    });
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Group media items by date (Today, Yesterday, or date string)
  function groupMediaByDate(mediaItems: MediaItem[]) {
    const groups: { [date: string]: MediaItem[] } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    for (const item of mediaItems) {
      const date = new Date(item.createdAt);
      let label = date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      if (date.toDateString() === today.toDateString()) {
        label = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = "Yesterday";
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return groups;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SunIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Summer Memories</h1>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowUploader(true)}
            >
              <UploadIcon className="h-4 w-4" />
              <span>Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowPexelsPicker(true)}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Get from Pexels</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSignOut}
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4" />
                <span>All</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Photos</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4" />
                <span>Videos</span>
              </TabsTrigger>
              <TabsTrigger value="journal" className="flex items-center gap-2">
                <BookOpenIcon className="h-4 w-4" />
                <span>Journal</span>
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="flex items-center gap-2"
              >
                <FolderIcon className="h-4 w-4" />
                <span>Categories</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <MediaGrid
              mediaItems={mediaItems}
              groupedMedia={groupMediaByDate(mediaItems)}
              isLoading={isLoading}
              onUpdate={fetchMediaItems}
              userId={userId}
              categories={categories}
              refreshCategories={fetchCategory}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-0">
            <MediaGrid
              mediaItems={mediaItems.filter((item) => item.type === "image")}
              groupedMedia={groupMediaByDate(
                mediaItems.filter((item) => item.type === "image")
              )}
              isLoading={isLoading}
              onUpdate={fetchMediaItems}
              userId={userId}
              categories={categories}
              refreshCategories={fetchCategory}
            />
          </TabsContent>

          <TabsContent value="videos" className="mt-0">
            <MediaGrid
              mediaItems={mediaItems.filter((item) => item.type === "video")}
              groupedMedia={groupMediaByDate(
                mediaItems.filter((item) => item.type === "video")
              )}
              isLoading={isLoading}
              onUpdate={fetchMediaItems}
              userId={userId}
              categories={categories}
              refreshCategories={fetchCategory}
            />
          </TabsContent>

          <TabsContent value="journal" className="mt-0">
            <MediaGrid
              mediaItems={mediaItems.filter((item) => item.journal)}
              isLoading={isLoading}
              onUpdate={fetchMediaItems}
              userId={userId}
              showJournal
              categories={categories}
              refreshCategories={fetchCategory}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CategoryGrid
              mediaItems={mediaItems}
              categories={categories}
              isLoading={isLoading}
              userId={userId}
              onUpdate={fetchMediaItems}
              refreshCategories={fetchCategory}
            />
          </TabsContent>
        </Tabs>

        {mediaItems.length > 5 && (
          <div className="mt-12">
            <AIRecommendations
              userId={userId}
              activeTab={activeTab}
              mediaItems={mediaItems}
              onMediaDeleted={fetchMediaItems}
            />
          </div>
        )}
      </main>

      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-lg shadow-lg w-full max-w-lg"
            >
              <MediaUploader
                userId={userId}
                onClose={() => setShowUploader(false)}
                onSuccess={handleUploadSuccess}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Pexels Picker Modal */}
      {showPexelsPicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg shadow-lg w-full max-w-2xl"
          >
            <div className="flex justify-between items-center p-6 pb-2">
              <h2 className="text-lg font-bold">Pick from Pexels</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPexelsPicker(false)}
              >
                Close
              </Button>
            </div>
            <div className="px-6 pb-6">
              {isPexelsUploading ? (
                <div className="text-center py-12">
                  Uploading to your gallery...
                </div>
              ) : (
                <PexelsPicker
                  onClose={() => setShowPexelsPicker(false)}
                  onSelect={async (items) => {
                    setIsPexelsUploading(true);
                    try {
                      for (const item of items) {
                        const res = await fetch(item.url);
                        const blob = await res.blob();
                        const file = new File(
                          [blob],
                          `pexels-${item.id}.${
                            item.type === "image" ? "jpg" : "mp4"
                          }`
                        );
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("userId", userId);
                        formData.append("type", item.type);
                        formData.append(
                          "categories",
                          JSON.stringify(["pexels"])
                        );
                        formData.append(
                          "description",
                          `From Pexels by ${item.photographer || "unknown"}`
                        );
                        await fetch("/api/save-media", {
                          method: "POST",
                          body: formData,
                        });
                      }
                      setShowPexelsPicker(false);
                      fetchMediaItems();
                      toast({
                        title: "Success",
                        description: "Added from Pexels!",
                      });
                    } catch (e) {
                      toast({
                        title: "Error",
                        description: "Failed to add from Pexels",
                        variant: "destructive",
                      });
                    } finally {
                      setIsPexelsUploading(false);
                    }
                  }}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
