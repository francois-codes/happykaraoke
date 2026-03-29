import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { useDispatch } from '@/store'
import { fetchSessionConfig } from '@shared/endpoints/session'
import { joinSession } from '@shared/endpoints/user'
import { UserType } from '@shared/types'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'

const formSchema = z.object({
  userName: z.string().min(1),
  adminPassword: z.string()
})

export type FormSchema = z.infer<typeof formSchema>

export const JoinSession = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: '',
      adminPassword: ''
    }
  })

  const onSubmit = useCallback(async (formData: z.infer<typeof formSchema>) => {
    const { userName, adminPassword } = formData

    try {
      const { user } = await joinSession.call({ userName, adminPassword })
      window.localStorage.setItem('userId', `${user.id}`)
      const isAdmin = user.type === UserType.ADMIN
      try {
        const cfg = await fetchSessionConfig.call()
        const sc = cfg.scrollControl ?? null
        dispatch({
          isAdmin,
          scrollControl: sc,
          scrollMaster: isAdmin && sc?.activeScrollMasterUserId === user.id,
          currentSong: cfg.currentSong,
          songsFolder: cfg.songsFolder,
          hostUrl: cfg.hostUrl ?? ''
        })
      } catch {
        dispatch({ isAdmin, scrollControl: null, scrollMaster: false })
      }
      navigate('/session')
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response?.status === 401) {
          setFormError('Aucune session en cours')
          return
        }
      }
      // shouldn't happen, we'll see later
      setFormError('Houston, on a un problème')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="min-w-96">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Ceci est votre nom</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {showPasswordInput && (
            <FormField
              control={form.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Taper le mot de passe pour joindre en admin</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} />
                  </FormControl>
                  <FormDescription>(Si vous savez, vous savez)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {formError && <p className="text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'En cours...' : 'Rejoindre la session'}
          </Button>
        </form>
      </Form>
      <div className="pt-8 w-full text-center">
        <Link to="/new" className="text-sm text-slate-500">
          Ouvrir une session
        </Link>
      </div>
      <div className="pt-8 w-full text-center">
        <Link
          to="#"
          onClick={() => {
            setShowPasswordInput(true)
          }}
          className="text-sm text-slate-500"
        >
          Rejoindre en admin
        </Link>
      </div>
    </div>
  )
}
