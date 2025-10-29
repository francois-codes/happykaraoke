import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'

import { useNavigate } from 'react-router'
import { useDispatch } from '@/store'
import { joinSession } from '@shared/endpoints/user'
import { UserType } from '@shared/types'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'

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
      dispatch({ isAdmin: user.type === UserType.ADMIN })
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
          <FormField
            control={form.control}
            name="adminPassword"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Taper le mot de passe pour joindre en admin</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>(Si vous savez, vous savez)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
    </div>
  )
}
