/**
 * Guests choose "Chanteur" (lyrics only, the default) or "Musicien" (chords, structure bar,
 * musician scroll). The choice is remembered per device; each switch can still be changed by hand.
 */
export type GuestRole = 'chanteur' | 'musicien'

const ROLE_KEY = 'karaoke:guestRole'
/** Same key as `structureBarSettings.ts`: absent means "never chosen on this device". */
const STRUCTURE_BAR_KEY = 'karaoke:structureBar'

export interface RoleDisplay {
  chordsEnabled: boolean
  structureBar: boolean
  musicienScroll: boolean
}

export function roleDisplay(role: GuestRole): RoleDisplay {
  return role === 'musicien'
    ? { chordsEnabled: true, structureBar: true, musicienScroll: true }
    : { chordsEnabled: false, structureBar: false, musicienScroll: false }
}

export function readGuestRole(): GuestRole {
  try {
    return window.localStorage.getItem(ROLE_KEY) === 'musicien' ? 'musicien' : 'chanteur'
  } catch {
    return 'chanteur'
  }
}

export function saveGuestRole(role: GuestRole): void {
  try {
    window.localStorage.setItem(ROLE_KEY, role)
  } catch {
    // private mode / quota
  }
}

/** Role and display a guest gets when the app opens: the role's defaults, except a structure bar choice already made. */
export function guestStartDisplay(): RoleDisplay & { guestRole: GuestRole } {
  const guestRole = readGuestRole()
  const display = { ...roleDisplay(guestRole), guestRole }
  try {
    const stored = window.localStorage.getItem(STRUCTURE_BAR_KEY)
    if (stored !== null) display.structureBar = stored !== '0'
  } catch {
    // keep the role default
  }
  return display
}
