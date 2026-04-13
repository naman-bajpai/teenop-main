"use client"

import { useState } from "react"
import { BackgroundPaperShaders } from "@/components/ui/background-paper-shaders"

export default function BackgroundPaperShadersDemo() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("npm install @react-three/fiber three")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <BackgroundPaperShaders className="opacity-70" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center font-mono text-xs text-white/60">
          <div>...paper-shaders...</div>
          <div className="mt-1 flex items-center gap-2 justify-center">
            <span>npm install @react-three/fiber three</span>
            <button
              onClick={copyToClipboard}
              className="pointer-events-auto opacity-40 hover:opacity-70 transition-opacity text-white/80"
              title="Copy to clipboard"
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
