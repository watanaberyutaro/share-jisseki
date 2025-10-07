'use client'

export function LoadingAnimation() {
  const dots = 8 // 楕円の数

  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-5 h-5">
        {Array.from({ length: dots }, (_, i) => {
          const angle = (360 / dots) * i
          const delay = i * 0.1

          return (
            <div
              key={i}
              className="absolute w-0.5 h-1.5 rounded-full"
              style={{
                backgroundColor: `rgba(158, 158, 158, ${0.2 + (0.8 * i / dots)})`,
                transform: `rotate(${angle}deg) translateY(-12px)`,
                transformOrigin: 'center 10px',
                animation: `spin 1.2s linear infinite`,
                animationDelay: `${delay}s`
              }}
            />
          )
        })}
      </div>
      <style jsx>{`
        @keyframes spin {
          0% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  )
}