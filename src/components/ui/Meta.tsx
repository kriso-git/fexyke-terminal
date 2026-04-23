interface MetaProps {
  k: string
  v: string | number
}

export function Meta({ k, v }: MetaProps) {
  return (
    <div className="meta-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
