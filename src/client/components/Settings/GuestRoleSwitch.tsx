import { type GuestRole, roleDisplay, saveGuestRole } from '@/lib/guestRole'
import { setStructureBarEnabled } from '@/lib/structureBarSettings'
import { useDispatch, useStore } from '@/store'
import { type ReactElement } from 'react'
import { SettingEmoji } from './SettingEmoji'

const ROLES: { value: GuestRole; label: string; emoji: string }[] = [
  { value: 'chanteur', label: 'Chanteur', emoji: '🎤' },
  { value: 'musicien', label: 'Musicien', emoji: '🎹' }
]

/** Guests: "Chanteur | Musicien". Switching applies that role's display (accords, structure, scroll musicien). */
export function GuestRoleSwitch(): ReactElement {
  const { guestRole: role } = useStore()
  const dispatch = useDispatch()

  function choose(next: GuestRole): void {
    if (next === role) return
    saveGuestRole(next)
    const display = roleDisplay(next)
    setStructureBarEnabled(display.structureBar)
    dispatch({ ...display, guestRole: next })
  }

  return (
    <div role="group" aria-label="Je suis" className="grid grid-cols-2 overflow-hidden rounded-md border">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          aria-pressed={role === r.value}
          onClick={() => choose(r.value)}
          className={`flex h-10 items-center justify-center gap-1 text-sm ${
            role === r.value ? 'bg-primary font-semibold text-primary-foreground' : 'bg-background'
          }`}
        >
          <SettingEmoji emoji={r.emoji} />
          {r.label}
        </button>
      ))}
    </div>
  )
}
