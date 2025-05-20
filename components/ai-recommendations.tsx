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
  Trash2Icon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem, SuggestedGroup } from "@/lib/media";
import MediaViewer from "@/components/media-viewer";

interface AIRecommendationsProps {
  userId: string;
  activeTab: string;
  mediaItems: MediaItem[];
  onMediaDeleted: () => void;
}

interface DuplicateRecommendation {
  group: string[];
  recommendation: string;
}

export default function AIRecommendations({
  userId,
  activeTab,
  mediaItems,
  onMediaDeleted,
}: AIRecommendationsProps) {
  const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);
  const [duplicateRecommendations, setDuplicateRecommendations] = useState<
    DuplicateRecommendation[]
  >([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const { toast } = useToast();

  const [viewingGroupItems, setViewingGroupItems] = useState<MediaItem[]>([]);
  const [viewingItemIndex, setViewingItemIndex] = useState(0);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  useEffect(() => {
    if (mediaItems.length > 5) {
      fetchSuggestedGroups();
    } else {
      setSuggestedGroups([]);
    }
  }, [userId, mediaItems.length]);

  useEffect(() => {
    fetchDuplicateRecommendations();
  }, [userId, mediaItems.length]);

  const fetchSuggestedGroups = async () => {
    setIsLoadingGroups(true);
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
      setIsLoadingGroups(false);
    }
  };

  const fetchDuplicateRecommendations = async () => {
    setIsLoadingDuplicates(true);
    try {
      const response = await fetch(`/api/media/duplicates?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch duplicate recommendations");
      }
      const data: { recommendations: DuplicateRecommendation[] } =
        await response.json();
      setDuplicateRecommendations(data.recommendations || []);
      setSelectedDuplicates([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load duplicate recommendations",
        variant: "destructive",
      });
      setDuplicateRecommendations([]);
      setSelectedDuplicates([]);
    } finally {
      setIsLoadingDuplicates(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDuplicates.length === 0) return;

    setIsLoadingDuplicates(true);
    try {
      for (const itemId of selectedDuplicates) {
        console.log("UserId and mediaId", userId, itemId);
        const response = await fetch(`/api/media/${itemId}?userId=${userId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          console.error(`Failed to delete media item ${itemId}`);
          toast({
            title: "Error",
            description: `Failed to delete item ${itemId}.`,
            variant: "destructive",
          });
        }
      }

      onMediaDeleted();
      fetchDuplicateRecommendations();
      toast({
        title: "Success",
        description: "Selected duplicates deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDuplicates(false);
    }
  };

  const handleSelectDuplicate = (itemId: string) => {
    setSelectedDuplicates((prevSelected) =>
      prevSelected.includes(itemId)
        ? prevSelected.filter((id) => id !== itemId)
        : [...prevSelected, itemId]
    );
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

  const filteredDuplicateRecommendations = duplicateRecommendations.filter(
    (rec) =>
      activeTab === "all" ||
      (activeTab === "images" &&
        rec.group.every((itemId) => {
          const item = mediaItems.find((media) => media.id === itemId);
          return item && item.type === "image";
        }))
  );

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

  const handleViewDuplicatesClick = (group: string[]) => {
    const itemsToView = group
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

  const isLoading = isLoadingGroups || isLoadingDuplicates;

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

  if (
    filteredGroups.length === 0 &&
    filteredDuplicateRecommendations.length === 0
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" /> AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredGroups.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
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
                  <span className="font-semibold text-base mb-1">
                    {group.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "item" : "items"}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {filteredDuplicateRecommendations.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Potential duplicate images detected:
            </p>
            <div className="space-y-4">
              {filteredDuplicateRecommendations.map((rec, index) => (
                <Card key={index} className="p-4">
                  <CardDescription>{rec.recommendation}</CardDescription>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDuplicatesClick(rec.group)}
                    >
                      View Duplicates
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={selectedDuplicates.length === 0}
                      className="flex items-center gap-1"
                    >
                      <Trash2Icon className="h-4 w-4" />
                      Delete Selected ({selectedDuplicates.length})
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {rec.group.map((itemId) => {
                      const item = mediaItems.find(
                        (media) => media.id === itemId
                      );
                      if (!item) return null;
                      return (
                        <div
                          key={item.id}
                          className="relative border rounded-md overflow-hidden aspect-square"
                        >
                          <input
                            type="checkbox"
                            className="absolute top-1 left-1 z-10"
                            checked={selectedDuplicates.includes(item.id)}
                            onChange={() => handleSelectDuplicate(item.id)}
                          />
                          {item.type === "image" ? (
                            <img
                              src={item.url}
                              alt={item.description}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                              <VideoIcon className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                            <p className="text-white text-xs truncate">
                              {item.filename}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
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
