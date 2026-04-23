interface FooterProps {
  index?: string
}

export function Footer({ index = '001 / 005' }: FooterProps) {
  return (
    <div className="footer">
      <div className="cell">◢ LAT 47.4979° N</div>
      <div className="cell">LON 19.0402° E</div>
      <div className="cell">UPLINK · STABIL · 128 KB/S</div>
      <div className="spacer" />
      <div className="cell">INDEX {index}</div>
      <div className="cell">F3X · V0.1.0-HUD</div>
      <div className="cell">◣</div>
    </div>
  )
}
