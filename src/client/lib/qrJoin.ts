/** Value of the `join` query param put in the session QR code. */
export const QR_JOIN_MARKER = 'qr'

/** True when the page was opened from the session QR code (guests must land in singer mode). */
export function isQrJoin(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get('join') === QR_JOIN_MARKER
}
