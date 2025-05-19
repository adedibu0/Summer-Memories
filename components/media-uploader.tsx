"use client";

import type React from "react";
import { useState, useRef, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ImageIcon,
  VideoIcon,
  XIcon,
  UploadIcon,
  Loader2Icon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isValidFileType, isValidFileSize, fetchCategories } from "@/lib/utils";
import { Category } from "@/lib/category";

interface MediaUploaderProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = "select_file" | "review_suggestions" | "saving";

interface AISuggestions {
  categories: string[];
  description: string;
}

export default function MediaUploader({
  userId,
  onClose,
  onSuccess,
}: MediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<UploadStep>("select_file");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(
    null
  );

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
  useEffect(() => {
    fetchCategory();
  }, []);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (activeTab === "image" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "Please select only one image at a time for analysis",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "video" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "You can upload only 1 video at a time",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter((file) => {
      const isValidType = isValidFileType(file, activeTab);
      const isValidSize = isValidFileSize(file, activeTab);

      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid ${activeTab} file`,
          variant: "destructive",
        });
      }

      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${
            activeTab === "image" ? "2MB" : "15MB"
          } limit`,
          variant: "destructive",
        });
      }

      return isValidType && isValidSize;
    });

    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setCurrentStep("review_suggestions");
    }
  };

  useEffect(() => {
    if (
      currentStep === "review_suggestions" &&
      selectedFiles.length > 0 &&
      !isUploading &&
      !aiSuggestions
    ) {
      handleInitialUpload(selectedFiles[0]);
    }
  }, [currentStep, selectedFiles, isUploading, aiSuggestions]);

  const handleInitialUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("type", activeTab);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Failed to upload ${file.name} for analysis`);
      }

      const result = await response.json();

      if (result.suggestions) {
        setAiSuggestions(result.suggestions);
        setDescription(result.suggestions.description);
        setSelectedCategories(result.suggestions.categories);
        setUploadProgress(100);
      } else {
        throw new Error("AI suggestions not received.");
      }
    } catch (error) {
      toast({
        title: "Analysis failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong during analysis",
        variant: "destructive",
      });
      setCurrentStep("select_file");
      setSelectedFiles([]);
      setAiSuggestions(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSaveMedia = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No file selected",
        description: "Please select a file to save.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "No category selected",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("userId", userId);
    formData.append("type", activeTab);
    formData.append("categories", JSON.stringify(selectedCategories));
    formData.append("description", description);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);

      const response = await fetch("/api/save-media", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(`Failed to save ${selectedFiles[0].name}`);
      }

      const result = await response.json();

      toast({
        title: "Upload successful",
        description: `${selectedFiles[0].name} has been added to your collection.`,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setIsSaving(false);
      setUploadProgress(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);

    if (activeTab === "image" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "Please select only one image at a time for analysis",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "video" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "You can upload only 1 video at a time",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter((file) => {
      const isValidType = isValidFileType(file, activeTab);
      const isValidSize = isValidFileSize(file, activeTab);

      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid ${activeTab} file`,
          variant: "destructive",
        });
      }

      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${
            activeTab === "image" ? "2MB" : "15MB"
          } limit`,
          variant: "destructive",
        });
      }

      return isValidType && isValidSize;
    });

    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setCurrentStep("review_suggestions");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upload Media</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isUploading || isSaving}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection Step */}
        {currentStep === "select_file" && (
          <>
            <Tabs
              defaultValue="image"
              value={activeTab}
              onValueChange={(value: string) => {
                setActiveTab(value as "image" | "video");
                setSelectedFiles([]); // Clear files on tab change
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Photos</span>
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  <span>Videos</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div
              className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFiles.length === 0 ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <UploadIcon className="mx-auto h-12 w-12 text-muted" />
                  <p className="font-medium">Drag and drop a file here</p>
                  <p>or</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept={activeTab === "image" ? "image/*" : "video/*"}
                    multiple={activeTab === "image"} // Re-enable multiple for images later if needed, but keep single for now for AI
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">
                    Selected:
                    {selectedFiles.map((file) => file.name).join(", ")}
                  </p>
                  {/* File preview can be added here if needed */}
                </div>
              )}
            </div>
            {/* Display upload progress during initial analysis */}
            {isUploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {/* Show analyzing state */}
            {isUploading && (
              <div className="flex flex-col items-center justify-center space-y-4 h-40 text-center">
                <Loader2Icon className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-lg font-semibold">
                  Analyzing your {activeTab}...
                </p>
                <p className="text-sm text-muted-foreground">
                  Please wait, this may take a moment.
                </p>
              </div>
            )}
          </>
        )}

        {/* Review Suggestions Step */}
        {currentStep === "review_suggestions" &&
          aiSuggestions &&
          selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Suggestions</h3>

              {/* File Preview */}
              <div className="w-full max-h-60 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                {selectedFiles[0].type.startsWith("image/") ? (
                  <img
                    src={
                      URL.createObjectURL(selectedFiles[0]) ||
                      "/placeholder.svg"
                    }
                    alt="Preview"
                    className="max-h-60 object-contain"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(selectedFiles[0])}
                    controls
                    className="max-h-60 object-contain"
                  ></video>
                )}
              </div>

              {/* Description Section */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description to your media..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
                {aiSuggestions.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    AI Suggestion: {aiSuggestions.description}
                  </p>
                )}
              </div>

              {/* Categories Section */}
              <div>
                <Label>Categories</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {/* AI Suggested Categories */}
                  {aiSuggestions.categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label htmlFor={`category-${category}`}>
                        {category} (Suggested)
                      </Label>
                    </div>
                  ))}

                  {/* Default Categories */}
                  {categories
                    .filter(
                      (cat) => !aiSuggestions.categories.includes(cat.name)
                    )
                    .map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category.name)}
                          onCheckedChange={() =>
                            handleCategoryToggle(category.name)
                          }
                        />
                        <Label htmlFor={`category-${category.name}`}>
                          {category.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>

              {/* Upload progress during saving */}
              {isSaving && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

        {/* Saving Step (can show progress or success message here) */}
        {currentStep === "saving" && (
          <div className="flex flex-col items-center justify-center space-y-4 h-40">
            <Loader2Icon className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-semibold">Saving media...</p>
            {/* More detailed progress or status can be added here */}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isUploading || isSaving}
        >
          Cancel
        </Button>
        {currentStep === "select_file" && (
          <Button
            onClick={() => {
              if (selectedFiles.length > 0) {
                handleInitialUpload(selectedFiles[0]);
              }
            }}
            disabled={selectedFiles.length === 0 || isUploading || isSaving}
          >
            {isUploading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />{" "}
                Analyzing...
              </>
            ) : (
              <>Analyze</>
            )}
          </Button>
        )}
        {currentStep === "review_suggestions" && (
          <Button
            onClick={handleSaveMedia}
            disabled={
              selectedCategories.length === 0 || isUploading || isSaving
            }
          >
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>Save Media</>
            )}
          </Button>
        )}
        {currentStep === "saving" && <Button disabled>Saving...</Button>}
      </CardFooter>
    </Card>
  );
}
