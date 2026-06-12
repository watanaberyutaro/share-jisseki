import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const size = parseInt(request.nextUrl.searchParams.get('size') || '192')
  const fontSize = Math.round(size * 0.45)

  return new ImageResponse(
    (
      <div
        style={{
          background: '#22211A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.18,
        }}
      >
        <div
          style={{
            color: '#DCEDC8',
            fontSize,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-2px',
          }}
        >
          SHELA
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
