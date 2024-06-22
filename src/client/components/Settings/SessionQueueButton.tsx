import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Button } from '../ui/button'
import { IoPlayCircleOutline } from 'react-icons/io5'
import { SessionQueue } from './SessionQueue'

export function SessionQueueButton() {
  return (
    <div className="lg:invisible">
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <IoPlayCircleOutline size={24} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Prochaines chansons</DialogTitle>
            <DialogDescription>Liste des prochaines chansons</DialogDescription>
          </DialogHeader>

          <SessionQueue />
        </DialogContent>
      </Dialog>
    </div>
  )
}
