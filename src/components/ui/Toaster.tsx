"use client"

// Re-export Sonner as Toaster for backwards compatibility
export { Toaster } from "./Sonner"

// Also export toast function from sonner for programmatic toasts
import { toast } from "sonner"
export { toast }
