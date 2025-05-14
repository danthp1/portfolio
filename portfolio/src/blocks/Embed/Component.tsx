'use client';

import React from 'react';
import { cn } from '@/utilities/ui';

interface EmbedBlockProps {
  embedType: 'youtube' | 'figma' | 'custom';
  youtubeID?: string;
  figmaURL?: string;
  customEmbed?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'custom';
  customHeight?: number;
  className?: string;
}

export const EmbedBlock: React.FC<EmbedBlockProps> = ({
  embedType,
  youtubeID,
  figmaURL,
  customEmbed,
  aspectRatio = '16:9',
  customHeight,
  className,
}) => {
  // Calculate aspect ratio padding
  const getAspectRatioPadding = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'pb-[56.25%]'; // 9/16 = 0.5625 = 56.25%
      case '4:3':
        return 'pb-[75%]'; // 3/4 = 0.75 = 75%
      case '1:1':
        return 'pb-[100%]'; // 1/1 = 1 = 100%
      case 'custom':
        return '';
      default:
        return 'pb-[56.25%]';
    }
  };

  // Render YouTube embed
  if (embedType === 'youtube' && youtubeID) {
    return (
      <div className={cn('container mx-auto my-8', className)}>
        <div className={cn('relative w-full', aspectRatio !== 'custom' ? getAspectRatioPadding() : '')}>
          <iframe
            className={cn(
              'absolute top-0 left-0 w-full h-full rounded-lg',
              aspectRatio === 'custom' ? '' : 'absolute top-0 left-0'
            )}
            style={aspectRatio === 'custom' ? { height: `${customHeight}px` } : {}}
            src={`https://www.youtube.com/embed/${youtubeID}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    );
  }

  // Render Figma embed
  if (embedType === 'figma' && figmaURL) {
    return (
      <div className={cn('container mx-auto my-8', className)}>
        <div className={cn('relative w-full', aspectRatio !== 'custom' ? getAspectRatioPadding() : '')}>
          <iframe
            className={cn(
              'absolute top-0 left-0 w-full h-full rounded-lg',
              aspectRatio === 'custom' ? '' : 'absolute top-0 left-0'
            )}
            style={aspectRatio === 'custom' ? { height: `${customHeight}px` } : {}}
            src={figmaURL}
            title="Figma embed"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    );
  }

  // Render custom embed
  if (embedType === 'custom' && customEmbed) {
    return (
      <div className={cn('container mx-auto my-8', className)}>
        <div
          className="custom-embed"
          dangerouslySetInnerHTML={{ __html: customEmbed }}
        />
      </div>
    );
  }

  // Fallback if no valid embed is provided
  return (
    <div className={cn('container mx-auto my-8 p-4 border border-red-300 bg-red-50 rounded-lg', className)}>
      <p className="text-red-500">Invalid embed configuration. Please check your settings.</p>
    </div>
  );
};
