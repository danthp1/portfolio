import React from 'react'
import { cn } from '@/utilities/ui'
import RichText from '@/components/RichText'

import type { AudioPlayerBlock as AudioPlayerBlockProps } from '@/payload-types'

type Props = AudioPlayerBlockProps & {
  className?: string
  enableGutter?: boolean
  disableInnerContainer?: boolean
}

export const AudioPlayerBlock: React.FC<Props> = (props) => {
  const {
    className,
    enableGutter = true,
    audio,
    title,
    description,
    disableInnerContainer,
  } = props

  // Get the audio URL
  let audioUrl = ''
  if (audio && typeof audio === 'object' && audio.url) {
    audioUrl = audio.url
  }

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
      <div className="border border-border rounded-[0.8rem] p-6 bg-background">
        {title && (
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
        )}

        {audioUrl && (
          <div className="my-4">
            <audio
              controls
              className="w-full"
              src={audioUrl}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {description && (
          <div
            className={cn(
              'mt-2',
              {
                container: !disableInnerContainer,
              },
            )}
          >
            <RichText data={description} enableGutter={false} />
          </div>
        )}
      </div>
    </div>
  )
}
