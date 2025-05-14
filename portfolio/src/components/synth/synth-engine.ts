

// Oscillator types
export type OscillatorType = "sine" | "triangle" | "sawtooth" | "square"

// Synth Preset interface
export interface SynthPreset {
  name: string
  description: string
  oscillators: {
    type: OscillatorType
    volume: number
    detune: number
    octave: number
  }[]
  filter: {
    type: BiquadFilterType
    frequency: number
    Q: number
    gain: number
  }
  effects: {
    reverb: number // 0-1
    delay: {
      time: number // seconds
      feedback: number // 0-1
    }
    distortion: number // 0-1
  }
  lfo: {
    rate: number // Hz
    amount: number // 0-1
    destination: "filter" | "pitch" | "amplitude"
  }
}

// Predefined synth models
export const SYNTH_PRESETS: Record<string, SynthPreset> = {
  cs80: {
    name: "CS-80 Brass",
    description: "Rich and warm brass sounds inspired by the legendary Yamaha CS-80",
    oscillators: [
      { type: "sawtooth", volume: 0.6, detune: 0, octave: 0 },
      { type: "sawtooth", volume: 0.4, detune: 7, octave: 0 },
      { type: "square", volume: 0.2, detune: -5, octave: 1 },
    ],
    filter: {
      type: "lowpass",
      frequency: 1200,
      Q: 2,
      gain: 0,
    },
    effects: {
      reverb: 0.3,
      delay: {
        time: 0.3,
        feedback: 0.2,
      },
      distortion: 0.1,
    },
    lfo: {
      rate: 0.5,
      amount: 0.2,
      destination: "filter",
    },
  },
  prophet: {
    name: "Prophet Pad",
    description: "Lush and evolving pads inspired by Sequential Prophet synths",
    oscillators: [
      { type: "sawtooth", volume: 0.5, detune: 0, octave: 0 },
      { type: "sawtooth", volume: 0.5, detune: 7, octave: 0 },
      { type: "sine", volume: 0.3, detune: 0, octave: 1 },
    ],
    filter: {
      type: "lowpass",
      frequency: 800,
      Q: 1,
      gain: 0,
    },
    effects: {
      reverb: 0.6,
      delay: {
        time: 0.4,
        feedback: 0.4,
      },
      distortion: 0,
    },
    lfo: {
      rate: 0.2,
      amount: 0.3,
      destination: "filter",
    },
  },
  dx7: {
    name: "DX7 Bell",
    description: "Crystalline FM sounds inspired by the iconic Yamaha DX7",
    oscillators: [
      { type: "sine", volume: 0.8, detune: 0, octave: 0 },
      { type: "sine", volume: 0.5, detune: 0, octave: 2 },
      { type: "sine", volume: 0.3, detune: 0, octave: 3 },
    ],
    filter: {
      type: "highpass",
      frequency: 300,
      Q: 1,
      gain: 0,
    },
    effects: {
      reverb: 0.7,
      delay: {
        time: 0.3,
        feedback: 0.3,
      },
      distortion: 0,
    },
    lfo: {
      rate: 4,
      amount: 0.1,
      destination: "pitch",
    },
  },
  juno: {
    name: "Juno Chorus",
    description: "Classic Roland Juno-style sounds with rich chorus",
    oscillators: [
      { type: "sawtooth", volume: 0.6, detune: 0, octave: 0 },
      { type: "square", volume: 0.4, detune: 5, octave: 0 },
      { type: "triangle", volume: 0.3, detune: -5, octave: 0 },
    ],
    filter: {
      type: "lowpass",
      frequency: 1000,
      Q: 2.5,
      gain: 0,
    },
    effects: {
      reverb: 0.4,
      delay: {
        time: 0.2,
        feedback: 0.3,
      },
      distortion: 0.05,
    },
    lfo: {
      rate: 0.6,
      amount: 0.4,
      destination: "filter",
    },
  },
  minimoog: {
    name: "Minimoog Bass",
    description: "Powerful analog bass sounds inspired by the Minimoog",
    oscillators: [
      { type: "sawtooth", volume: 0.7, detune: 0, octave: 0 },
      { type: "square", volume: 0.5, detune: 0, octave: 0 },
      { type: "sawtooth", volume: 0.3, detune: 0, octave: -1 },
    ],
    filter: {
      type: "lowpass",
      frequency: 500,
      Q: 8,
      gain: 0,
    },
    effects: {
      reverb: 0.1,
      delay: {
        time: 0.15,
        feedback: 0.1,
      },
      distortion: 0.3,
    },
    lfo: {
      rate: 2,
      amount: 0.15,
      destination: "filter",
    },
  },
}

export class SynthEngine {
  private ctx: AudioContext
  private masterGain: GainNode
  private analyser: AnalyserNode

  // Effects
  private reverbNode: ConvolverNode | null = null
  private reverbGain: GainNode
  private delayNode: DelayNode
  private delayFeedback: GainNode
  private distortion: WaveShaperNode
  private filter: BiquadFilterNode
  private lfo: OscillatorNode
  private lfoGain: GainNode
  private compressor: DynamicsCompressorNode

