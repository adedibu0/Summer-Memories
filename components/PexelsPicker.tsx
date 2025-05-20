import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

interface PexelsMedia {
  id: number;
  type: "image" | "video";
  url: string;
  thumbnail: string;
  photographer?: string;
}

interface PexelsPickerProps {
  onClose: () => void;
  onSelect: (items: PexelsMedia[]) => void;
}

const PEXELS_API_KEY =
  process.env.NEXT_PUBLIC_PEXELS_API_KEY || process.env.PEXELS_API_KEY;
const COLLECTION_ID = "97aunzb"; // from your collection URL

export default function PexelsPicker({ onClose, onSelect }: PexelsPickerProps) {
  const [media, setMedia] = useState<PexelsMedia[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPexelsMedia();
  }, []);

  const fetchPexelsMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = "summer";
      const headers = { Authorization: PEXELS_API_KEY || "" };

      // Fetch images
      const imgRes = await axios.get("https://api.pexels.com/v1/search", {
        headers,
        params: {
          query,
          per_page: 20,
          page: 1,
        },
      });

      const images: PexelsMedia[] = (imgRes.data.photos || []).map(
        (item: any) => ({
          id: item.id,
          type: "image",
          url: item.src.original,
          thumbnail: item.src.medium,
          photographer: item.photographer,
        })
      );

      // Fetch videos
      const vidRes = await axios.get("https://api.pexels.com/videos/search", {
        headers,
        params: {
          query,
          per_page: 10,
          page: 1,
        },
      });

      const videos: PexelsMedia[] = (vidRes.data.videos || []).map(
        (item: any) => ({
          id: item.id,
          type: "video",
          url: item.video_files[0]?.link,
          thumbnail: item.image,
          photographer: item.user?.name,
        })
      );

      setMedia([...images, ...videos]);
    } catch (e) {
      setError("Failed to load from Pexels");
      console.error("Pexels API Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedItems = media.filter((item) => selected.has(item.id));
    onSelect(selectedItems);
  };

  return (
    <div>
      {loading && (
        <div className="text-center text-muted-foreground">
          Loading Pexels images and videos...
        </div>
      )}
      {error && <div className="text-red-500 text-center">{error}</div>}
      {!loading && !error && (
        <div>
          <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto mb-4">
            {media.map((item) => (
              <div
                key={item.id}
                className={`relative border rounded-lg overflow-hidden cursor-pointer ${
                  selected.has(item.id) ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-full h-32 object-cover"
                />
                {item.type === "video" && (
                  <span className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    Video
                  </span>
                )}
                {selected.has(item.id) && (
                  <span className="absolute bottom-1 right-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={selected.size === 0}>
              Add to Gallery
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
