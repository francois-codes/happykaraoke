import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Button } from '../ui/button'
import { useState } from 'react'
import { closeSession } from '@shared/endpoints/session'
import { useNavigate } from 'react-router-dom'

export function CloseSession() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function endSession() {
    await closeSession.call()
    navigate('/')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Terminer la session</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Terminer la session</DialogTitle>
          <DialogDescription>
            Etes vous sur ? Terminer la session entrainera la suppression des utilisateurs
          </DialogDescription>
        </DialogHeader>
        <div className="gap-4 flex flex-col items-center p-4">
          <Button onClick={endSession}>Oui, fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