  private irReady = false
  private activePreset: SynthPreset
  private chordUpdateInterval: number | null = null
  private chordProgressionActive = false

  constructor(ctx: AudioContext, analyser: AnalyserNode) {
    this.ctx = ctx
    this.analyser = analyser

    // Master gain
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = 0.7

    // Create compressor for overall dynamics control
    this.compressor = ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -24
    this.compressor.knee.value = 30
    this.compressor.ratio.value = 12
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.25

    // Create filter
    this.filter = ctx.createBiquadFilter()
    this.filter.type = "lowpass"
    this.filter.frequency.value = 1000
    this.filter.Q.value = 1

    // Create LFO
    this.lfo = ctx.createOscillator()
    this.lfo.type = "sine"
    this.lfo.frequency.value = 0.5
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 0
    this.lfo.connect(this.lfoGain)
    this.lfo.start()

    // Effects chain

    // Distortion
    this.distortion = ctx.createWaveShaper()
    this.distortion.curve = this.makeDistortionCurve(0)
    this.distortion.oversample = "4x"

    // Delay
    this.delayNode = ctx.createDelay(5.0)
    this.delayNode.delayTime.value = 0.3
    this.delayFeedback = ctx.createGain()
    this.delayFeedback.gain.value = 0.3

    // Reverb
    this.reverbGain = ctx.createGain()
    this.reverbGain.gain.value = 0.3

    // Load impulse response for reverb
    this.loadImpulseResponse()

    // Connect effects chain
    this.masterGain.connect(this.distortion)
    this.distortion.connect(this.filter)
    this.filter.connect(this.delayNode)
    this.filter.connect(this.compressor)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode)
    this.delayNode.connect(this.compressor)
    this.compressor.connect(this.ctx.destination)
    this.compressor.connect(this.analyser)

