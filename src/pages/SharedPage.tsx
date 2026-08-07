import { useParams } from 'react-router-dom'
import SharedView from './SharedView'

export default function SharedPage() {
  const { token } = useParams<{ token: string }>()

  if (!token) return null

  return <SharedView token={token} />
}
