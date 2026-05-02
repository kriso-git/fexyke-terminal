import { redirect } from 'next/navigation'
import { getCurrentOperator } from '@/lib/session'
import { TopBar } from '@/components/shell/TopBar'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { LangBar } from '@/components/shell/LangBar'
import { AuthClient } from './AuthClient'

export default async function GatePage() {
  const op = await getCurrentOperator()
  if (op) redirect('/')

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={null} />
      <LangBar/>
      <AuthClient />
      <Footer index="004 / 005" />
    </div>
  )
}
