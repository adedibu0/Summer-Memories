"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SunIcon, CameraIcon, VideoIcon, BookOpenIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SunIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Summer Memories</h1>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <motion.h2
                  className="text-4xl md:text-5xl font-bold mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  Capture Your{" "}
                  <span className="text-primary">Summer Memories</span>
                </motion.h2>
                <motion.p
                  className="text-lg mb-8 text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Store, organize, and relive your precious summer moments with
                  our AI-powered gallery application.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Link href="/register">
                    <Button size="lg" className="mr-4">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      Log In
                    </Button>
                  </Link>
                </motion.div>
              </div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src="/image.gif"
                    alt="Summer memories collage"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white text-xl font-bold">
                      Your Summer Story
                    </h3>
                    <p className="text-white/80">
                      Organize your photos and videos with ease
                    </p>
                  </div>
                </div>

                <motion.div
                  className="absolute -bottom-4 -right-4 bg-card p-3 rounded-full shadow-lg"
                  animate={{
                    rotate: isHovering ? [0, -10, 10, -5, 5, 0] : 0,
                    transition: { duration: 0.5 },
                  }}
                >
                  <CameraIcon className="h-6 w-6 text-primary" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                className="bg-card p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
                  <CameraIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Photo Gallery</h3>
                <p className="text-muted-foreground">
                  Upload and organize your photos with custom categories and
                  beautiful animations.
                </p>
              </motion.div>

              <motion.div
                className="bg-card p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
                  <VideoIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Video Collection</h3>
                <p className="text-muted-foreground">
                  Store your short videos (up to 30 seconds) alongside your
                  photos.
                </p>
              </motion.div>

              <motion.div
                className="bg-card p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
                  <BookOpenIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Memory Journal</h3>
                <p className="text-muted-foreground">
                  Add notes and stories to your media to capture the full
                  memory.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Summer Memories. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
