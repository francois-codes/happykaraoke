import { useState } from 'react'
import { Button } from '../ui/button'
import { deleteSessionLog, fetchAllSessions, fetchSessionLog } from '@shared/endpoints/session'
import { formatDate } from 'date-fns'
import { download, logItemsToCSV } from '@/lib/sessionLogs'
import type { SessionWithCount } from '@shared/lib/session'
import { Modal } from '../Modal'
import { IoDownloadOutline, IoTrashBinOutline } from 'react-icons/io5'

export function SessionLogs() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<SessionWithCount[]>([])

  function onOpenChange(open: boolean) {
    setOpen(open)
    setLoading(true)
    fetchAllSessions.call().then((result) => {
      console.log({ result })
      setSessions(result)
      setLoading(false)
    })
  }

  async function fetchLogs(session: SessionWithCount) {
    const logs = await fetchSessionLog.call({ sessionId: session.id })
    const csv = logItemsToCSV(logs)
    download(csv, `happikaraoke logs - ${formatDate(session.sessionDate, 'yyyy-MM-dd')}.csv`)
  }


  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={<Button variant="outline">Logs de session</Button>}
      title="Logs de session"
      desc="Affiche les logs pour une session"
    >
      <div className="gap-4 flex flex-col items-center p-4">
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="flex flex-col gap-2 w-full max-h-[60vh] overflow-scroll">
            {sessions.map((session) => (
              <div key={session.id} className='flex flex-row gap-1 items-center justify-between'>
                <div className='flex flex-col'>
                <p className='text-sm'>Date: {formatDate(session.sessionDate, 'yyyy-MM-dd')}</p>
                <p className='text-xs'>Nombre de chansons: {session.songCount}</p>
                </div>
                <div className='flex flex-row items-center gap-1'>

              <Button
                size="sm"
                onClick={() => {
                  fetchLogs(session)
                }}
              >
                <IoDownloadOutline size={16} />
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!confirm('Tu es sur ? tu ne pourras pas récupérer les logs de cette session.')) return
                  await deleteSessionLog.call({ sessionId: session.id })
                  const logs = await fetchAllSessions.call()
                  setSessions(logs)
                }}
              >
                <IoTrashBinOutline size={16} />
              </Button>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
