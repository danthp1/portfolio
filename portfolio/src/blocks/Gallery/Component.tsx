import React from 'react'
import { cn } from '@/utilities/ui'
import RichText from '@/components/RichText'
import { Media } from '@/components/Media'

import type { GalleryBlock as GalleryBlockProps } from '@/payload-types'

type Props = GalleryBlockProps & {
  className?: string
  enableGutter?: boolean
  disableInnerContainer?: boolean
}

export const GalleryBlock: React.FC<Props> = (props) => {
  const {
    className,
    enableGutter = true,
    images,
    disableInnerContainer,
  } = props

  return (
    <div
      className={cn(
        '',
        {
          container: enableGutter,
        },
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images && images.map((item, index) => (
          <div key={index} className="gallery-item">
            {item.image && typeof item.image === 'object' && (
              <Media
                imgClassName="border border-border rounded-[0.8rem] w-full h-auto"
                resource={item.image}
              />
            )}
            {item.caption && (
              <div
                className={cn(
                  'mt-2',
                  {
                    container: !disableInnerContainer,
                  },
                )}
              >
                <RichText data={item.caption} enableGutter={false} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
