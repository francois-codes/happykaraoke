import { Login as LoginComponent } from './Login'
import { Screen } from '@/components/Screen'

export function Login() {
  return (
    <Screen shouldAnimateLoader showTitle>
      <LoginComponent />
    </Screen>
  )
}
