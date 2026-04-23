export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ?? u.pathname.split('/embed/')[1]?.split(/[?&]/)[0] ?? null
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null
    }
  } catch {}
  return null
}

export function YouTubePlayer({ url }: { url: string }) {
  const id = extractYouTubeId(url)
  if (!id) return null
  return (
    <div style={{ position:'relative', paddingBottom:'56.25%', height:0, background:'var(--bg-2)', border:'1px solid var(--border-1)' }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}?rel=0`}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  )
}

export function YouTubeThumbnail({ url, height = 120 }: { url: string; height?: number }) {
  const id = extractYouTubeId(url)
  if (!id) return null
  return (
    <div style={{ position:'relative', height, background:'var(--bg-2)', overflow:'hidden', border:'1px solid var(--border-1)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="thumbnail"
        style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.65 }}/>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--accent)' }}>
          <span style={{ color:'var(--accent)', fontSize:14, marginLeft:3 }}>▶</span>
        </div>
      </div>
      <span style={{ position:'absolute', top:4, left:4, fontFamily:'var(--f-sys)', fontSize:9, color:'var(--accent)', background:'rgba(0,0,0,.85)', padding:'2px 5px', letterSpacing:'.1em' }}>
        YOUTUBE
      </span>
    </div>
  )
}
