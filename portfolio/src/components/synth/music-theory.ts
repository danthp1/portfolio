// Music theory utilities for harmonious sound generation

// Define musical scales
export type ScaleType = "pentatonic" | "major" | "minor" | "blues" | "chromatic"

// Note frequencies in Hz (A4 = 440Hz standard tuning)
export const NOTE_FREQUENCIES: Record<string, number> = {
  C3: 130.81,
  "C#3": 138.59,
  D3: 146.83,
  "D#3": 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.0,
  G3: 196.0,
  "G#3": 207.65,
  A3: 220.0,
  "A#3": 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
}

// All notes in order
export const ALL_NOTES = Object.keys(NOTE_FREQUENCIES)

// Scale definitions (semitone intervals from root)
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  pentatonic: [0, 2, 4, 7, 9], // Major pentatonic (1, 2, 3, 5, 6)
  major: [0, 2, 4, 5, 7, 9, 11], // Major scale (1, 2, 3, 4, 5, 6, 7)
  minor: [0, 2, 3, 5, 7, 8, 10], // Natural minor (1, 2, b3, 4, 5, b6, b7)
  blues: [0, 3, 5, 6, 7, 10], // Blues scale (1, b3, 4, b5, 5, b7)
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All 12 semitones
}

// Common chord types
export const CHORD_TYPES = {
  major: [0, 4, 7], // Root, major third, perfect fifth
  minor: [0, 3, 7], // Root, minor third, perfect fifth
  dominant7: [0, 4, 7, 10], // Root, major third, perfect fifth, minor seventh
  major7: [0, 4, 7, 11], // Root, major third, perfect fifth, major seventh
  minor7: [0, 3, 7, 10], // Root, minor third, perfect fifth, minor seventh
  sus2: [0, 2, 7], // Root, major second, perfect fifth
  sus4: [0, 5, 7], // Root, perfect fourth, perfect fifth
  dim: [0, 3, 6], // Root, minor third, diminished fifth
  aug: [0, 4, 8], // Root, major third, augmented fifth
}

// Chord progressions by key (using Roman numeral notation)
export const CHORD_PROGRESSIONS = {
  // Common progressions in C major
  C: [
    ["C", "F", "G", "C"], // I-IV-V-I
    ["C", "Am", "F", "G"], // I-vi-IV-V
    ["C", "G", "Am", "F"], // I-V-vi-IV
    ["Dm", "G", "C", "Am"], // ii-V-I-vi
  ],
}

// Define musical keys with their root notes
export const MUSICAL_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]

// Class to handle musical theory operations
export class MusicTheory {
  private currentKey = "C"
  private currentScale: ScaleType = "pentatonic"
  private currentOctave = 4
  private currentChordProgression: string[][] = CHORD_PROGRESSIONS["C"]
  private currentChordIndex = 0
  private currentChord: string[] = []

  constructor(key = "C", scale: ScaleType = "pentatonic", octave = 4) {
    this.setKey(key)
    this.setScale(scale)
    this.setOctave(octave)
    this.updateCurrentChord()
  }

  // Set the musical key
  setKey(key: string) {
    if (MUSICAL_KEYS.includes(key)) {
      this.currentKey = key
      this.updateCurrentChord()
    }
  }

  // Set the scale type
  setScale(scale: ScaleType) {
    this.currentScale = scale
    this.updateCurrentChord()
  }

  // Set the octave
  setOctave(octave: number) {
    if (octave >= 1 && octave <= 7) {
      this.currentOctave = octave
    }
  }

  // Get the root note index in the chromatic scale
  private getRootNoteIndex(): number {
    const rootNote = this.currentKey.replace(/[0-9]/g, "")
    const noteIndex = ALL_NOTES.findIndex((note) => note.startsWith(rootNote))
    return noteIndex >= 0 ? noteIndex % 12 : 0
  }

