import { mat4 } from "gl-matrix"

interface ShaderProgramInfo {
  program: WebGLProgram
  attribLocations: {
    vertexPosition: number
    vertexColor?: number
    textureCoord?: number
  }
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation
    modelViewMatrix: WebGLUniformLocation
    time?: WebGLUniformLocation
    resolution?: WebGLUniformLocation
    audioData?: WebGLUniformLocation
    audioDataTexture?: WebGLUniformLocation
    intensity?: WebGLUniformLocation
    colorShift?: WebGLUniformLocation
    complexity?: WebGLUniformLocation
    rotation?: WebGLUniformLocation
  }
}

interface BufferObjects {
  position: WebGLBuffer
  color?: WebGLBuffer
  indices?: WebGLBuffer
  textureCoord?: WebGLBuffer
}

export interface WebGLVisualizationParams {
  intensity: number
  colorShift: number
  complexity: number
  rotation: number
  visualMode: number
}

export class WebGLVisualizationEngine {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private analyser: AnalyserNode
  private animationFrame: number | null = null
  private shaderPrograms: ShaderProgramInfo[] = []
  private buffers: BufferObjects[] = []
  private frequencyData: Uint8Array
  private timeData: Uint8Array
  private audioDataTexture: WebGLTexture | null = null
  private lastFrameTime = 0
  private params: WebGLVisualizationParams
  private visualModes = ["Frequency Spectrum", "Waveform", "Particle Field", "Fractal Flow", "Nebula Flow"]
  private currentMode = 0
  private isWebGLSupported = false
  private currentPreset = "cs80"
  private presetColorMappings: Record<string, { primary: string; secondary: string; tertiary: string }> = {
    cs80: { primary: "#FFFFFF", secondary: "#AAAAAA", tertiary: "#555555" },
    prophet: { primary: "#F0F0F0", secondary: "#909090", tertiary: "#404040" },
    dx7: { primary: "#E0E0E0", secondary: "#707070", tertiary: "#303030" },
    juno: { primary: "#FAFAFA", secondary: "#A0A0A0", tertiary: "#505050" },
    minimoog: { primary: "#FFFFFF", secondary: "#808080", tertiary: "#404040" },
  }

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
    this.canvas = canvas
    this.analyser = analyser

