"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ImageIcon, VideoIcon, XIcon, UploadIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatFileSize, isValidFileType, isValidFileSize, DEFAULT_CATEGORIES } from "@/lib/utils"

interface MediaUploaderProps {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function MediaUploader({ userId, onClose, onSuccess }: MediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (activeTab === "image" && files.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload up to 10 images at once",
        variant: "destructive",
      })
      return
    }

    if (activeTab === "video" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "You can upload only 1 video at a time",
        variant: "destructive",
      })
      return
    }

    const validFiles = files.filter((file) => {
      const isValidType = isValidFileType(file, activeTab)
      const isValidSize = isValidFileSize(file, activeTab)

      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid ${activeTab} file`,
          variant: "destructive",
        })
      }

      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${activeTab === "image" ? "1MB" : "10MB"} limit`,
          variant: "destructive",
        })
      }

      return isValidType && isValidSize
    })

    setSelectedFiles(validFiles)
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: `Please select ${activeTab === "image" ? "images" : "a video"} to upload`,
        variant: "destructive",
      })
      return
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "No category selected",
        description: "Please select at least one category",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5
          return newProgress >= 90 ? 90 : newProgress
        })
      }, 200)

      // Upload each file
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("userId", userId)
        formData.append("type", activeTab)
        formData.append("categories", JSON.stringify(selectedCategories))
        formData.append("description", description)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        onSuccess()
      }, 500)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    const files = Array.from(e.dataTransfer.files)

    if (activeTab === "image" && files.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload up to 10 images at once",
        variant: "destructive",
      })
      return
    }

    if (activeTab === "video" && files.length > 1) {
      toast({
        title: "Too many files",
        description: "You can upload only 1 video at a time",
        variant: "destructive",
      })
      return
    }

    const validFiles = files.filter((file) => {
      const isValidType = isValidFileType(file, activeTab)
      const isValidSize = isValidFileSize(file, activeTab)

      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid ${activeTab} file`,
          variant: "destructive",
        })
      }

      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${activeTab === "image" ? "1MB" : "10MB"} limit`,
          variant: "destructive",
        })
      }

      return isValidType && isValidSize
    })

    setSelectedFiles(validFiles)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upload Media</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          defaultValue="image"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "image" | "video")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>Photos</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4" />
              <span>Video</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-2">
                <UploadIcon className="h-10 w-10 text-muted-foreground" />
                <h3 className="font-medium">Upload Images</h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to select up to 10 images (max 1MB each)
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
              <div className="flex flex-col items-center gap-2">
                <UploadIcon className="h-10 w-10 text-muted-foreground" />
                <h3 className="font-medium">Upload Video</h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to select a video (max 30 seconds, 10MB)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
            <ul className="space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex justify-between items-center text-sm">
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Add a description for your media..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEFAULT_CATEGORIES.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => handleCategoryToggle(category)}
                />
                <Label htmlFor={`category-${category}`}>{category}</Label>
              </div>
            ))}
          </div>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-right">{uploadProgress}%</div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </CardFooter>
    </Card>
  )
}
