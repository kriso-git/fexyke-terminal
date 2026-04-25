'use client'
import { useEffect, useRef } from 'react'

export function DraggableCube() {
  const cubeRef = useRef<HTMLDivElement>(null)
  const s = useRef({
    rotX: 15, rotY: 0,
    xSpeed: 0.08,
    isDragging: false,
    dragStart: null as { x: number; y: number; rotX: number; rotY: number } | null,
    raf: 0,
    lastTime: null as number | null,
  })

  useEffect(() => {
    const el = cubeRef.current
    if (!el) return
    const st = s.current

    const frame = (time: number) => {
      if (!st.isDragging) {
        const dt = st.lastTime ? Math.min(time - st.lastTime, 50) : 16
        st.lastTime = time
        const scale = dt / 16
        st.rotY += 0.25 * scale
        st.rotX += st.xSpeed * scale
        if (st.rotX > 38)  { st.rotX = 38;  st.xSpeed = -Math.abs(st.xSpeed) }
        if (st.rotX < -38) { st.rotX = -38; st.xSpeed =  Math.abs(st.xSpeed) }
      }
      el.style.transform = `rotateX(${st.rotX}deg) rotateY(${st.rotY}deg)`
      st.raf = requestAnimationFrame(frame)
    }
    st.raf = requestAnimationFrame(frame)

    const getXY = (e: MouseEvent | TouchEvent): [number, number] =>
      'touches' in e
        ? [e.touches[0].clientX, e.touches[0].clientY]
        : [e.clientX, e.clientY]

    const onDown = (e: MouseEvent | TouchEvent) => {
      const [cx, cy] = getXY(e)
      st.isDragging = true
      st.lastTime = null
      st.dragStart = { x: cx, y: cy, rotX: st.rotX, rotY: st.rotY }
      el.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!st.isDragging || !st.dragStart) return
      const [cx, cy] = getXY(e)
      st.rotY = st.dragStart.rotY + (cx - st.dragStart.x) * 0.8
      st.rotX = st.dragStart.rotX - (cy - st.dragStart.y) * 0.8
      st.rotX = Math.max(-85, Math.min(85, st.rotX))
      e.preventDefault()
    }

    const onUp = () => {
      if (!st.isDragging) return
      st.isDragging = false
      st.lastTime = null
      el.style.cursor = 'grab'
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('touchstart', onDown, { passive: false })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)

    return () => {
      cancelAnimationFrame(st.raf)
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('touchstart', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  return (
    <div className="cube-sidebar">
      <div className="cube-3d-wrap">
        <div className="cube-3d" ref={cubeRef} style={{ cursor: 'grab' }}>
          <div className="cube-face face-front"><img src="/assets/face1.png" alt="" /></div>
          <div className="cube-face face-back"><img src="/assets/face2.png" alt="" /></div>
          <div className="cube-face face-right"><img src="/assets/face3.png" alt="" /></div>
          <div className="cube-face face-left"><img src="/assets/face4.png" alt="" /></div>
          <div className="cube-face face-top"><img src="/assets/face5.png" alt="" /></div>
          <div className="cube-face face-bottom"><img src="/assets/face6.png" alt="" /></div>
        </div>
      </div>
      <span className="cube-label">F3XYK</span>
    </div>
  )
}
