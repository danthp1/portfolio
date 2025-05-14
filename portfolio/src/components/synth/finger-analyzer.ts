// Finger analyzer for detecting and analyzing finger positions and flexion

import { MusicTheory } from "./music-theory"

// Define finger joint indices for the HandPose model
export const FINGER_JOINTS = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
}

export type FingerName = keyof typeof FINGER_JOINTS

// Interface for finger analysis results
export interface FingerAnalysis {
  name: FingerName
  isExtended: boolean
  bendValue: number
  tipPosition: [number, number]
  basePosition: [number, number]
  joints: number[][]
  note: string
  frequency: number
  velocity: number
}

export interface HandAnalysis {
  fingers: FingerAnalysis[]
  palmPosition: [number, number]
  palmVelocity: [number, number]
  handScore: number
  timestamp: number
}

export class FingerAnalyzer {
  private musicTheory: MusicTheory
  private lastHandPosition: [number, number] | null = null
  private lastTimestamp = 0
  private velocitySmoothing = 0.7 // Smoothing factor for velocity calculation

  constructor() {
    this.musicTheory = new MusicTheory("C", "pentatonic", 4)
  }

  // Set the musical key and scale
  setMusicParameters(key: string, scale: string, normalizeToChords = true) {
    this.musicTheory.setKey(key)
    this.musicTheory.setScale(scale as any)
  }

  // Analyze hand landmarks to extract finger information
  analyzeHand(landmarks: number[][], handScore: number): HandAnalysis {
    const now = Date.now()
    const palmPosition: [number, number] = [landmarks[0][0], landmarks[0][1]]

    // Calculate palm velocity
    let palmVelocity: [number, number] = [0, 0]
    if (this.lastHandPosition && this.lastTimestamp) {
      const dt = (now - this.lastTimestamp) / 1000 // Convert to seconds
      if (dt > 0) {
        const rawVelocityX = (palmPosition[0] - this.lastHandPosition[0]) / dt
        const rawVelocityY = (palmPosition[1] - this.lastHandPosition[1]) / dt

        // Apply smoothing
        palmVelocity = [
          rawVelocityX * (1 - this.velocitySmoothing) + (palmVelocity[0] || 0) * this.velocitySmoothing,
          rawVelocityY * (1 - this.velocitySmoothing) + (palmVelocity[1] || 0) * this.velocitySmoothing,
        ]
      }
    }

    // Update last position and timestamp
    this.lastHandPosition = palmPosition
    this.lastTimestamp = now

    // Analyze each finger
    const fingers: FingerAnalysis[] = []

    for (const [name, indices] of Object.entries(FINGER_JOINTS)) {
      const fingerName = name as FingerName

      // Get finger joints
      const joints = indices.map((i) => landmarks[i])

      // Calculate finger bend
      const bendValue = this.musicTheory.calculateFingerBend([
        joints[1], // MCP (base)
        joints[2], // PIP (middle)
        joints[3], // DIP (end)
      ])

      // Determine if finger is extended
      const tipToBaseDistance = this.calculateDistance(joints[0], joints[4])
      const isExtended = tipToBaseDistance > 40 // Threshold in pixels

      // Map bend to note and frequency
      const note = this.musicTheory.mapFingerBendToNote(bendValue, true)
      const frequency = this.musicTheory.getNoteFrequency(note)

      // Calculate velocity (volume) based on how extended the finger is
      const normalizedDistance = Math.min(Math.max(tipToBaseDistance, 0), 200) / 200
      const velocity = isExtended ? 0.3 + normalizedDistance * 0.7 : 0

      fingers.push({
        name: fingerName,
        isExtended,
        bendValue,
        tipPosition: [joints[4][0], joints[4][1]],
        basePosition: [joints[1][0], joints[1][1]],
        joints,
        note,
        frequency,
        velocity,
      })
    }

    return {
      fingers,
      palmPosition,
      palmVelocity,
      handScore,
      timestamp: now,
    }
  }

  // Calculate distance between two points
  private calculateDistance(p1: number[], p2: number[]): number {
    return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2))
  }

  // Update chord progression
  updateChord() {
    this.musicTheory.updateCurrentChord()
  }
}
