'use client'

import React from 'react'
import { TextShimmer } from "@/components/animata/text-shimmer";
import { SpiralAnimation } from "@/components/animata/spiral"
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress = 0 }) => {
  const [startVisible, setStartVisible] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [actualLoadingComplete, setActualLoadingComplete] = useState(false)

  // Fade in the text after animation loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Track when actual loading reaches 100%
  useEffect(() => {
    if (progress >= 100 && !actualLoadingComplete) {
      setActualLoadingComplete(true)
    }
  }, [progress, actualLoadingComplete])

  // Add a 2-second buffer after actual loading is complete
  useEffect(() => {
    if (actualLoadingComplete) {
      // Add a 2-second buffer before starting the fade-out animation
      // This ensures the loading screen stays visible for 2 seconds longer
      // than the actual loading time
      const bufferTimer = setTimeout(() => {
        setLoadingComplete(true)
      }, 2000)

      return () => clearTimeout(bufferTimer)
    }
  }, [actualLoadingComplete])

  return (
    <motion.div
      className="fixed inset-0 w-full h-full overflow-hidden bg-white"
      animate={{
        opacity: loadingComplete ? 0 : 1,
        backgroundColor: "white" // Ensure background stays white during fade-out
      }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      {/* Spiral Animation */}
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>

      {/* Text Shimmer Effect */}
      <div
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
          transition-all duration-1500 ease-out
          ${startVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <div className="text-black text-2xl tracking-[0.2em] uppercase font-extralight">
          <TextShimmer duration={3} spread={4}>
            {progress >= 100 ? "Willkommen" : `Loading ${Math.min(Math.round(progress), 99)}%`}
          </TextShimmer>
        </div>
      </div>
    </motion.div>
  )
}

export default LoadingScreen;
