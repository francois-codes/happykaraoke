import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { type SessionLog } from '@shared/db/schema'
import { fetchSessionLog } from '@shared/endpoints/session'
import { formatDate } from 'date-fns'
import { DatePicker } from '../ui/date-picker'
import { download, getFormattedDate, logItemsToCSV } from '@/lib/sessionLogs'
import { Modal } from '../Modal'

export function SessionLogs() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [date, setDate] = useState<Date>(new Date())

  function onOpenChange(open) {
    if (!open) setLogs([])
    setDate(new Date())
    setOpen(open)
  }

  async function fetchLogs(date: Date) {
    if (!date) return

    const formattedDate = getFormattedDate(date)
    const results = await fetchSessionLog.call({ date: formattedDate })
    setLogs(results)
  }

  useEffect(() => {
    fetchLogs(date)
  }, [date])

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={<Button variant="outline">Logs de session</Button>}
      title="Logs de session"
      desc="Affiche les logs pour une session"
      footerButtons={[
        {
          label: 'Télécharger',
          disabled: logs.length === 0,
          onClick: () => {
            const csv = logItemsToCSV(logs)
            download(csv, `happikaraoke logs - ${formatDate(date, 'yyyy-MM-dd')}.csv`)
          }
        }
      ]}
    >
      <div className="gap-4 flex flex-col items-center p-4">
        <DatePicker date={date} setDate={setDate} />
        {logs.length ? (
          <p>{logs.length} morceaux pour cette date</p>
        ) : (
          <p>Pas de logs pour cette date</p>
        )}
      </div>
    </Modal>
  )
}
