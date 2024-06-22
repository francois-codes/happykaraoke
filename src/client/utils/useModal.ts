import { useState } from 'react'

export function useModal() {
  const [open, onOpenChange] = useState(false)

  return { open, onOpenChange }
}
