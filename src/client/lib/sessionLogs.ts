import { type SessionLog } from '@shared/db/schema'
import { ISODate } from '@shared/types'
import { differenceInSeconds, formatDate } from 'date-fns'

export function download(data: string, filename: string) {
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

export function logItemsToCSV(logs: SessionLog[]): string {
  const transformedLogs = transformLogs(logs)
  const replacer = (_, value) => (value === null ? '' : value)
  const header = Object.keys(transformedLogs[0])
  const csv = transformedLogs.map((row) =>
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

const DATE_FORMAT = 'yyyy-MM-dd'

export const getFormattedDate = (date: Date) => {
  return formatDate(date, DATE_FORMAT) as ISODate
}
