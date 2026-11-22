import { FC } from 'react'

/** Emoji in front of a settings entry, in black and white: fixed-width column so every label lines up. Decorative only. */
export const SettingEmoji: FC<{ emoji: string }> = ({ emoji }) => (
  <span aria-hidden className="inline-block w-6 shrink-0 text-center text-base leading-none grayscale">
    {emoji}
  </span>
)
