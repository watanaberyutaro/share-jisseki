'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { ParticleWaveProps, WaveLayer, ShaderUniforms } from './types'
import { vertexShader, fragmentShader } from './shaders'

const DEFAULT_PROPS: Required<Omit<ParticleWaveProps, 'className'>> = {
  dotSize: 2,
  density: 1.0,
  speed: 0.5,
  amplitude: 0.8,
  primaryColor: '#9db4ff',
  secondaryColor: '#5f7ad8',
  background: '#0b0f19',
  seed: 42
}

export function ParticleWaveBackground(props: ParticleWaveProps = {}) {
  const {
    dotSize = DEFAULT_PROPS.dotSize,
    density = DEFAULT_PROPS.density,
    speed = DEFAULT_PROPS.speed,
    amplitude = DEFAULT_PROPS.amplitude,
    primaryColor = DEFAULT_PROPS.primaryColor,
    secondaryColor = DEFAULT_PROPS.secondaryColor,
    background = DEFAULT_PROPS.background,
    seed = DEFAULT_PROPS.seed,
    className = ''
  } = props

  const [isMounted, setIsMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const targetMousePosition = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const isVisibleRef = useRef(true)
  const layersRef = useRef<Array<{ mesh: THREE.Points; uniforms: ShaderUniforms }>>([])
  const mouseInfluenceRef = useRef(0)
  const targetMouseInfluence = useRef(0)

  // Mount state for SSR safety
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Mouse tracking
  useEffect(() => {
    if (!isMounted) return

    const handleMouseMove = (event: MouseEvent) => {
      // Convert screen coordinates to world coordinates
      const x = ((event.clientX / window.innerWidth) * 2 - 1) * 17.5
      const y = -((event.clientY / window.innerHeight) * 2 - 1) * 17.5

      targetMousePosition.current = { x, y }
      targetMouseInfluence.current = 1.0
    }

    const handleMouseLeave = () => {
      targetMouseInfluence.current = 0.0
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isMounted])

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Convert hex color to RGB array
  const hexToRgb = useCallback((hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255
        ]
      : [0.6, 0.7, 1.0]
  }, [])

  // Create particle geometry
  const createParticleGeometry = useCallback((layer: WaveLayer, gridSize: number) => {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const phases: number[] = []
    const randomSeeds: number[] = []

    // Expand to cover more area and increase density
    const spacing = 35 / gridSize
    const offset = -17.5

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // More random distribution to break grid pattern
        const randomX = (Math.random() - 0.5) * spacing * 0.8
        const randomY = (Math.random() - 0.5) * spacing * 0.8

        positions.push(
          offset + x * spacing + randomX,
          offset + y * spacing + randomY,
          layer.zOffset
        )

        // Random phase for each particle
        phases.push(Math.random() * Math.PI * 2)
        // Random seed for irregular motion
        randomSeeds.push(Math.random() * 10.0)
      }
    }

    // Add sizes array for variable particle sizes
    const sizes: number[] = []
    for (let i = 0; i < positions.length / 3; i++) {
      // 60% normal size, 40% larger particles
      const sizeVariation = Math.random()
      if (sizeVariation < 0.6) {
        sizes.push(2.5) // Normal size
      } else {
        sizes.push(4.0 + Math.random() * 2.0) // Larger particles (4-6px)
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1))
    geometry.setAttribute('randomSeed', new THREE.Float32BufferAttribute(randomSeeds, 1))
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    return geometry
  }, [])

  // Create wave layer
  const createWaveLayer = useCallback((layer: WaveLayer, gridSize: number) => {
    const geometry = createParticleGeometry(layer, gridSize)

    const uniforms: ShaderUniforms = {
      time: { value: 0 },
      amplitude: { value: amplitude * layer.opacity * 0.8 },
      frequency: { value: 0.08 + Math.random() * 0.04 },
      speed: { value: speed * layer.speed },
      dotSize: { value: dotSize * layer.dotSize },
      color: { value: hexToRgb(layer.color) },
      opacity: { value: layer.opacity },
      mousePos: { value: [0, 0] },
      mouseInfluence: { value: 1.0 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const mesh = new THREE.Points(geometry, material)
    return { mesh, uniforms }
  }, [amplitude, speed, dotSize, hexToRgb, createParticleGeometry])

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return false

    try {
      // Scene
      const scene = new THREE.Scene()
      if (background !== 'transparent') {
        scene.background = new THREE.Color(background)
      }
      sceneRef.current = scene

      // Camera
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      )
      camera.position.z = 10
      cameraRef.current = camera

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: background === 'transparent'
      })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      rendererRef.current = renderer

      containerRef.current.appendChild(renderer.domElement)

      // Create layers with much lower density
      const baseGridSize = Math.floor(60 * Math.sqrt(density))

      const waveLayers: WaveLayer[] = [
        // Front layer - larger, slower particles
        {
          dotSize: 1.0,
          speed: 0.6,
          opacity: 0.9,
          zOffset: 1,
          color: primaryColor
        },
        // Back layer - smaller, faster particles
        {
          dotSize: 0.7,
          speed: 1.0,
          opacity: 0.6,
          zOffset: -1,
          color: secondaryColor
        },
        // Additional middle layer for more density
        {
          dotSize: 0.9,
          speed: 0.8,
          opacity: 0.7,
          zOffset: 0,
          color: primaryColor
        }
      ]

      layersRef.current = waveLayers.map((layer, index) => {
        const gridSize = Math.floor(baseGridSize * (index === 0 ? 1.0 : index === 1 ? 0.8 : 0.9))
        return createWaveLayer(layer, gridSize)
      })

      layersRef.current.forEach(({ mesh }) => {
        scene.add(mesh)
      })

      return true
    } catch (error) {
      console.warn('ParticleWave: Failed to initialize WebGL:', error)
      return false
    }
  }, [background, density, primaryColor, secondaryColor, createWaveLayer])

  // Animation loop
  const animate = useCallback(() => {
    if (!isVisibleRef.current || prefersReducedMotion()) {
      animationIdRef.current = requestAnimationFrame(animate)
      return
    }

    timeRef.current += 0.008 // ~120fps

    // Smooth interpolation for mouse position and influence
    const lerpFactor = 0.02 // 10% speed for slower movement
    const currentPos = mousePosition
    const targetPos = targetMousePosition.current

    const newX = currentPos.x + (targetPos.x - currentPos.x) * lerpFactor
    const newY = currentPos.y + (targetPos.y - currentPos.y) * lerpFactor
    setMousePosition({ x: newX, y: newY })

    mouseInfluenceRef.current += (targetMouseInfluence.current - mouseInfluenceRef.current) * lerpFactor * 0.5

    layersRef.current.forEach(({ uniforms }) => {
      uniforms.time.value = timeRef.current
      uniforms.mousePos.value = [newX, newY]
      uniforms.mouseInfluence.value = mouseInfluenceRef.current
    })

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animationIdRef.current = requestAnimationFrame(animate)
  }, [prefersReducedMotion, mousePosition])

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return

    cameraRef.current.aspect = window.innerWidth / window.innerHeight
    cameraRef.current.updateProjectionMatrix()
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)
  }, [])

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    isVisibleRef.current = !document.hidden
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }

    layersRef.current.forEach(({ mesh }) => {
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose())
        } else {
          mesh.material.dispose()
        }
      }
    })
    layersRef.current = []

    if (rendererRef.current) {
      if (containerRef.current && rendererRef.current.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current.dispose()
      rendererRef.current = null
    }

    sceneRef.current = null
    cameraRef.current = null
  }, [])

  // Initialize and setup
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return

    const success = initScene()
    if (!success) return

    // Start animation
    animate()

    // Event listeners
    let resizeTimeout: NodeJS.Timeout
    const throttledResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', throttledResize)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', throttledResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanup()
    }
  }, [isMounted, initScene, animate, handleResize, handleVisibilityChange, cleanup])

  // Update uniforms when props change
  useEffect(() => {
    layersRef.current.forEach(({ uniforms }, index) => {
      if (uniforms.amplitude) uniforms.amplitude.value = amplitude * (index === 0 ? 0.8 : 0.4)
      if (uniforms.speed) uniforms.speed.value = speed * (index === 0 ? 0.8 : 1.2)
      if (uniforms.dotSize) uniforms.dotSize.value = dotSize * (index === 0 ? 1.2 : 0.8)
    })
  }, [amplitude, speed, dotSize])

  // Don't render anything on server or before mount
  if (!isMounted) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 ${className}`}
      style={{ zIndex: -1, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}

export default ParticleWaveBackground