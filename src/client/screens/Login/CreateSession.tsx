import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { PasswordInput } from '@/components/ui/password-input'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from '@/store'
import { fetchSessionConfig } from '@shared/endpoints/session'
import { loginUser } from '@shared/endpoints/user'
import { UserType } from '@shared/types'
import { AxiosError } from 'axios'

const formSchema = z.object({
  password: z.string().min(1)
})

export type FormSchema = z.infer<typeof formSchema>

export const CreateSession = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: ''
    }
  })

  const onSubmit = useCallback(async (formData: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setFormError('')

    const { password } = formData

    try {
      const { user } = await loginUser.call({ password, sessionName: 'session' })
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
          setFormError('Mot de passe invalide')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="min-w-96">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* <FormField
            control={form.control}
            name="sessionName"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Session</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Ceci est le nom de la session</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Mot de passe</FormLabel>
                <FormControl>
                  <PasswordInput {...field} autoComplete="off" />
                </FormControl>
                <FormDescription>Mot de passe</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {formError && <p className="text-destructive">{formError}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'En cours...' : 'Ouvrir une session'}
          </Button>
        </form>
      </Form>
      <div className="pt-8 w-full text-center">
        <Link to="/join" className="text-sm text-slate-500">
          Rejoindre une session
        </Link>
      </div>
    </div>
  )
}
