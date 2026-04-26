'use client'

import { useRef, useEffect } from 'react'

const FACES: Array<{ cls: string; img: string }> = [
  { cls: 'front',  img: '/assets/face1.png' },
  { cls: 'back',   img: '/assets/face2.png' },
  { cls: 'right',  img: '/assets/face3.png' },
  { cls: 'left',   img: '/assets/face4.png' },
  { cls: 'top',    img: '/assets/face5.png' },
  { cls: 'bottom', img: '/assets/face6.png' },
]

export function HeroCube() {
  const rotX = useRef(20)
  const rotY = useRef(0)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cubeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    autoRef.current = setInterval(() => {
      if (!dragging.current) {
        rotY.current += 0.25
        if (cubeRef.current) {
          cubeRef.current.style.transform = `rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)`
        }
      }
    }, 20)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    rotY.current += dx * 0.5
    rotX.current -= dy * 0.5
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)`
    }
  }

  const onPointerUp = () => { dragging.current = false }

  return (
    <div
      className="hero-cube-scene"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        ref={cubeRef}
        className="hero-cube"
        style={{ transform: `rotateX(${rotX.current}deg) rotateY(${rotY.current}deg)` }}
      >
        {FACES.map(f => (
          <div
            key={f.cls}
            className={`hero-cube-face ${f.cls}`}
            style={{ backgroundImage: `url(${f.img})` }}
          />
        ))}
      </div>
    </div>
  )
}
