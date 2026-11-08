/**
 * Label of the section currently being played, read from the rendered song (no scroll state touched).
 * The "current" section is the last titled heading above the upper third of the scroll area.
 * Repeated titles are numbered: "Refrain (2e)".
 */
export function getCurrentSectionLabel(): string | null {
  const container = document.getElementById('scroll-container')
  const songLines = document.getElementById('song-lines')
  if (!(container instanceof HTMLElement) || !(songLines instanceof HTMLElement)) return null

  const headings = Array.from(songLines.querySelectorAll<HTMLElement>('.song-section'))
    .map((el) => ({ el, title: (el.textContent ?? '').trim() }))
    .filter((h) => h.title !== '')
  if (headings.length === 0) return null

  const box = container.getBoundingClientRect()
  const readingLine = box.top + box.height / 3
  let index = 0
  headings.forEach((h, i) => {
    if (h.el.getBoundingClientRect().top <= readingLine) index = i
  })

  const { title } = headings[index]
  const sameTitle = headings.filter((h) => h.title.toLowerCase() === title.toLowerCase())
  if (sameTitle.length < 2) return title
  const occurrence = sameTitle.findIndex((h) => h.el === headings[index].el) + 1
  return `${title} (${occurrence === 1 ? '1re' : `${occurrence}e`})`
}
