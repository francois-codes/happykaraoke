export class Chord {
  private source: string

  static CHORD_STARTERS = ['| N', '|N', 'N.C', 'NC', '%', '(NC', '|%', '| %', '<', '|']

  static CHORD_REGEX =
    /\b([ABCDEFG](?:#|b)|(?:[ABCDEFG]))(m|min|maj|M)?(?:maj7|7|7\/9|maj9|6|9|11|13|dim|°|m7♭5|ø)?(?:sus[24]?)?\b/gm

  static SINGLE_CHORD_REGEX =
    /^(?:[ABCDEFG](?:#|b)?)(?:m|maj7|m7|7|7\/9|dim|sus2|sus4|sus|add9|°|m7♭5|ø|∆)?(?:\/[ABCDEFG](?:#|b)?)?$/

  static isChord(str: string) {
    const trimmedString = str.trim()

    return Chord.SINGLE_CHORD_REGEX.test(trimmedString)
  }

  constructor(source: string) {
    this.source = source
  }

  get label() {
    return this.source
  }
}
