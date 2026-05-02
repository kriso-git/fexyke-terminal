import { getCurrentOperator } from '@/lib/session'
import { ChatWidget } from './ChatWidget'

export async function ChatWidgetMount() {
  const op = await getCurrentOperator()
  if (!op) return null
  return <ChatWidget currentOperator={op}/>
}
