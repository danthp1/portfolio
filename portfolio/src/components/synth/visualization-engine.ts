// Enhanced visualization engine for the synthesizer

export interface VisualizationParams {
  rotation: number
  scale: number
  complexity: number
  intensity: number
  symmetry: number
}

export class VisualizationEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode
  private animationFrame: number | null = null
  private params: VisualizationParams
  private presetColors: Record<string, { primary: string; secondary: string; tertiary: string }> = {
    cs80: { primary: "#FFFFFF", secondary: "#AAAAAA", tertiary: "#555555" },
    prophet: { primary: "#F0F0F0", secondary: "#909090", tertiary: "#404040" },
    dx7: { primary: "#E0E0E0", secondary: "#707070", tertiary: "#303030" },
    juno: { primary: "#FAFAFA", secondary: "#A0A0A0", tertiary: "#505050" },
    minimoog: { primary: "#FFFFFF", secondary: "#808080", tertiary: "#404040" },
  }
  private currentPreset = "cs80"
  private frequencyData: Uint8Array
  private timeData: Uint8Array
  private lastFrameTime = 0
  private smoothedParams: VisualizationParams
  private smoothingFactor = 0.15 // Lower = smoother transitions

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.analyser = analyser

    // Set up analyzer
    this.analyser.fftSize = 2048
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.fftSize)

    // Default parameters
    this.params = {
      rotation: 0,
      scale: 1,
      complexity: 5,
      intensity: 0.5,
      symmetry: 4,
    }

    // Initialize smoothed params
    this.smoothedParams = { ...this.params }

    // Handle resize
    window.addEventListener("resize", this.handleResize)

    // Initial resize
    this.handleResize()
  }

  // Handle canvas resize
  public handleResize = () => {
    if (this.canvas) {
      // Get the current dimensions of the container
      const rect = this.canvas.getBoundingClientRect()

      // Set canvas dimensions to match container
      this.canvas.width = rect.width
      this.canvas.height = rect.height

      // Apply device pixel ratio for sharper rendering
      const dpr = window.devicePixelRatio || 1
      if (dpr > 1) {
        this.canvas.width = rect.width * dpr
        this.canvas.height = rect.height * dpr
        this.ctx.scale(dpr, dpr)
      }
    }
  }

  public setPreset(preset: string) {
    this.currentPreset = preset
  }

  public updateParams(params: Partial<VisualizationParams>) {
    this.params = { ...this.params, ...params }
  }

  public start() {
    this.lastFrameTime = performance.now()
    this.draw()
  }

  public stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  // Clean up event listeners
  public dispose() {
    this.stop()
    window.removeEventListener("resize", this.handleResize)
  }

  private draw = () => {
    const { canvas, ctx, analyser } = this
    const currentTime = performance.now()
    const _deltaTime = (currentTime - this.lastFrameTime) / 1000 // in seconds
    this.lastFrameTime = currentTime

    // Get frequency and time domain data
    analyser.getByteFrequencyData(this.frequencyData)
    analyser.getByteTimeDomainData(this.timeData)

    // Calculate sound energy level for dynamic effects
    let energyLevel = 0
    for (let i = 0; i < this.frequencyData.length; i++) {
      energyLevel += this.frequencyData[i]
    }
    energyLevel = energyLevel / this.frequencyData.length / 255

    // Smooth parameter transitions
    this.smoothedParams.rotation = this.lerp(this.smoothedParams.rotation, this.params.rotation, this.smoothingFactor)
    this.smoothedParams.scale = this.lerp(this.smoothedParams.scale, this.params.scale, this.smoothingFactor)
    this.smoothedParams.complexity = this.lerp(
      this.smoothedParams.complexity,
      this.params.complexity,
      this.smoothingFactor,
    )
    this.smoothedParams.intensity = this.lerp(
      this.smoothedParams.intensity,
      this.params.intensity,
      this.smoothingFactor,
    )
    this.smoothedParams.symmetry = this.lerp(this.smoothedParams.symmetry, this.params.symmetry, this.smoothingFactor)

    // Clear canvas
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Center point
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Get visualization parameters
    const { rotation, scale, complexity, intensity, symmetry } = this.smoothedParams

    // Get preset colors
    const colors = this.presetColors[this.currentPreset] || this.presetColors.cs80

    // Draw visualization
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation + (energyLevel * Math.PI) / 8) // Add energy-based rotation

    // Draw sine wave visualization
    this.drawSineWaves(ctx, energyLevel, colors)

    // Draw multiple layers
    const layerCount = 5 + Math.floor(energyLevel * 3) // Dynamic layers based on energy
    for (let layer = 1; layer <= layerCount; layer++) {
      const layerScale = scale * layer * (1 + energyLevel * 0.5)

      // Calculate dynamic symmetry points based on preset and energy
      const dynamicSymmetry = Math.floor(symmetry * (1 + energyLevel * 0.5))

      // Draw symmetrical pattern
      for (let i = 0; i < dynamicSymmetry; i++) {
        ctx.save()
        ctx.rotate(((Math.PI * 2) / dynamicSymmetry) * i)

        ctx.beginPath()

        // Create a path based on frequency data
        const complexityPoints = Math.floor(complexity * (1 + energyLevel))
        for (let j = 0; j < this.frequencyData.length; j += Math.floor(this.frequencyData.length / complexityPoints)) {
          const value = this.frequencyData[j] / 128.0
          const x = Math.cos(j * 0.02) * value * 100 * layerScale
          const y = Math.sin(j * 0.02) * value * 100 * layerScale

          if (j === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        // Close the path
        ctx.closePath()

        // Style based on layer and preset
        const alpha = ((layerCount + 1 - layer) / layerCount) * intensity * (0.7 + energyLevel * 0.3)

        // Use preset-specific colors
        ctx.strokeStyle = layer % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(200, 200, 200, ${alpha})`

        ctx.lineWidth = (layerCount + 1 - layer) * (0.5 + energyLevel)
        ctx.stroke()

        ctx.restore()
      }
    }

    // Draw center core with energy-responsive size
    const activeSoundsSize = 20 + energyLevel * 40
    const pulseEffect = Math.sin(currentTime * 0.005) * 5 * energyLevel
    const coreSize = activeSoundsSize + pulseEffect

    // Main center
    ctx.beginPath()
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2)
    ctx.fillStyle = colors.primary
    ctx.fill()

    // Inner core details
    if (energyLevel > 0.1) {
      // Medium circle
      ctx.beginPath()
      ctx.arc(0, 0, coreSize * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = "black"
      ctx.fill()

      // Small circle
      ctx.beginPath()
      ctx.arc(0, 0, coreSize * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = colors.primary
      ctx.fill()

      // Smallest circle
      if (energyLevel > 0.3) {
        ctx.beginPath()
        ctx.arc(0, 0, coreSize * 0.2, 0, Math.PI * 2)
        ctx.fillStyle = "black"
        ctx.fill()
      }
    }

    // Add frequency lines for high energy
    if (energyLevel > 0.2) {
      const lineCount = Math.floor(energyLevel * 12)
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = 1

      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2
        const length = 100 + Math.random() * 100 * energyLevel

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
        ctx.stroke()
      }
    }

    ctx.restore()

    // Continue animation
    this.animationFrame = requestAnimationFrame(this.draw)
  }

  // Draw sine wave visualizations
  private drawSineWaves(ctx: CanvasRenderingContext2D, energyLevel: number, colors: any) {
    const width = this.canvas.width
    const height = this.canvas.height

    // Draw time domain data as sine wave
    ctx.save()
    ctx.resetTransform()

    // Draw multiple sine waves with different characteristics
    this.drawWave(ctx, this.timeData, width, height, 0.5, colors.primary, 2, 0)

    if (energyLevel > 0.2) {
      this.drawWave(ctx, this.timeData, width, height, 0.3, colors.secondary, 1.5, 0.2)
    }

    if (energyLevel > 0.4) {
      this.drawWave(ctx, this.timeData, width, height, 0.2, colors.tertiary, 1, 0.4)
    }

    ctx.restore()
  }

  // Draw a single wave
  private drawWave(
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number,
    amplitude: number,
    color: string,
    lineWidth: number,
    offset: number,
  ) {
    const sliceWidth = width / data.length

    ctx.beginPath()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color

    // Start at the left side
    let x = 0

    // Use only a portion of the data for smoother waves
    const step = 2
    const startIndex = Math.floor(data.length * offset) % data.length

    for (let i = 0; i < data.length; i += step) {
      const index = (startIndex + i) % data.length
      const v = data[index] / 128.0 // Convert to range -1 to 1
      const y = height / 2 + (v - 1) * height * amplitude

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth * step
    }

    // Draw the wave
    ctx.stroke()
  }

  // Linear interpolation helper
  private lerp(start: number, end: number, amount: number): number {
    return start * (1 - amount) + end * amount
  }
}
