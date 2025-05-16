"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  XIcon,
  BookOpenIcon,
  SaveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem } from "@/lib/media";

interface MediaViewerProps {
  item: MediaItem;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}

export default function MediaViewer({
  item,
  userId,
  onClose,
  onUpdate,
  onPrev,
  onNext,
  showPrev = false,
  showNext = false,
}: MediaViewerProps) {
  const [journal, setJournal] = useState(item.journal || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveJournal = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/media/${item.id}?userId=${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journal,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update journal");
      }

      toast({
        title: "Success",
        description: "Journal updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update journal",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        layoutId={`media-${item.id}`}
        className="bg-card rounded-lg shadow-lg w-full max-w-4xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row h-full max-h-[80vh]">
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {showPrev && (
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/80 z-10"
                onClick={onPrev}
                aria-label="Previous"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            )}
            {item.type === "image" ? (
              <img
                src={`/api/media/file/${item.id}?userId=${userId}`}
                alt={item.description || "Image"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                controls
                autoPlay
                className="max-h-full max-w-full object-contain"
              >
                <source
                  src={`/api/media/file/${item.id}?userId=${userId}`}
                  type="video/mp4"
                />
              </video>
            )}
            {showNext && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/80 z-10"
                onClick={onNext}
                aria-label="Next"
              >
                <ArrowRightIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="w-full md:w-80 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Details</h3>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {item.description && (
              <p className="text-sm mb-4">{item.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {item.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>

            <div className="text-xs text-muted-foreground mb-4">
              Added on {new Date(item.createdAt).toLocaleDateString()}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <BookOpenIcon className="h-4 w-4" />
              <h4 className="font-medium">Memory Journal</h4>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="Write about this memory..."
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setJournal(item.journal || "");
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveJournal}
                    disabled={isSaving}
                    className="flex items-center gap-1"
                  >
                    <SaveIcon className="h-3 w-3" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {item.journal ? (
                  <p className="text-sm mb-2">{item.journal}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">
                    No journal entry yet.
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  {item.journal ? "Edit" : "Add"} Journal
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
