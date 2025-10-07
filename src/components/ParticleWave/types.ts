export interface ParticleWaveProps {
  dotSize?: number
  density?: number
  speed?: number
  amplitude?: number
  primaryColor?: string
  secondaryColor?: string
  background?: string
  seed?: number
  className?: string
}

export interface WaveLayer {
  dotSize: number
  speed: number
  opacity: number
  zOffset: number
  color: string
}

export interface ShaderUniforms {
  time: { value: number }
  amplitude: { value: number }
  frequency: { value: number }
  speed: { value: number }
  dotSize: { value: number }
  color: { value: [number, number, number] }
  opacity: { value: number }
  mousePos: { value: [number, number] }
  mouseInfluence: { value: number }
}