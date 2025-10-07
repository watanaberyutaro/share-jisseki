'use client'

import { useEffect, useRef } from 'react'

interface Dot {
  id: number
  x: number
  y: number
  originalX: number
  originalY: number
  element: HTMLDivElement | null
}

export function MagneticDots() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()
  const lastUpdateTimeRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return

    // ドット生成（30pxスペーシング）
    const spacing = 30
    const cols = Math.ceil(window.innerWidth / spacing)
    const rows = Math.ceil(window.innerHeight / spacing)

    // 全てのドットを生成
    const totalDots = cols * rows

    // ドットを生成（DOM操作を最小化）
    const fragment = document.createDocumentFragment()
    const dots: Dot[] = []

    for (let i = 0; i < totalDots; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = col * spacing + spacing / 2
      const y = row * spacing + spacing / 2

      const element = document.createElement('div')
      element.className = 'absolute rounded-full'
      element.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        opacity: 0.8;
        background-color: #64748b;
        transform: translate(-50%, -50%);
        will-change: transform;
      `

      fragment.appendChild(element)

      dots.push({
        id: i,
        x,
        y,
        originalX: x,
        originalY: y,
        element
      })
    }

    containerRef.current.appendChild(fragment)
    dotsRef.current = dots

    // マウス追跡（throttle適用）
    let rafId: number | null = null
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null
        })
      }
    }

    // アニメーションループ（60fps制限）
    const animate = (currentTime: number) => {
      // 60fpsに制限（16.67ms）
      if (currentTime - lastUpdateTimeRef.current < 16.67) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      lastUpdateTimeRef.current = currentTime

      const mouseX = mousePositionRef.current.x
      const mouseY = mousePositionRef.current.y
      const maxDistance = 120

      // DOM更新を最小化（transformのみ）
      dotsRef.current.forEach(dot => {
        if (!dot.element) return

        const dx = mouseX - dot.originalX
        const dy = mouseY - dot.originalY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance) {
          const force = Math.max(0, (maxDistance - distance) / maxDistance)
          const pushStrength = force * 40
          const pushX = distance > 0 ? (-dx / distance) * pushStrength : 0
          const pushY = distance > 0 ? (-dy / distance) * pushStrength : 0

          dot.x = dot.originalX + pushX
          dot.y = dot.originalY + pushY
        } else {
          // 元の位置に戻る（イージング）
          dot.x = dot.originalX + (dot.x - dot.originalX) * 0.9
          dot.y = dot.originalY + (dot.y - dot.originalY) * 0.9
        }

        // transformのみ更新（リフローを回避）
        dot.element.style.transform = `translate(calc(-50% + ${dot.x - dot.originalX}px), calc(-50% + ${dot.y - dot.originalY}px))`
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      // クリーンアップ
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      dotsRef.current = []
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}