    // Default preset
    this.activePreset = SYNTH_PRESETS.cs80
    this.applyPreset(this.activePreset)
  }

  // Create voice with complex oscillator structure
  createVoice(frequency: number, velocity = 0.7): { oscillators: OscillatorNode[]; gain: GainNode } {
    const voiceGain = this.ctx.createGain()
    voiceGain.gain.value = Math.min(Math.max(velocity, 0), 1) * 0.3 // Scale velocity and limit range

    // Apply attack envelope
    voiceGain.gain.setValueAtTime(0, this.ctx.currentTime)
    voiceGain.gain.linearRampToValueAtTime(Math.min(Math.max(velocity, 0), 1) * 0.3, this.ctx.currentTime + 0.02)

    voiceGain.connect(this.masterGain)

    const oscillators: OscillatorNode[] = []

    // Create oscillators based on active preset
    this.activePreset.oscillators.forEach((osc) => {
      const oscillator = this.ctx.createOscillator()
      oscillator.type = osc.type

      // Calculate frequency with octave shift
      const octaveShift = Math.pow(2, osc.octave)
      oscillator.frequency.value = frequency * octaveShift

      // Apply detune (cents)
      oscillator.detune.value = osc.detune

      // Create gain for this oscillator
      const oscGain = this.ctx.createGain()
      oscGain.gain.value = osc.volume

      // Connect
      oscillator.connect(oscGain)
      oscGain.connect(voiceGain)

      // Start oscillator
      oscillator.start()
      oscillators.push(oscillator)
    })

    return { oscillators, gain: voiceGain }
  }

  // Update a voice's parameters
  updateVoice(
      voice: { oscillators: OscillatorNode[]; gain: GainNode },
      frequency: number,
      velocity: number,
      handPosition: { x: number; y: number },
  ) {
    if (!voice.oscillators.length) return

    // Update oscillator frequencies based on preset octave settings
    voice.oscillators.forEach((osc, index) => {
      const octaveShift = Math.pow(2, this.activePreset.oscillators[index]?.octave || 0)
      osc.frequency.setValueAtTime(frequency * octaveShift, this.ctx.currentTime)
    })

    // Update gain based on velocity
    voice.gain.gain.setTargetAtTime(Math.min(Math.max(velocity, 0), 1) * 0.3, this.ctx.currentTime, 0.05)

    // Modulate parameters based on hand position
    if (handPosition) {
      this.modulateParameters(handPosition)
    }
  }

  // Process hand position to modulate synth parameters
  modulateParameters(handPosition: { x: number; y: number }) {
    // Normalize positions to 0-1 range (assume x and y are in 0-640 range)
    const normalizedX = Math.min(Math.max(handPosition.x, 0), 640) / 640
    const normalizedY = Math.min(Math.max(handPosition.y, 0), 480) / 480

    // Modulate filter frequency based on Y position (higher hand = higher frequency)
    const minFreq = 100
    const maxFreq = 8000
    const filterFreq = minFreq + (1 - normalizedY) * (maxFreq - minFreq)
    this.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1)

    // Modulate LFO rate based on X position
    const minLFORate = 0.1
    const maxLFORate = 10
    const lfoRate = minLFORate + normalizedX * (maxLFORate - minLFORate)
    this.lfo.frequency.setTargetAtTime(lfoRate, this.ctx.currentTime, 0.1)

    // Modulate reverb amount based on Y position
    const reverbAmount = normalizedY * 0.8
    this.reverbGain.gain.setTargetAtTime(reverbAmount, this.ctx.currentTime, 0.1)

    // Modulate delay time based on X position
    const minDelayTime = 0.1
    const maxDelayTime = 0.7
    const delayTime = minDelayTime + normalizedX * (maxDelayTime - minDelayTime)
    this.delayNode.delayTime.setTargetAtTime(delayTime, this.ctx.currentTime, 0.1)
  }

  // Apply a preset to the synthesizer
  applyPreset(preset: SynthPreset) {
    this.activePreset = preset

    // Apply filter settings
    this.filter.type = preset.filter.type
    this.filter.frequency.value = preset.filter.frequency
    this.filter.Q.value = preset.filter.Q
    if (preset.filter.type === "lowshelf" || preset.filter.type === "highshelf" || preset.filter.type === "peaking") {
      this.filter.gain.value = preset.filter.gain
    }

    // Apply effects settings
    this.reverbGain.gain.value = preset.effects.reverb
    this.delayNode.delayTime.value = preset.effects.delay.time
    this.delayFeedback.gain.value = preset.effects.delay.feedback
    this.distortion.curve = this.makeDistortionCurve(preset.effects.distortion * 400)

    // Apply LFO settings
    this.lfo.frequency.value = preset.lfo.rate
    this.lfoGain.gain.value = preset.lfo.amount * 500 // Scale for more noticeable effect

    // Connect LFO to destination
    this.lfoGain.disconnect()
    if (preset.lfo.destination === "filter") {
      this.lfoGain.connect(this.filter.frequency)
    } else if (preset.lfo.destination === "amplitude") {
      this.lfoGain.connect(this.masterGain.gain)
    }
    // For pitch, the LFO will be connected directly to the oscillator detune in createVoice
  }

  // Create distortion curve for waveshaper
  makeDistortionCurve(amount: number) {
    if (amount === 0) return null

    const k = amount
    const n_samples = 44100
    const curve = new Float32Array(n_samples)
    const deg = Math.PI / 180

    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1
      curve[i] = ((3 + k) * Math.sin(x * 0.3) * 20 * deg) / (Math.PI + k * Math.abs(x))
    }

    return curve
  }

  // Load impulse response for reverb
  async loadImpulseResponse() {
    try {
      // Create short reverb impulse algorithmically
      const duration = 2.0
      const decay = 0.8
      const sampleRate = this.ctx.sampleRate
      const length = duration * sampleRate
      const impulse = this.ctx.createBuffer(2, length, sampleRate)

      // Fill both channels with noise that decays exponentially
      for (let channel = 0; channel < 2; channel++) {
        const impulseData = impulse.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          const n = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
          impulseData[i] = n
        }
      }

      this.reverbNode = this.ctx.createConvolver()
      this.reverbNode.buffer = impulse

      // Connect reverb
      this.filter.connect(this.reverbNode)
      this.reverbNode.connect(this.reverbGain)
      this.reverbGain.connect(this.compressor)

      this.irReady = true
    } catch (error) {
      console.error("Failed to load reverb impulse response:", error)
    }
  }

  // Start chord progression
  startChordProgression(intervalMs = 2000) {
    if (this.chordProgressionActive) return

    this.chordProgressionActive = true
    this.chordUpdateInterval = window.setInterval(() => {
      // Trigger chord update event
      const event = new CustomEvent("chordUpdate")
      window.dispatchEvent(event)
    }, intervalMs)
  }

  // Stop chord progression
  stopChordProgression() {
    if (this.chordUpdateInterval) {
      clearInterval(this.chordUpdateInterval)
      this.chordUpdateInterval = null
    }
    this.chordProgressionActive = false
  }

  // Get available presets
  getAvailablePresets(): string[] {
    return Object.keys(SYNTH_PRESETS)
  }

  // Get active preset
  getActivePreset(): SynthPreset {
    return this.activePreset
  }

  // Set master volume
  setMasterVolume(volume: number) {
    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime)
  }

  // Clean up resources
  dispose() {
    this.stopChordProgression()

    if (this.lfo) {
      this.lfo.stop()
      this.lfo.disconnect()
    }

    if (this.masterGain) {
      this.masterGain.disconnect()
    }

    if (this.reverbNode) {
      this.reverbNode.disconnect()
    }

    if (this.delayNode) {
      this.delayNode.disconnect()
    }

    if (this.filter) {
      this.filter.disconnect()
    }

    if (this.compressor) {
      this.compressor.disconnect()
    }
  }
}

