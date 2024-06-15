import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function SessionError() {
  const navigate = useNavigate()
  return (
    <div className={`w-full h-full flex flex-col gap-12 items-center justify-center`}>
      {<h1 className="text-3xl font-bold">Houston, on a un problème 📻 🚨</h1>}
      <p>
        Une erreur s&apos;est produite. Le mieux, c&apos;est de recommencer au début en cliquant
        ici:
      </p>
      <Button onClick={() => navigate('/')}>Retour au début</Button>
    </div>
  )
}
