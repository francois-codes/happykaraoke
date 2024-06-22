import { SessionQueue } from './SessionQueue'

export function SessionQueuePanel() {
  return (
    <div className="invisible lg:visible w-[calc(100vw-756px)] max-w-[550px] fixed top-24 right-8">
      <SessionQueue />
    </div>
  )
}
