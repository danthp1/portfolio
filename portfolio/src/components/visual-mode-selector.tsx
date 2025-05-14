"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Eye, ChevronDown } from "lucide-react"

interface VisualModeSelectorProps {
  modes: string[]
  activeMode: number
  onModeChange: (modeIndex: number) => void
}

export default function VisualModeSelector({ modes, activeMode, onModeChange }: VisualModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex justify-between items-center w-full bg-gray-800 border border-gray-700 hover:bg-gray-700"
          >
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              <span>{modes[activeMode] || "Select Visual Mode"}</span>
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700" side="right" align="start" style={{ zIndex: 1100 }}>
          <DropdownMenuLabel className="text-gray-300">Visual Modes</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {modes.map((mode, index) => (
            <DropdownMenuItem
              key={index}
              className={`py-2 ${activeMode === index ? "bg-gray-700" : "hover:bg-gray-700"}`}
              onClick={() => {
                onModeChange(index)
                setIsOpen(false)
              }}
            >
              {mode}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
