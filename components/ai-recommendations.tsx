"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SparklesIcon,
  RefreshCwIcon,
  Loader2Icon,
  VideoIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem, SuggestedGroup } from "@/lib/media";
import MediaViewer from "@/components/media-viewer";

interface AIRecommendationsProps {
  userId: string;
  activeTab: string;
  mediaItems: MediaItem[];
}

export default function AIRecommendations({
  userId,
  activeTab,
  mediaItems,
}: AIRecommendationsProps) {
  const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [viewingGroupItems, setViewingGroupItems] = useState<MediaItem[]>([]);
  const [viewingItemIndex, setViewingItemIndex] = useState(0);

  useEffect(() => {
    if (mediaItems.length > 5) {
      fetchSuggestedGroups();
    } else {
      setSuggestedGroups([]);
    }
  }, [userId, mediaItems.length]);

  const fetchSuggestedGroups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/media/suggest-groups?userId=${userId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch AI suggestions");
      }
      const data: SuggestedGroup[] = await response.json();
      setSuggestedGroups(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load AI suggestions",
        variant: "destructive",
      });
      setSuggestedGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGroups = suggestedGroups.filter((group) => {
    if (activeTab === "all") {
      return true;
    } else if (activeTab === "images") {
      return group.items.some((itemId) => {
        const item = mediaItems.find((media) => media.id === itemId);
        return item && item.type === "image";
      });
    } else if (activeTab === "videos") {
      return group.items.some((itemId) => {
        const item = mediaItems.find((media) => media.id === itemId);
        return item && item.type === "video";
      });
    }
    return false;
  });

  const handleGroupClick = (group: SuggestedGroup) => {
    const itemsToView = group.items
      .map((itemId) => mediaItems.find((item) => item.id === itemId))
      .filter((item): item is MediaItem => item !== undefined);

    if (itemsToView.length > 0) {
      setViewingGroupItems(itemsToView);
      setViewingItemIndex(0);
    } else {
      toast({
        title: "No viewable items",
        description: "This group does not contain any media items.",
        variant: "info",
      });
    }
  };

  const handleViewerClose = () => {
    setViewingGroupItems([]);
    setViewingItemIndex(0);
  };

  const handleViewerPrev = () => {
    setViewingItemIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const handleViewerNext = () => {
    setViewingItemIndex((prevIndex) =>
      Math.min(viewingGroupItems.length - 1, prevIndex + 1)
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" /> AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="mr-2 h-6 w-6 animate-spin" />
            Generating suggestions...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredGroups.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" /> AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Suggested groupings based on your media:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Button
              key={group.name}
              variant="outline"
              className="flex flex-col items-start h-auto text-left"
              onClick={() => handleGroupClick(group)}
            >
              <span className="font-semibold text-base mb-1">{group.name}</span>
              <span className="text-xs text-muted-foreground">
                {group.items.length}{" "}
                {group.items.length === 1 ? "item" : "items"}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
      <AnimatePresence>
        {viewingGroupItems.length > 0 && (
          <MediaViewer
            item={viewingGroupItems[viewingItemIndex]}
            userId={userId}
            onClose={handleViewerClose}
            onUpdate={() => {
              /* Decide how updating in viewer affects groups */
            }}
            onPrev={handleViewerPrev}
            onNext={handleViewerNext}
            showPrev={viewingItemIndex > 0}
            showNext={viewingItemIndex < viewingGroupItems.length - 1}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
