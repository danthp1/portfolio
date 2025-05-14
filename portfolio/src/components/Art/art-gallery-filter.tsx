"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export default function ArtGalleryFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get current filter values
  const currentSort = searchParams.get("sort") || "publishedAt"

  // Create a new URLSearchParams instance and update it
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams],
  )

  // Handle sort change
  const handleSortChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("sort", value)}`)
  }

  // Reset all filters
  const resetFilters = () => {
    router.push(pathname)
  }

  // Check if any filters are applied
  const hasFilters = searchParams.toString() !== ""

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Sort by:</span>
        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publishedAt">Newest first</SelectItem>
            <SelectItem value="-publishedAt">Oldest first</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="-title">Title Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add more filters here as needed */}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
          <X className="h-4 w-4 mr-2" />
          Reset filters
        </Button>
      )}
    </div>
  )
}
