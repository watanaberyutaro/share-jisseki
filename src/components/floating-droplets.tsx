'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  delay: number
  moveX: number
  moveY: number
}

export function FloatingDroplets() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // 波のような粒子パターンを生成
    const createParticles = () => {
      const newParticles: Particle[] = []
      const cols = 12 // 横の粒子数
      const rows = 8  // 縦の粒子数

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const id = row * cols + col
          // グリッド配置に少しのランダム性を追加
          const baseX = (col / (cols - 1)) * 90 + 5 // 5%-95%の範囲
          const baseY = (row / (rows - 1)) * 90 + 5 // 5%-95%の範囲

          newParticles.push({
            id: id,
            x: baseX + (Math.random() - 0.5) * 8, // 少しのランダム性
            y: baseY + (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 3, // 3-7px
            speed: Math.random() * 20 + 10, // 10-30s
            opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7
            delay: (row + col) * 0.1 + Math.random() * 2, // 波のような遅延
            moveX: Math.sin((col / cols) * Math.PI * 2) * 15, // サイン波のX移動
            moveY: Math.cos((row / rows) * Math.PI * 3) * 10, // コサイン波のY移動
          })
        }
      }
      setParticles(newParticles)
    }

    createParticles()
  }, [])

  return (
    <>
      <style jsx global>{`
        @keyframes wave-float {
          0% {
            transform: translate(0px, 0px) scale(1);
            opacity: var(--base-opacity);
          }
          25% {
            transform: translate(calc(var(--move-x) * 0.3), calc(var(--move-y) * 0.3)) scale(1.1);
            opacity: calc(var(--base-opacity) * 1.3);
          }
          50% {
            transform: translate(var(--move-x), var(--move-y)) scale(0.9);
            opacity: calc(var(--base-opacity) * 0.8);
          }
          75% {
            transform: translate(calc(var(--move-x) * 0.6), calc(var(--move-y) * 0.6)) scale(1.2);
            opacity: calc(var(--base-opacity) * 1.1);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
            opacity: var(--base-opacity);
          }
        }

        @keyframes wave-ripple {
          0% {
            transform: translate(var(--wave-offset-x), var(--wave-offset-y));
          }
          50% {
            transform: translate(calc(var(--wave-offset-x) * -1), calc(var(--wave-offset-y) * -0.5));
          }
          100% {
            transform: translate(var(--wave-offset-x), var(--wave-offset-y));
          }
        }

        @keyframes particle-glow {
          0%, 100% {
            box-shadow: 0 0 var(--glow-size) rgba(59, 130, 246, var(--base-opacity)),
                        0 0 calc(var(--glow-size) * 0.5) rgba(147, 197, 253, calc(var(--base-opacity) * 0.8));
          }
          50% {
            box-shadow: 0 0 calc(var(--glow-size) * 2) rgba(99, 102, 241, calc(var(--base-opacity) * 1.5)),
                        0 0 calc(var(--glow-size) * 1) rgba(165, 180, 252, var(--base-opacity));
          }
        }

        .particle {
          animation: wave-float var(--duration) ease-in-out infinite var(--delay),
                     wave-ripple calc(var(--duration) * 0.8) ease-in-out infinite calc(var(--delay) * 0.5),
                     particle-glow calc(var(--duration) * 0.6) ease-in-out infinite calc(var(--delay) * 0.3);
        }
      `}</style>

      {/* 透明な曇りガラス背景層 */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
          backdropFilter: 'blur(8px) saturate(120%)',
          WebkitBackdropFilter: 'blur(8px) saturate(120%)',
        }}
      />

      {/* 粒子層（ガラスと背景の間） */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute particle rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle,
                rgba(147, 197, 253, ${particle.opacity}) 0%,
                rgba(59, 130, 246, ${particle.opacity * 0.8}) 30%,
                rgba(99, 102, 241, ${particle.opacity * 0.6}) 60%,
                rgba(79, 70, 229, ${particle.opacity * 0.3}) 80%,
                transparent 100%
              )`,
              backdropFilter: `blur(${particle.opacity * 3}px)`,
              border: `1px solid rgba(147, 197, 253, ${particle.opacity * 0.9})`,
              boxShadow: `
                inset 0 1px 2px rgba(255, 255, 255, ${particle.opacity * 0.6}),
                0 0 ${particle.size}px rgba(59, 130, 246, ${particle.opacity * 0.5})
              `,
              '--duration': `${particle.speed}s`,
              '--delay': `${particle.delay}s`,
              '--base-opacity': particle.opacity,
              '--move-x': `${particle.moveX}px`,
              '--move-y': `${particle.moveY}px`,
              '--wave-offset-x': `${Math.sin(particle.id * 0.1) * 5}px`,
              '--wave-offset-y': `${Math.cos(particle.id * 0.15) * 3}px`,
              '--glow-size': `${particle.size * 2}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* 追加のガラス質感効果 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: `
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, rgba(173, 216, 230, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(135, 206, 235, 0.04) 0%, transparent 50%)
          `,
        }}
      />
    </>
  )
}