import EnhancedPolyphoneSynthesizer from "@/components/enhanced-polyphone-synthesizer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-6">Refined Polyphone Synthesizer</h1>
      <p className="text-gray-300 mb-8 text-center max-w-md">
        Create harmonious sounds with finger flexion. Bend your fingers to play different notes within a musical scale,
        automatically harmonized to create pleasant chords.
      </p>
      <EnhancedPolyphoneSynthesizer />
    </main>
  )
}
