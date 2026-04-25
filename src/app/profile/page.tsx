import { redirect } from 'next/navigation'
import { getCurrentOperator } from '@/lib/session'

export default async function ProfilePage() {
  const op = await getCurrentOperator()
  if (op) {
    redirect(`/operators/${op.callsign}`)
  }
  redirect('/gate')
}
