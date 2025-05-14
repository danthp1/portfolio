"use client"

import { useEffect, useState, useRef } from "react"

interface ParameterDisplayProps {
  title: string
  value: number
  min: number
  max: number
  unit?: string
  paramType?: "frequency" | "time" | "percentage" | "ratio"
}

export default function ParameterDisplay({
  title,
  value,
  min,
  max,
  unit = "",
  paramType = "percentage",
}: ParameterDisplayProps) {
  const [displayValue, setDisplayValue] = useState<string>("0")
  const prevValueRef = useRef<number>(value)

  useEffect(() => {
    // Only update if the value has actually changed
    if (value !== prevValueRef.current) {
      // Format the value based on the parameter type
      let formattedValue: string

      switch (paramType) {
        case "frequency":
          formattedValue = value < 1000 ? Math.round(value) + " Hz" : (value / 1000).toFixed(1) + " kHz"
          break
        case "time":
          formattedValue = (value * 1000).toFixed(0) + " ms"
          break
        case "percentage":
          formattedValue = Math.round(value * 100) + "%"
          break
        case "ratio":
          formattedValue = value.toFixed(1)
          break
        default:
          formattedValue = value.toFixed(1) + (unit ? ` ${unit}` : "")
      }

      setDisplayValue(formattedValue)
      prevValueRef.current = value
    }
  }, [value, unit, paramType])

  // Calculate percentage for visual display
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  // Determine if value is increasing or decreasing
  const isIncreasing = value > prevValueRef.current
  const isDecreasing = value < prevValueRef.current

  return (
    <div className="flex flex-col items-start justify-center rounded-md bg-gray-800 p-3 border border-gray-700">
      <div className="flex justify-between w-full">
        <span className="text-xs text-gray-400">{title}</span>
        <span
          className={`text-xs font-mono ${
            isIncreasing ? "text-green-400" : isDecreasing ? "text-red-400" : "text-white"
          }`}
        >
          {displayValue}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2">
        <div className="h-full bg-white rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
