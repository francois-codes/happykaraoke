export class Chord {
  private source: string

  static CHORD_STARTERS = ['| N', '|N', 'N.C', 'NC', '%', '(NC', '|%', '| %', '<', '|']

  static CHORD_REGEX =
    /^[ABCDEFG](?:#|##|b|bb)?(?:dim|°|ø|aug|\+|min|m|-)?(?:maj|Maj|M|∆|Δ|△)?(?:2|4|5|6|7|9|11|13)?(?:M|maj|Maj)?(?:sus[24]?)?(?:[#b+\-](?:5|9|11|13))?(?:add[2469])?(?:omit[35])?(?:\+)?(?:\/[ABCDEFG](?:#|b)?)?$/

  static ALLOWED_TERMS_IN_CHORDS = [
    '|', 'NC', 'N.C', 'N.C.', '_', '%'
  ]

  static isChord(str: string) {
    const trimmedString = str.trim()

    return Chord.CHORD_REGEX.test(trimmedString)
  }

  constructor(source: string) {
    this.source = source
  }

  get label() {
    return this.source
  }
}