  // Get notes in the current scale
  getScaleNotes(): string[] {
    const rootIndex = this.getRootNoteIndex()
    const intervals = SCALE_INTERVALS[this.currentScale]

    return intervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % ALL_NOTES.length
      return ALL_NOTES[noteIndex]
    })
  }

  // Map a normalized value (0-1) to a note in the current scale
  mapToScaleNote(normalizedValue: number): string {
    const scaleNotes = this.getScaleNotes()
    const index = Math.floor(normalizedValue * scaleNotes.length)
    return scaleNotes[Math.min(index, scaleNotes.length - 1)]
  }

  // Get frequency for a given note
  getNoteFrequency(note: string): number {
    return NOTE_FREQUENCIES[note] || 440 // Default to A4 if note not found
  }

  // Map a normalized value (0-1) to a frequency in the current scale
  mapToFrequency(normalizedValue: number): number {
    const note = this.mapToScaleNote(normalizedValue)
    return this.getNoteFrequency(note)
  }

  // Update the current chord based on progression
  updateCurrentChord() {
    if (!this.currentChordProgression[this.currentChordIndex]) {
      this.currentChordIndex = 0
    }

    const chordName = this.currentChordProgression[this.currentChordIndex][0]
    this.currentChord = this.getChordNotes(chordName)

    // Move to next chord in progression
    this.currentChordIndex = (this.currentChordIndex + 1) % this.currentChordProgression[0].length
  }

  // Get notes for a given chord
  getChordNotes(chordName: string): string[] {
    // Parse chord name (e.g., "Cmaj7", "Dm", "G7")
    let root = chordName.charAt(0)
    let chordType = "major"

    if (chordName.length > 1) {
      if (chordName.charAt(1) === "#" || chordName.charAt(1) === "b") {
        root += chordName.charAt(1)
        chordName = chordName.substring(2)
      } else {
        chordName = chordName.substring(1)
      }
    }

    if (chordName === "m" || chordName === "min") chordType = "minor"
    else if (chordName === "7") chordType = "dominant7"
    else if (chordName === "maj7") chordType = "major7"
    else if (chordName === "m7" || chordName === "min7") chordType = "minor7"
    else if (chordName === "sus2") chordType = "sus2"
    else if (chordName === "sus4") chordType = "sus4"
    else if (chordName === "dim") chordType = "dim"
    else if (chordName === "aug") chordType = "aug"

    // Get root note index
    const rootIndex = ALL_NOTES.findIndex((note) => note.startsWith(root))
    if (rootIndex === -1) return []

    // Get chord intervals
    const intervals = CHORD_TYPES[chordType as keyof typeof CHORD_TYPES]

    // Return chord notes
    return intervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % ALL_NOTES.length
      return ALL_NOTES[noteIndex]
    })
  }

  // Normalize a note to the closest note in the current chord
  normalizeToChord(note: string): string {
    if (this.currentChord.includes(note)) return note

    // Find the closest note in the chord
    const noteIndex = ALL_NOTES.indexOf(note)
    if (noteIndex === -1) return note

    let closestNote = note
    let minDistance = Number.POSITIVE_INFINITY

    for (const chordNote of this.currentChord) {
      const chordNoteIndex = ALL_NOTES.indexOf(chordNote)
      const distance = Math.abs(noteIndex - chordNoteIndex)

      if (distance < minDistance) {
        minDistance = distance
        closestNote = chordNote
      }
    }

    return closestNote
  }

  // Map finger bend to a note in the current scale and normalize to chord
  mapFingerBendToNote(bendValue: number, normalizeToChord = true): string {
    // Map bend value (0-1) to a note in the scale
    const scaleNote = this.mapToScaleNote(bendValue)

    // Normalize to chord if requested
    return normalizeToChord ? this.normalizeToChord(scaleNote) : scaleNote
  }

  // Calculate finger bend from joint positions
  calculateFingerBend(joints: number[][]): number {
    if (joints.length < 3) return 0

    // Calculate angles between joints
    const angle1 = this.calculateAngle(joints[0], joints[1], joints[2])

    // Normalize angle to 0-1 range (straight finger ~180°, fully bent ~90°)
    // Map 180° to 0 (straight) and 90° to 1 (fully bent)
    const normalizedBend = Math.max(0, Math.min(1, (180 - angle1) / 90))

    return normalizedBend
  }

  // Calculate angle between three points in degrees
  private calculateAngle(p1: number[], p2: number[], p3: number[]): number {
    // Vectors
    const v1 = [p1[0] - p2[0], p1[1] - p2[1]]
    const v2 = [p3[0] - p2[0], p3[1] - p2[1]]

    // Dot product
    const dot = v1[0] * v2[0] + v1[1] * v2[1]

    // Magnitudes
    const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1])
    const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])

    // Angle in degrees
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI)

    return angle
  }
}
