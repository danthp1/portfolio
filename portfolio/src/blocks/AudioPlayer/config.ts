import type { Block } from 'payload'

export const AudioPlayer: Block = {
  slug: 'audioPlayer',
  interfaceName: 'AudioPlayerBlock',
  fields: [
    {
      name: 'audio',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: {
        mimeType: { contains: 'audio/' },
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Description',
    },
  ],
}
