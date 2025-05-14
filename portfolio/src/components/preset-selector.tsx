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
import type { SynthPreset } from "./synth/synth-engine"
import { Music, ChevronDown } from "lucide-react"

interface PresetSelectorProps {
  presets: Record<string, SynthPreset>
  activePreset: string
  onPresetChange: (presetKey: string) => void
}

export default function PresetSelector({ presets, activePreset, onPresetChange }: PresetSelectorProps) {
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
              <Music className="h-4 w-4 mr-2" />
              <span>{presets[activePreset]?.name || "Select Preset"}</span>
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 b-20 bg-gray-800 border border-gray-700" side="right" align="start" style={{ zIndex: 1100 }}>
          <DropdownMenuLabel className="text-gray-300">Synthesizer Models</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {Object.keys(presets).map((key) => (
            <DropdownMenuItem
              key={key}
              className={`flex flex-col items-start py-2 ${activePreset === key ? "bg-gray-700" : "hover:bg-gray-700"}`}
              onClick={() => {
                onPresetChange(key)
                setIsOpen(false)
              }}
            >
              <div className="font-medium text-white">{presets[key].name}</div>
              <div className="text-xs text-gray-400">{presets[key].description}</div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
