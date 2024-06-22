import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { type SessionLog } from '@shared/db/schema'
import { ISODate } from '@shared/types'
import { fetchSessionLog } from '@shared/endpoints/session'
import { differenceInSeconds, formatDate } from 'date-fns'
import { DatePicker } from '../ui/date-picker'

const DATE_FORMAT = 'yyyy-MM-dd'

const getFormattedDate = (date: Date) => {
  return formatDate(date, DATE_FORMAT) as ISODate
}

function download(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text:csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
}

function logItemsToCSV(logs: Record<string, unknown>[]): string {
  const replacer = (key, value) => (value === null ? '' : value)
  const header = Object.keys(logs[0])
  const csv = logs.map((row) =>
    header.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(',')
  )
  csv.unshift(header.join(','))

  return csv.join('\r\n')
}

function splitByLastOccurrence(str, symbol) {
  // Find the position of the last occurrence of the symbol
  const lastIndex = str.lastIndexOf(symbol)

  // If the symbol is not found, return the original string as a single element array
  if (lastIndex === -1) {
    return [str]
  }

  // Extract the parts of the string before and after the last occurrence of the symbol
  const before = str.substring(0, lastIndex)
  const after = str.substring(lastIndex + 1)

  return [before, after]
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  // Pad the minutes and seconds with leading zeros if necessary
  const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes
  const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds

  // If there are no hours, omit them from the formatted string
  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`
  } else {
    return `${paddedMinutes}:${paddedSeconds}`
  }
}

function getSongDuration(start, end) {
  if (!end) return ''

  const diff = differenceInSeconds(end, start)

  return formatTime(diff)
}

function transformLogs(logs: SessionLog[]) {
  return logs.map((log, index) => {
    const nextLog = logs[index + 1]

    const end = nextLog?.timestamp
    const [artist = '', song = ''] = splitByLastOccurrence(log.song, '-')

    return {
      artist,
      song,
      start: log.timestamp,
      end,
      duration: getSongDuration(log.timestamp, end)
    }
  })
}

export function SessionLogs() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [date, setDate] = useState<Date>(new Date())

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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setLogs([])
        setDate(new Date())
        setOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Logs de session</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Logs de session</DialogTitle>
          <DialogDescription>Affiche les logs pour une session</DialogDescription>
        </DialogHeader>
        <div className="gap-4 flex flex-col items-center p-4">
          <DatePicker date={date} setDate={setDate} />
          {logs.length ? (
            <p>{logs.length} morceaux pour cette date</p>
          ) : (
            <p>Pas de logs pour cette date</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={logs.length === 0}
            onClick={() => {
              const csv = logItemsToCSV(transformLogs(logs))
              download(csv, `happikaraoke logs - ${formatDate(date, 'yyyy-MM-dd')}.csv`)
            }}
          >
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
