import type { Block } from 'payload'

export const Embed: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlock',
  fields: [
    {
      name: 'embedType',
      type: 'select',
      required: true,
      options: [
        {
          label: 'YouTube',
          value: 'youtube',
        },
        {
          label: 'Figma',
          value: 'figma',
        },
        {
          label: 'Custom',
          value: 'custom',
        },
      ],
      defaultValue: 'youtube',
      admin: {
        description: 'Select the type of content to embed',
      },
    },
    {
      name: 'youtubeID',
      type: 'text',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.embedType === 'youtube',
        description: 'The YouTube video ID (e.g., dQw4w9WgXcQ from https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
      },
    },
    {
      name: 'figmaURL',
      type: 'text',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.embedType === 'figma',
        description: 'The full Figma embed URL (e.g., https://www.figma.com/embed?...)',
      },
    },
    {
      name: 'customEmbed',
      type: 'textarea',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.embedType === 'custom',
        description: 'Paste the full embed code here',
      },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '16:9',
      options: [
        {
          label: '16:9',
          value: '16:9',
        },
        {
          label: '4:3',
          value: '4:3',
        },
        {
          label: '1:1',
          value: '1:1',
        },
        {
          label: 'Custom',
          value: 'custom',
        },
      ],
      admin: {
        description: 'Select the aspect ratio for the embedded content',
        condition: (_, siblingData) => siblingData?.embedType !== 'custom',
      },
    },
    {
      name: 'customHeight',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData?.aspectRatio === 'custom',
        description: 'Custom height in pixels',
      },
    },
  ],
}