    this.analyser.fftSize = 2048
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.fftSize)

    this.params = {
      intensity: 0.8,
      colorShift: 0.5,
      complexity: 0.7,
      rotation: 0.0,
      visualMode: 0,
    }

    this.initWebGL()
    window.addEventListener("resize", this.handleResize)
    this.handleResize()
  }

  public isSupported(): boolean {
    return this.isWebGLSupported
  }

  public getVisualModes(): string[] {
    return this.visualModes
  }

  public setVisualMode(modeIndex: number): void {
    // Ensure the mode index is valid
    this.currentMode = Math.min(Math.max(0, modeIndex), this.visualModes.length - 1)
    console.log(`Switching to visual mode: ${this.visualModes[this.currentMode]}`)
  }

  public setPreset(preset: string): void {
    this.currentPreset = preset
    switch (preset) {
      case "cs80":
        this.params.colorShift = 0.0
        this.params.complexity = 0.7
        break
      case "prophet":
        this.params.colorShift = 0.2
        this.params.complexity = 0.8
        break
      case "dx7":
        this.params.colorShift = 0.4
        this.params.complexity = 0.9
        break
      case "juno":
        this.params.colorShift = 0.6
        this.params.complexity = 0.6
        break
      case "minimoog":
        this.params.colorShift = 0.8
        this.params.complexity = 0.5
        break
      default:
        this.params.colorShift = 0.5
        this.params.complexity = 0.7
    }
  }

  private initWebGL() {
    try {
      this.gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext

      if (!this.gl) {
        console.error("WebGL not supported, falling back to Canvas 2D")
        return
      }

      this.isWebGLSupported = true
      this.initShaderPrograms()
      this.initBuffers()
      this.initAudioDataTexture()
      console.log("WebGL visualization engine initialized successfully")
    } catch (error) {
      console.error("Error initializing WebGL:", error)
      this.isWebGLSupported = false
    }
  }

  private initShaderPrograms() {
    if (!this.gl) return

    const shaderSources = [
      this.getFrequencySpectrumShaders(),
      this.getWaveformShaders(),
      this.getParticleFieldShaders(),
      this.getFractalFlowShaders(),
      this.getNebulaFlowShaders(),
    ]

    shaderSources.forEach((source) => {
      const program = this.createShaderProgram(source.vertex, source.fragment)
      if (program) {
        const programInfo: ShaderProgramInfo = {
          program,
          attribLocations: {
            vertexPosition: this.gl!.getAttribLocation(program, "aVertexPosition"),
            vertexColor: this.gl!.getAttribLocation(program, "aVertexColor"),
            textureCoord: this.gl!.getAttribLocation(program, "aTextureCoord"),
          },
          uniformLocations: {
            projectionMatrix: this.gl!.getUniformLocation(program, "uProjectionMatrix")!,
            modelViewMatrix: this.gl!.getUniformLocation(program, "uModelViewMatrix")!,
            time: this.gl!.getUniformLocation(program, "uTime")!,
            resolution: this.gl!.getUniformLocation(program, "uResolution")!,
            audioData: this.gl!.getUniformLocation(program, "uAudioData")!,
            audioDataTexture: this.gl!.getUniformLocation(program, "uAudioDataTexture")!,
            intensity: this.gl!.getUniformLocation(program, "uIntensity")!,
            colorShift: this.gl!.getUniformLocation(program, "uColorShift")!,
            complexity: this.gl!.getUniformLocation(program, "uComplexity")!,
            rotation: this.gl!.getUniformLocation(program, "uRotation")!,
          },
        }
        this.shaderPrograms.push(programInfo)
      }
    })
  }

  private initBuffers() {
    if (!this.gl) return

    for (let i = 0; i < this.visualModes.length; i++) {
      let buffer: BufferObjects
      switch (i) {
        case 0:
          buffer = this.createFrequencySpectrumBuffers()
          break
        case 1:
          buffer = this.createWaveformBuffers()
          break
        case 2:
          buffer = this.createParticleFieldBuffers()
          break
        case 3:
          buffer = this.createQuadBuffers() // Full-screen quad for Fractal Flow
          break
        case 4:
          buffer = this.createQuadBuffers() // Full-screen quad for Nebula Flow
          break
        default:
          buffer = this.createQuadBuffers()
      }

      this.buffers.push(buffer)
    }
  }

  private initAudioDataTexture() {
    if (!this.gl) return

    const gl = this.gl
    this.audioDataTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)

    const textureData = new Uint8Array(this.analyser.frequencyBinCount * 2)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      this.analyser.frequencyBinCount,
      2,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      textureData,
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  private updateAudioDataTexture() {
    if (!this.gl || !this.audioDataTexture) return
    const gl = this.gl

    this.analyser.getByteFrequencyData(this.frequencyData)
    this.analyser.getByteTimeDomainData(this.timeData)

    const textureData = new Uint8Array(this.analyser.frequencyBinCount * 2)
    for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
      textureData[i] = this.frequencyData[i]
      textureData[i + this.analyser.frequencyBinCount] = this.timeData[i * 2]
    }

    gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      this.analyser.frequencyBinCount,
      2,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      textureData,
    )
  }

  public handleResize = () => {
    if (!this.canvas || !this.gl) return
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * (window.devicePixelRatio || 1)
    this.canvas.height = rect.height * (window.devicePixelRatio || 1)
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  public setParams(params: Partial<WebGLVisualizationParams>) {
    this.params = { ...this.params, ...params }
    if (params.visualMode !== undefined && params.visualMode !== this.currentMode) {
      this.currentMode = params.visualMode % this.visualModes.length
    }
  }

  public start() {
    if (!this.isWebGLSupported) {
      console.warn("WebGL not supported, visualization not started")
      return
    }

    this.lastFrameTime = performance.now()
    this.draw()
  }

  public stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  public dispose() {
    this.stop()
    window.removeEventListener("resize", this.handleResize)
    if (!this.gl) return

    this.shaderPrograms.forEach((p) => this.gl!.deleteProgram(p.program))
    this.buffers.forEach((b) => {
      if (b.position) this.gl!.deleteBuffer(b.position)
      if (b.color) this.gl!.deleteBuffer(b.color)
      if (b.indices) this.gl!.deleteBuffer(b.indices)
      if (b.textureCoord) this.gl!.deleteBuffer(b.textureCoord)
    })
    if (this.audioDataTexture) this.gl.deleteTexture(this.audioDataTexture)
  }

  private draw = () => {
    if (!this.gl || !this.isWebGLSupported) {
      this.animationFrame = requestAnimationFrame(this.draw)
      return
    }

    const gl = this.gl
    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastFrameTime) / 1000
    this.lastFrameTime = currentTime

    this.updateAudioDataTexture()

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clearDepth(1.0)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Make sure we're using the correct mode index
    const modeIndex = Math.min(this.currentMode, this.shaderPrograms.length - 1)
    const programInfo = this.shaderPrograms[modeIndex]
    const buffers = this.buffers[modeIndex]

    if (!programInfo || !buffers) {
      this.animationFrame = requestAnimationFrame(this.draw)
      return
    }

    // Always use program, even if the mode is not supported.
    gl.useProgram(programInfo.program)

    switch (modeIndex) {
      case 0:
        this.drawFrequencySpectrum(programInfo, buffers, currentTime)
        break
      case 1:
        this.drawWaveform(programInfo, buffers, currentTime)
        break
      case 2:
        this.drawParticleField(programInfo, buffers, currentTime)
        break
      case 3:
        this.drawFractalFlow(programInfo, buffers, currentTime)
        break
      case 4:
        this.drawNebulaFlow(programInfo, buffers, currentTime)
        break
      default:
        this.drawFrequencySpectrum(programInfo, buffers, currentTime)
    }

    this.animationFrame = requestAnimationFrame(this.draw)
  }

  private drawFrequencySpectrum(info: ShaderProgramInfo, buffers: BufferObjects, currentTime: number) {
    const gl = this.gl!
    const projection = this.createProjectionMatrix()
    const modelView = this.createModelViewMatrix()

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(info.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(info.attribLocations.vertexPosition)

    if (buffers.color && info.attribLocations.vertexColor !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
      gl.vertexAttribPointer(info.attribLocations.vertexColor!, 4, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(info.attribLocations.vertexColor!)
    }

    gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, projection)
    gl.uniformMatrix4fv(info.uniformLocations.modelViewMatrix, false, modelView)
    if (info.uniformLocations.time) {
      gl.uniform1f(info.uniformLocations.time, currentTime * 0.001)
    }
    if (info.uniformLocations.resolution) {
      gl.uniform2f(info.uniformLocations.resolution, this.canvas.width, this.canvas.height)
    }
    if (info.uniformLocations.intensity) {
      gl.uniform1f(info.uniformLocations.intensity, this.params.intensity)
    }
    if (info.uniformLocations.colorShift) {
      gl.uniform1f(info.uniformLocations.colorShift, this.params.colorShift)
    }
    if (info.uniformLocations.complexity) {
      gl.uniform1f(info.uniformLocations.complexity, this.params.complexity)
    }
    if (info.uniformLocations.rotation) {
      gl.uniform1f(info.uniformLocations.rotation, this.params.rotation)
    }

    if (info.uniformLocations.audioDataTexture && this.audioDataTexture) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
      gl.uniform1i(info.uniformLocations.audioDataTexture, 0)
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.analyser.frequencyBinCount * 2)
  }

  private drawWaveform(info: ShaderProgramInfo, buffers: BufferObjects, currentTime: number) {
    const gl = this.gl!
    const projection = this.createProjectionMatrix()
    const modelView = this.createModelViewMatrix()

    // Enable depth test for 3D landscape
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)

    // Enable blending for smoother rendering
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(info.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(info.attribLocations.vertexPosition)

    if (buffers.color && info.attribLocations.vertexColor !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
      gl.vertexAttribPointer(info.attribLocations.vertexColor!, 4, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(info.attribLocations.vertexColor!)
    }

    gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, projection)
    gl.uniformMatrix4fv(info.uniformLocations.modelViewMatrix, false, modelView)
    if (info.uniformLocations.time) {
      gl.uniform1f(info.uniformLocations.time, currentTime * 0.001)
    }
    if (info.uniformLocations.resolution) {
      gl.uniform2f(info.uniformLocations.resolution, this.canvas.width, this.canvas.height)
    }
    if (info.uniformLocations.intensity) {
      gl.uniform1f(info.uniformLocations.intensity, this.params.intensity * 1.5) // Increase intensity
    }
    if (info.uniformLocations.colorShift) {
      gl.uniform1f(info.uniformLocations.colorShift, this.params.colorShift)
    }
    if (info.uniformLocations.complexity) {
      gl.uniform1f(info.uniformLocations.complexity, this.params.complexity)
    }
    if (info.uniformLocations.rotation) {
      gl.uniform1f(info.uniformLocations.rotation, this.params.rotation)
    }

    if (info.uniformLocations.audioDataTexture && this.audioDataTexture) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
      gl.uniform1i(info.uniformLocations.audioDataTexture, 0)
    }

    // Bind the index buffer
    if (buffers.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)

      // Draw the mesh as triangles
      const numIndices = 2 * 3 * (64 - 1) * (64 - 1); // 2 triangles per grid cell, 3 vertices per triangle
      gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_SHORT, 0)
    } else {
      // Fallback to drawing points if indices are not available
      const numPoints = (buffers.position as any).bufferData ? (buffers.position as any).bufferData.length / 3 : 1024
      gl.drawArrays(gl.POINTS, 0, numPoints)
    }

    // Disable blend mode
    gl.disable(gl.BLEND)
  }

  private drawParticleField(info: ShaderProgramInfo, buffers: BufferObjects, currentTime: number) {
    const gl = this.gl!
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    const projection = this.createProjectionMatrix()
    const modelView = this.createModelViewMatrix()

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(info.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(info.attribLocations.vertexPosition)

    if (buffers.color && info.attribLocations.vertexColor !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
      gl.vertexAttribPointer(info.attribLocations.vertexColor!, 4, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(info.attribLocations.vertexColor!)
    }

    gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, projection)
    gl.uniformMatrix4fv(info.uniformLocations.modelViewMatrix, false, modelView)
    if (info.uniformLocations.time) {
      gl.uniform1f(info.uniformLocations.time, currentTime * 0.001)
    }
    if (info.uniformLocations.resolution) {
      gl.uniform2f(info.uniformLocations.resolution, this.canvas.width, this.canvas.height)
    }
    if (info.uniformLocations.intensity) {
      gl.uniform1f(info.uniformLocations.intensity, this.params.intensity)
    }
    if (info.uniformLocations.colorShift) {
      gl.uniform1f(info.uniformLocations.colorShift, this.params.colorShift)
    }
    if (info.uniformLocations.complexity) {
      gl.uniform1f(info.uniformLocations.complexity, this.params.complexity)
    }
    if (info.uniformLocations.rotation) {
      gl.uniform1f(info.uniformLocations.rotation, this.params.rotation)
    }

    if (info.uniformLocations.audioDataTexture && this.audioDataTexture) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
      gl.uniform1i(info.uniformLocations.audioDataTexture, 0)
    }

    // Get the correct number of points to draw
    const numPoints = (buffers.position as any).bufferData ? (buffers.position as any).bufferData.length / 3 : 2000 // Fallback to default count

    gl.drawArrays(gl.POINTS, 0, numPoints)
    gl.disable(gl.BLEND)
  }

  private drawFractalFlow(info: ShaderProgramInfo, buffers: BufferObjects, currentTime: number) {
    const gl = this.gl!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(info.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(info.attribLocations.vertexPosition)

    if (buffers.textureCoord && info.attribLocations.textureCoord !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord)
      gl.vertexAttribPointer(info.attribLocations.textureCoord!, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(info.attribLocations.textureCoord!)
    }

    if (info.uniformLocations.time) {
      gl.uniform1f(info.uniformLocations.time, currentTime * 0.001)
    }
    if (info.uniformLocations.resolution) {
      gl.uniform2f(info.uniformLocations.resolution, this.canvas.width, this.canvas.height)
    }
    if (info.uniformLocations.intensity) {
      gl.uniform1f(info.uniformLocations.intensity, this.params.intensity)
    }
    if (info.uniformLocations.colorShift) {
      gl.uniform1f(info.uniformLocations.colorShift, this.params.colorShift)
    }
    if (info.uniformLocations.complexity) {
      gl.uniform1f(info.uniformLocations.complexity, this.params.complexity)
    }
    if (info.uniformLocations.rotation) {
      gl.uniform1f(info.uniformLocations.rotation, this.params.rotation)
    }

    if (info.uniformLocations.audioDataTexture && this.audioDataTexture) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
      gl.uniform1i(info.uniformLocations.audioDataTexture, 0)
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // This method has been replaced by drawNebulaFlow

  // Buffer creation methods
  private createFrequencySpectrumBuffers(): BufferObjects {
    const gl = this.gl!
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    const barCount = 1024
    const positions = new Float32Array(barCount * 4 * 3) // 2 verts per bar, but using strip: bottom0, top0, bottom1, top1 -> 4 verts for first bar
    const colors = new Float32Array(barCount * 4 * 4)

    for (let i = 0; i < barCount; i++) {
      const x = (i / barCount) * 2 - 1
      const width = 2 / barCount
      // bottom
      positions[i * 12] = x
      positions[i * 12 + 1] = -1.0
      positions[i * 12 + 2] = 0.0
      colors.set([1, 1, 1, 1], i * 16)

      // top sentinel
      positions[i * 12 + 3] = x
      positions[i * 12 + 4] = 1.0
      positions[i * 12 + 5] = 0.0
      colors.set([1, 1, 1, 1], i * 16 + 4)

      // next bottom
      positions[i * 12 + 6] = x + width
      positions[i * 12 + 7] = -1.0
      positions[i * 12 + 8] = 0.0
      colors.set([1, 1, 1, 1], i * 16 + 8)

      // next top sentinel
      positions[i * 12 + 9] = x + width
      positions[i * 12 + 10] = 1.0
      positions[i * 12 + 11] = 0.0
      colors.set([1, 1, 1, 1], i * 16 + 12)
    }

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    positionBuffer.bufferData = positions // Store for reference

    const colorBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)

    return { position: positionBuffer, color: colorBuffer }
  }

  private createWaveformBuffers(): BufferObjects {
    const gl = this.gl!
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // Create a grid of points for the landscape
    const gridSize = 64 // Number of points in each dimension
    const positions = []
    const colors = []
    const indices = []

    // Create a grid of vertices
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const xPos = (x / (gridSize - 1)) * 2 - 1
        const zPos = (z / (gridSize - 1)) * 2 - 1

        // Add vertex position
        positions.push(xPos, 0, zPos)

        // Add vertex color (will be modified in shader)
        colors.push(1, 1, 1, 1)

        // Create indices for triangles (except for the last row and column)
        if (x < gridSize - 1 && z < gridSize - 1) {
          const topLeft = z * gridSize + x
          const topRight = topLeft + 1
          const bottomLeft = (z + 1) * gridSize + x
          const bottomRight = bottomLeft + 1

          // First triangle (top-left, bottom-left, bottom-right)
          indices.push(topLeft, bottomLeft, bottomRight)

          // Second triangle (top-left, bottom-right, top-right)
          indices.push(topLeft, bottomRight, topRight)
        }
      }
    }

    // Convert to typed arrays
    const positionsArray = new Float32Array(positions)
    const colorsArray = new Float32Array(colors)
    const indicesArray = new Uint16Array(indices)

    gl.bufferData(gl.ARRAY_BUFFER, positionsArray, gl.STATIC_DRAW)
    positionBuffer.bufferData = positionsArray // Store for reference

    const colorBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colorsArray, gl.STATIC_DRAW)

    const indexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW)

    return { position: positionBuffer, color: colorBuffer, indices: indexBuffer }
  }

  private createParticleFieldBuffers(): BufferObjects {
    const gl = this.gl!
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 4)

    for (let i = 0; i < count; i++) {
      // random start in unit circle
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.5 + 0.1
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = 0.0
      colors.set([1, 1, 1, 1], i * 4)
    }

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    positionBuffer.bufferData = positions // Store for reference

    const colorBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)

    return { position: positionBuffer, color: colorBuffer }
  }

  private createQuadBuffers(): BufferObjects {
    const gl = this.gl!
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0])
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const texBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer)
    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1])
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

    return { position: positionBuffer, textureCoord: texBuffer }
  }

  private createGeometricBuffers(): BufferObjects {
    const gl = this.gl!
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // Define a cube with proper Z values
    const positions = new Float32Array([
      // Front face
      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

      // Back face
      -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

      // Top face
      -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

      // Bottom face
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,

      // Right face
      0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,

      // Left face
      -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
    ])

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    positionBuffer.bufferData = positions // Store for reference

    const colorBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    const colors = new Float32Array([
      // Front face (white)
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      // Back face (red)
      1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1,
      // Top face (green)
      0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
      // Bottom face (blue)
      0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
      // Right face (yellow)
      1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1,
      // Left face (purple)
      1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1,
    ])
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)

    const indexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    const indices = new Uint16Array([
      0,
      1,
      2,
      0,
      2,
      3, // Front
      4,
      5,
      6,
      4,
      6,
      7, // Back
      8,
      9,
      10,
      8,
      10,
      11, // Top
      12,
      13,
      14,
      12,
      14,
      15, // Bottom
      16,
      17,
      18,
      16,
      18,
      19, // Right
      20,
      21,
      22,
      20,
      22,
      23, // Left
    ])
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return { position: positionBuffer, color: colorBuffer, indices: indexBuffer }
  }

  // Draw the Nebula Flow visualization
  private drawNebulaFlow(info: ShaderProgramInfo, buffers: BufferObjects, currentTime: number) {
    const gl = this.gl!
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(info.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(info.attribLocations.vertexPosition)

    if (buffers.textureCoord && info.attribLocations.textureCoord !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord)
      gl.vertexAttribPointer(info.attribLocations.textureCoord!, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(info.attribLocations.textureCoord!)
    }

    if (info.uniformLocations.time) {
      gl.uniform1f(info.uniformLocations.time, currentTime * 0.001)
    }
    if (info.uniformLocations.resolution) {
      gl.uniform2f(info.uniformLocations.resolution, this.canvas.width, this.canvas.height)
    }
    if (info.uniformLocations.intensity) {
      gl.uniform1f(info.uniformLocations.intensity, this.params.intensity)
    }
    if (info.uniformLocations.colorShift) {
      gl.uniform1f(info.uniformLocations.colorShift, this.params.colorShift)
    }
    if (info.uniformLocations.complexity) {
      gl.uniform1f(info.uniformLocations.complexity, this.params.complexity)
    }
    if (info.uniformLocations.rotation) {
      gl.uniform1f(info.uniformLocations.rotation, this.params.rotation)
    }

    if (info.uniformLocations.audioDataTexture && this.audioDataTexture) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioDataTexture)
      gl.uniform1i(info.uniformLocations.audioDataTexture, 0)
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.disable(gl.BLEND)
  }

  // Fix the createModelViewMatrix method to handle rotation properly
  private createProjectionMatrix(): Float32Array {
    const fieldOfView = (45 * Math.PI) / 180 // 45 degrees in radians
    const aspect = this.canvas.width / this.canvas.height
    const zNear = 0.1
    const zFar = 100.0

    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar)
    return projectionMatrix
  }

  // Replace the createModelViewMatrix method
  private createModelViewMatrix(): Float32Array {
    const modelViewMatrix = mat4.create()
    mat4.identity(modelViewMatrix)
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0])

    // Apply rotation based on the current mode
    if (this.currentMode === 4) {
      // Geometric Pulse mode
      mat4.rotateX(modelViewMatrix, modelViewMatrix, this.params.rotation * Math.PI)
      mat4.rotateY(modelViewMatrix, modelViewMatrix, this.params.rotation * Math.PI * 2)
    } else {
      mat4.rotateY(modelViewMatrix, modelViewMatrix, this.params.rotation * Math.PI * 2)
    }

    return modelViewMatrix
  }

  private createShaderProgram(vs: string, fs: string): WebGLProgram | null {
    const gl = this.gl!
    const vShader = this.createShader(gl.VERTEX_SHADER, vs)
    const fShader = this.createShader(gl.FRAGMENT_SHADER, fs)
    if (!vShader || !fShader) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Shader link error:", gl.getProgramInfoLog(program))
      return null
    }
    return program
  }

  private createShader(type: number, src: string): WebGLShader | null {
    const gl = this.gl!
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  // Shader sources
  private getFrequencySpectrumShaders() {
    return {
      vertex: `
precision mediump float;
attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform sampler2D uAudioDataTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uRotation;
uniform float uComplexity;
varying float vAmplitude;
varying vec3 vColor;
varying float vIndex;

void main(void) {
  // Get position and determine if this is a top or bottom vertex
  vec2 pos = aVertexPosition.xy;
  bool isTop = pos.y > 0.0;

  // Calculate frequency index (0-1)
  float index = (pos.x + 1.0) * 0.5;
  vIndex = index;

  // Sample frequency data
  float amp = texture2D(uAudioDataTexture, vec2(index, 0.0)).r;
  vAmplitude = amp;

  // Calculate spherical coordinates based on frequency
  // Phi (horizontal angle around sphere)
  float phi = index * 6.28318;

  // Theta (vertical angle from top to bottom)
  float theta = isTop ? 0.0 : 3.14159;

  // For top vertices, vary theta based on frequency and amplitude
  if (isTop) {
    theta = amp * uIntensity * 1.5;
  }

  // Add rotation based on time and rotation parameter
  phi += uTime * 0.1 * uRotation;

  // Base radius for the spherical arrangement
  float baseRadius = 0.5 + uComplexity * 0.3;

  // Vary radius based on amplitude for top vertices
  float radius = baseRadius;
  if (isTop) {
    radius += amp * uIntensity * 0.5;
  }

  // Convert spherical to Cartesian coordinates for base position
  vec3 basePosition = vec3(
    radius * sin(theta) * cos(phi),
    radius * sin(theta) * sin(phi),
    radius * cos(theta)
  );

  // Calculate tangent vector (90 degrees to radius)
  // First get the normalized direction from center to point
  vec3 radialDir = normalize(basePosition);

  // For top vertices (rays), calculate a tangent vector perpendicular to the radius
  vec3 position;
  if (isTop) {
    // Create a perpendicular vector by using a cross product with up vector
    vec3 upVector = vec3(0.0, 0.0, 1.0);
    vec3 tangent = normalize(cross(radialDir, upVector));

    // If tangent is too small (happens when radialDir is parallel to up),
    // use a different reference vector
    if (length(tangent) < 0.1) {
      tangent = normalize(cross(radialDir, vec3(1.0, 0.0, 0.0)));
    }

    // Create another perpendicular vector to get a vector in the tangent plane
    vec3 bitangent = normalize(cross(radialDir, tangent));

    // Rotate around the radius to create variation
    float rotAngle = phi * 2.0 + uTime * 0.2;
    vec3 finalTangent = tangent * cos(rotAngle) + bitangent * sin(rotAngle);

    // Extend the ray along the tangent direction (90 degrees to radius)
    float rayLength = amp * uIntensity * 0.5;
    position = basePosition + finalTangent * rayLength;
  } else {
    // Bottom vertices stay at base position
    position = basePosition;
  }

  // Add frequency-dependent variation
  float freqModulation = sin(index * 20.0 + uTime) * 0.05 * amp * uIntensity;
  position += position * freqModulation;

  // Add wave modulation for more dynamic effect
  float waveFreq = 3.0 + uComplexity * 5.0;
  position.z += sin(phi * waveFreq + uTime * 0.5) * 0.05 * uIntensity;

  // Apply rotation to the entire sphere
  float rotAngle = uTime * 0.2 * uRotation;
  mat4 rotY = mat4(
    cos(rotAngle), 0.0, sin(rotAngle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(rotAngle), 0.0, cos(rotAngle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  float rotAngleX = uTime * 0.1 * uRotation;
  mat4 rotX = mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(rotAngleX), -sin(rotAngleX), 0.0,
    0.0, sin(rotAngleX), cos(rotAngleX), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  // Apply transformations
  gl_Position = uProjectionMatrix * uModelViewMatrix * rotY * rotX * vec4(position, 1.0);

  // Create color based on frequency and amplitude
  // Use different color ranges for different frequency bands
  vec3 color;
  if (index < 0.33) {
    // Low frequencies - red to yellow
    float t = index / 0.33;
    color = mix(
      vec3(0.8, 0.1, 0.1), // Red
      vec3(0.8, 0.8, 0.1), // Yellow
      t
    );
  } else if (index < 0.66) {
    // Mid frequencies - yellow to green
    float t = (index - 0.33) / 0.33;
    color = mix(
      vec3(0.8, 0.8, 0.1), // Yellow
      vec3(0.1, 0.8, 0.1), // Green
      t
    );
  } else {
    // High frequencies - green to blue
    float t = (index - 0.66) / 0.34;
    color = mix(
      vec3(0.1, 0.8, 0.1), // Green
      vec3(0.1, 0.1, 0.8), // Blue
      t
    );
  }

  // Adjust color based on amplitude and add time-based variation
  color = color * (0.5 + amp * 0.5);
  color += sin(uTime * 0.2 + index * 10.0) * 0.1;

  // Pass color to fragment shader
  vColor = color;
}
`,
      fragment: `
precision mediump float;
varying float vAmplitude;
varying vec3 vColor;
varying float vIndex;

void main(void) {
  // Base color from vertex shader
  vec3 color = vColor;

  // Add subtle gradient based on amplitude
  color *= 0.8 + vAmplitude * 0.4;

  // Add slight edge highlight
  color += pow(vAmplitude, 3.0) * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`,
    }
  }

  private getWaveformShaders() {
    return {
      vertex: `
precision mediump float;
attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform sampler2D uAudioDataTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uRotation;
uniform float uComplexity;
varying vec4 vColor;
varying float vHeight;
varying vec3 vPosition;

// Function to sample audio at different positions
float getAudioSample(float position) {
  return texture2D(uAudioDataTexture, vec2(position, 0.5)).r;
}

// Function to create terrain height based on multiple samples
float getTerrainHeight(float x, float z, float time) {
  // Sample audio at different positions for more varied terrain
  float sample1 = getAudioSample(abs(sin(x * 0.1 + time * 0.05)));
  float sample2 = getAudioSample(abs(cos(z * 0.1 + time * 0.03)));
  float sample3 = getAudioSample(abs(sin((x + z) * 0.15 + time * 0.07)));

  // Combine samples with different weights
  return sample1 * 0.5 + sample2 * 0.3 + sample3 * 0.2;
}

// Function to create a wave pattern for a specific position on the plane
float getWaveHeight(float x, float z, float time) {
  // Calculate multiple wave positions based on x coordinate
  // This creates multiple waves side by side
  float wavePos = mod(x * 10.0, 1.0); // Create repeating pattern

  // Sample audio at the wave position
  float audioSample = getAudioSample(wavePos);

  // Create wave pattern with audio reactivity
  return audioSample * 0.8 * (0.5 + 0.5 * sin(z * 8.0 + time * 2.0));
}

void main(void) {
  // Get the original position and normalize index to 0-1
  float index = (aVertexPosition.x + 1.0) * 0.5;

  // Create a grid-based landscape
  // Map the 1D index to a 2D grid position
  float gridSize = 32.0; // Number of points in each dimension
  float x = mod(index * gridSize, gridSize) / gridSize * 2.0 - 1.0;
  float z = floor(index * gridSize / gridSize) / gridSize * 2.0 - 1.0;

  // Add some variation to grid positions
  x += sin(z * 10.0 + uTime * 0.2) * 0.02;
  z += cos(x * 8.0 + uTime * 0.3) * 0.02;

  // Scale the grid
  float gridScale = 1.5 + uComplexity * 0.5;
  x *= gridScale;
  z *= gridScale;

  // Determine whether to use terrain or wave pattern based on z position
  float terrainHeight = getTerrainHeight(x, z, uTime);
  float waveHeight = getWaveHeight(x, z, uTime);

  // Create a plane of waves in the center area of the landscape
  float wavePlaneArea = smoothstep(0.3, 0.7, abs(z));
  float finalHeight = mix(waveHeight, terrainHeight, wavePlaneArea);

  // Apply intensity and create more dramatic landscape
  float height = finalHeight * uIntensity * 1.5;

  // Create 3D position for landscape
  vec3 pos = vec3(x, height, z);

  // Add wave motion to the entire landscape
  float waveX = sin(z * 3.0 + uTime * 0.7) * 0.1 * uIntensity;
  float waveZ = cos(x * 2.0 + uTime * 0.5) * 0.1 * uIntensity;
  pos.y += sin(distance(pos.xz, vec2(0.0)) * 3.0 + uTime) * 0.1 * uIntensity;
  pos.x += waveX;
  pos.z += waveZ;

  // Apply rotation to the landscape
  float rotAngle = uTime * 0.1 * uRotation;
  mat4 rotY = mat4(
    cos(rotAngle), 0.0, sin(rotAngle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(rotAngle), 0.0, cos(rotAngle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  // Tilt the view to see landscape from above
  float tiltAngle = 0.6 + uRotation * 0.3;
  mat4 tilt = mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(tiltAngle), -sin(tiltAngle), 0.0,
    0.0, sin(tiltAngle), cos(tiltAngle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  // Move the landscape down a bit to center it
  pos.y -= 0.5;

  // Apply transformations
  vec4 transformedPos = rotY * tilt * vec4(pos, 1.0);
  gl_Position = uProjectionMatrix * uModelViewMatrix * transformedPos;

  // Pass height and position to fragment shader for coloring
  vHeight = height;
  vPosition = pos;

  // Create color based on height and position
  float hue = (pos.y + 0.5) * 3.0 + uTime * 0.1;
  vec3 color = vec3(
    0.5 + 0.5 * sin(hue),
    0.5 + 0.5 * sin(hue + 2.09),
    0.5 + 0.5 * sin(hue + 4.18)
  );

  // Add terrain-like coloring
  float snowLine = 0.7;
  float grassLine = 0.3;
  float waterLine = 0.1;

  if (pos.y > snowLine) {
    // Snow peaks
    color = mix(color, vec3(0.9, 0.9, 1.0), (pos.y - snowLine) / (1.0 - snowLine));
  } else if (pos.y > grassLine) {
    // Mountain/rock
    color = mix(color, vec3(0.6, 0.5, 0.4), (pos.y - grassLine) / (snowLine - grassLine));
  } else if (pos.y > waterLine) {
    // Grass/land
    color = mix(color, vec3(0.2, 0.6, 0.3), (pos.y - waterLine) / (grassLine - waterLine));
  } else {
    // Water
    color = mix(color, vec3(0.1, 0.3, 0.7), 1.0 - pos.y / waterLine);
  }

  // Adjust color intensity based on height
  float colorIntensity = 0.5 + terrainHeight * 0.5;
  vColor = vec4(color * colorIntensity, 1.0);
}
`,
      fragment: `
precision mediump float;
varying vec4 vColor;
varying float vHeight;

void main(void) {
  // Create a glow effect based on height
  float glow = abs(vHeight) * 0.5;

  // Combine base color with glow
  vec3 finalColor = vColor.rgb * (1.0 + glow);

  // Output final color
  gl_FragColor = vec4(finalColor, 1.0);
}
`,
    }
  }

  private getParticleFieldShaders() {
    return {
      vertex: `
precision mediump float;
attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform sampler2D uAudioDataTexture;
uniform float uIntensity;
uniform float uComplexity;
uniform float uTime;
uniform float uRotation;
varying float vAlpha;
varying vec3 vColor;
varying float vDistance;

// Function to sample audio at different frequency bands
float getAudioFrequency(float position) {
  return texture2D(uAudioDataTexture, vec2(position, 0.0)).r;
}

// Function to sample audio waveform
float getAudioWaveform(float position) {
  return texture2D(uAudioDataTexture, vec2(position, 0.5)).r;
}

void main(void) {
  // Get base position
  vec3 base = aVertexPosition.xyz;

  // Sample audio at different frequency bands with more granularity
  float lowFreq = getAudioFrequency(0.05);
  float lowMidFreq = getAudioFrequency(0.15);
  float midFreq = getAudioFrequency(0.3);
  float highMidFreq = getAudioFrequency(0.6);
  float highFreq = getAudioFrequency(0.85);

  // Get overall energy level
  float energyLevel = (lowFreq + lowMidFreq + midFreq + highMidFreq + highFreq) / 10.0;

  // Calculate 3D position in spherical coordinates
  float r = length(base.xy);
  float theta = atan(base.y, base.x);
  float phi = atan(length(base.xy), base.z);

  // Add time-based rotation with audio reactivity
  float rotationSpeed = 0.2 + uRotation * 0.3;
  theta += uTime * rotationSpeed;

  // Determine frequency band based on particle's initial position
  // This makes different particles react to different frequency bands
  float particleAngle = mod(theta, 6.28318) / 6.28318;

  // Get the frequency that affects this particle the most
  float particleFreq;
  if (particleAngle < 0.2) {
    particleFreq = lowFreq;
  } else if (particleAngle < 0.4) {
    particleFreq = lowMidFreq;
  } else if (particleAngle < 0.6) {
    particleFreq = midFreq;
  } else if (particleAngle < 0.8) {
    particleFreq = highMidFreq;
  } else {
    particleFreq = highFreq;
  }

  // Enhanced reactivity - particles move much further from center based on their frequency
  float reactivityFactor = 1.0 + particleFreq * uIntensity * 3.0;

  // Apply complexity to create more varied movement patterns
  float complexityFactor = 0.5 + uComplexity * 1.5;

  // Calculate new radius with enhanced reactivity
  float newRadius = r * reactivityFactor * complexityFactor;

  // Add dynamic movement patterns
  newRadius += sin(theta * 5.0 + uTime) * 0.2 * particleFreq;

  // Calculate 3D position with enhanced distance from center
  float x = cos(theta) * newRadius;
  float y = sin(theta) * newRadius;
  float z = base.z + sin(uTime * 0.7 + r * 10.0) * particleFreq * 0.8;

  // Add spiral motion based on frequency
  z += sin(newRadius * 3.0 + uTime * 0.5) * particleFreq * 0.5;

  // Add frequency-dependent oscillation
  x += sin(uTime * (0.5 + particleFreq) + theta * 3.0) * 0.2 * particleFreq;
  y += cos(uTime * (0.6 + particleFreq) + theta * 2.0) * 0.2 * particleFreq;
  z += sin(uTime * (0.7 + particleFreq) + r * 5.0) * 0.3 * particleFreq;

  // Create swarm-like behavior
  float swarmFactor = sin(uTime * 0.2) * 0.5 + 0.5;
  float swarmX = sin(uTime * 0.3) * swarmFactor;
  float swarmY = cos(uTime * 0.4) * swarmFactor;
  float swarmZ = sin(uTime * 0.5) * swarmFactor;

  // Apply swarm behavior based on energy level
  x += swarmX * energyLevel * 0.5;
  y += swarmY * energyLevel * 0.5;
  z += swarmZ * energyLevel * 0.3;

  // Create final position
  vec3 pos = vec3(x, y, z);

  // Store distance from center for coloring
  vDistance = length(pos) / 3.0;

  // Apply 3D rotation for more dynamic movement
  float rotX = uTime * 0.1 * uRotation;
  float rotY = uTime * 0.15 * uRotation;

  mat4 rotationX = mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(rotX), -sin(rotX), 0.0,
    0.0, sin(rotX), cos(rotX), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  mat4 rotationY = mat4(
    cos(rotY), 0.0, sin(rotY), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(rotY), 0.0, cos(rotY), 0.0,
    0.0, 0.0, 0.0, 1.0
  );

  // Apply projection and view transformations
  gl_Position = uProjectionMatrix * uModelViewMatrix * rotationX * rotationY * vec4(pos, 1.0);

  // Calculate point size based on z-position, frequency and distance
  float sizeBase = 3.0 + particleFreq * 20.0 * uIntensity;
  float sizeByDistance = 1.0 + (1.0 / (0.1 + vDistance * 0.3)); // Particles further away appear smaller
  gl_PointSize = sizeBase * sizeByDistance;

  // Calculate alpha for depth and frequency effect
  vAlpha = 0.2 + 0.8 * particleFreq * (0.5 + sin(uTime + newRadius * 5.0) * 0.5);

  // Create more vibrant color based on frequency and position
  float hue = particleAngle * 6.28318 + uTime * 0.1;
  vec3 baseColor = vec3(
    0.5 + 0.5 * sin(hue),
    0.5 + 0.5 * sin(hue + 2.09),
    0.5 + 0.5 * sin(hue + 4.18)
  );

  // Adjust color based on frequency and distance
  vColor = mix(
    baseColor,
    vec3(particleFreq, particleFreq * 0.7, 1.0 - particleFreq * 0.5),
    0.5 + 0.5 * sin(vDistance * 3.0 + uTime)
  );

  // Boost color intensity based on energy level
  vColor *= 0.7 + energyLevel * 0.6;
}
`,
      fragment: `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;

void main(void) {
  // Create circular particles with soft edges
  vec2 d = gl_PointCoord - 0.5;
  float dist = length(d);

  // Discard pixels outside the circle
  if (dist > 0.5) discard;

  // Create soft edge
  float edge = smoothstep(0.5, 0.4, dist);

  // Apply color and alpha
  gl_FragColor = vec4(vColor, vAlpha * edge);
}
`,
    }
  }

  private getFractalFlowShaders() {
    return {
      vertex: `
precision highp float;
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;
uniform float uTime;
varying vec2 vTex;
void main(void) {
  gl_Position = aVertexPosition;
  vTex = aTextureCoord;
}
`,
      fragment: `
precision highp float;
varying vec2 vTex;
uniform sampler2D uAudioDataTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uColorShift;
uniform float uComplexity;
uniform float uRotation;

// Complex number operations
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x-a.x*b.y)/d; }
float cabs(vec2 z) { return length(z); }

// Julia set with audio-reactive parameters
vec3 julia(vec2 uv, float time, vec4 audio) {
  // Audio-reactive parameters
  float audioReactive = audio.r * uIntensity;

  // Create a more dynamic c value based on time and audio
  vec2 c = vec2(
    0.7885 * cos(time * 0.1 + audioReactive * 2.0),
    0.7885 * sin(time * 0.2 + audioReactive * 3.0)
  );

  // Apply rotation based on uRotation
  float angle = uRotation * 6.28318 + time * 0.05;
  uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;

  // Apply zoom based on audio intensity
  float zoom = 1.5 + audioReactive * 1.5;
  vec2 z = uv / zoom;

  // Julia set iteration
  int iter = 0;
  int maxIter = int(40.0 + uComplexity * 60.0);

  for(int i = 0; i < 200; i++) {
    if(i >= maxIter) break;

    // z = z^2 + c (Julia set formula)
    z = cmul(z, z) + c;

    // Check for escape
    if(dot(z, z) > 4.0) {
      iter = i;
      break;
    }
  }

  // If we reached max iterations, point is in the set
  if(iter == maxIter) {
    return vec3(0.0, 0.0, 0.0);
  }

  // Calculate smooth coloring
  float smoothed = float(iter) - log2(log2(dot(z, z))) + 4.0;
  float normalized = smoothed / float(maxIter);

  // Create a more vibrant color palette
  float hue = normalized * 3.0 + uColorShift * 6.28318 + time * 0.1;
  vec3 color;
  color.r = 0.5 + 0.5 * sin(hue);
  color.g = 0.5 + 0.5 * sin(hue + 2.09439);
  color.b = 0.5 + 0.5 * sin(hue + 4.18879);

  // Add glow based on audio
  color += vec3(audioReactive * 0.3, audioReactive * 0.2, audioReactive * 0.4);

  return color;
}

void main(void) {
  // Adjust coordinates to aspect ratio
  vec2 uv = vTex * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  // Get audio data
  vec4 freq = texture2D(uAudioDataTexture, vec2(0.5, 0.0));
  vec4 wave = texture2D(uAudioDataTexture, vec2(0.5, 0.5));

  // Generate fractal
  vec3 color = julia(uv, uTime, freq);

  // Add subtle wave distortion based on audio
  float distortion = wave.r * 0.1 * uIntensity;
  color *= 1.0 + distortion;

  // Add subtle pulsing
  color *= 0.8 + 0.3 * sin(uTime * 0.5 + freq.r * 3.0);

  gl_FragColor = vec4(color, 1.0);
}
`,
    }
  }

  private getNebulaFlowShaders() {
    return {
      vertex: `
precision highp float;
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uTime;
uniform float uIntensity;
uniform float uComplexity;
uniform float uRotation;
uniform sampler2D uAudioDataTexture;
varying vec2 vTexCoord;
varying float vAudioIntensity;

void main(void) {
  // Get audio data for different frequency bands
  float lowFreq = texture2D(uAudioDataTexture, vec2(0.1, 0.0)).r;
  float midFreq = texture2D(uAudioDataTexture, vec2(0.5, 0.0)).r;
  float highFreq = texture2D(uAudioDataTexture, vec2(0.8, 0.0)).r;

  // Calculate audio intensity for fragment shader
  vAudioIntensity = (lowFreq + midFreq + highFreq) / 3.0 * uIntensity;

  // Pass texture coordinates to fragment shader
  vTexCoord = aTextureCoord;

  // Create a full-screen quad
  gl_Position = aVertexPosition;
}
`,
      fragment: `
precision highp float;
varying vec2 vTexCoord;
varying float vAudioIntensity;
uniform float uTime;
uniform float uIntensity;
uniform float uColorShift;
uniform float uComplexity;
uniform vec2 uResolution;
uniform sampler2D uAudioDataTexture;

// Noise functions from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u*u*(3.0-2.0*u);

  float res = mix(
    mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
    mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
  return res*res;
}

// Fractal Brownian Motion
float fbm(vec2 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    f += w * noise(p);
    p *= 2.0;
    w *= 0.5;
  }
  return f;
}

// Cloud-like nebula function
vec3 nebula(vec2 uv, float time, float intensity) {
  // Sample audio at different positions
  float lowFreq = texture2D(uAudioDataTexture, vec2(0.1, 0.0)).r;
  float midFreq = texture2D(uAudioDataTexture, vec2(0.5, 0.0)).r;
  float highFreq = texture2D(uAudioDataTexture, vec2(0.8, 0.0)).r;

  // Create distortion based on audio
  float distortion = lowFreq * 2.0 * intensity;

  // Create moving nebula effect
  vec2 p = uv;
  p.x += time * 0.04;
  p.y += time * 0.02;

  // Add audio-reactive distortion
  p.x += sin(uv.y * 4.0 + time) * 0.1 * midFreq;
  p.y += cos(uv.x * 4.0 + time * 0.7) * 0.1 * highFreq;

  // Create multiple layers of noise
  float noise1 = fbm(p * 1.0 + time * 0.1);
  float noise2 = fbm(p * 2.0 - time * 0.15);
  float noise3 = fbm(p * 4.0 + time * 0.2);

  // Combine noise layers with audio reactivity
  float combinedNoise =
    noise1 * (0.6 + lowFreq * 0.4) +
    noise2 * (0.3 + midFreq * 0.7) +
    noise3 * (0.2 + highFreq * 0.8);

  // Create color based on noise and audio
  vec3 color1 = vec3(0.1, 0.2, 0.6); // Deep blue
  vec3 color2 = vec3(0.6, 0.1, 0.8); // Purple
  vec3 color3 = vec3(0.9, 0.4, 0.1); // Orange

  // Mix colors based on noise and audio
  vec3 color = mix(
    mix(color1, color2, noise1 * (1.0 + midFreq)),
    color3,
    noise3 * (0.5 + highFreq * 0.5)
  );

  // Add stars
  float stars = pow(noise(uv * 50.0), 20.0) * 2.0;
  stars *= smoothstep(0.1, 0.4, combinedNoise); // Only show stars in darker areas

  // Add bright spots based on audio
  float brightSpots = pow(noise2, 5.0) * 5.0 * highFreq;

  // Add glow based on audio intensity
  float glow = pow(combinedNoise, 2.0) * vAudioIntensity * 2.0;

  // Combine everything
  color = color * (combinedNoise * 0.8 + 0.2);
  color += vec3(stars);
  color += vec3(1.0, 0.7, 0.3) * brightSpots;
  color += vec3(0.5, 0.2, 0.8) * glow;

  // Apply color shift
  float hue = uTime * 0.05 + uColorShift * 6.28318;
  vec3 tint = vec3(
    0.5 + 0.5 * sin(hue),
    0.5 + 0.5 * sin(hue + 2.09),
    0.5 + 0.5 * sin(hue + 4.18)
  );

  color = mix(color, color * tint, 0.3);

  // Apply audio-reactive pulsing
  float pulse = 0.8 + 0.2 * sin(uTime * 2.0) * vAudioIntensity;
  color *= pulse;

  return color;
}

void main(void) {
  // Adjust coordinates to aspect ratio
  vec2 uv = vTexCoord * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  // Add some warping based on audio intensity
  float warpAmount = vAudioIntensity * 0.2;
  uv += sin(uv * 5.0 + uTime) * warpAmount;

  // Generate nebula effect
  vec3 color = nebula(uv, uTime, uIntensity);

  // Apply complexity parameter to add detail
  float detail = uComplexity * 2.0;
  vec3 detailColor = nebula(uv * (1.0 + detail), uTime * 1.5, uIntensity * 0.7);
  color = mix(color, detailColor, uComplexity * 0.3);

  // Output final color
  gl_FragColor = vec4(color, 1.0);
}
`,
    }
  }
}
