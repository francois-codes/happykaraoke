export class Chord {
  private source: string

  static CHORD_STARTERS = ['| N', '|N', 'N.C', 'NC', '%', '(NC', '|%', '| %', '<', '|']

  static CHORD_REGEX =
    /\b([ABCDEFG](?:#|b)|(?:[ABCDEFG]))(m|min|maj|M)?(?:maj7|7|7\/9|dim7|7b5|7b9|msus4|7sus|°7|dim7|m7b5|7b5|ø|dimM7|m7-5|9|m9|m6|aug|7\+5|aug7|7#5|Maj7|7M|mM7|mMaj7|-7|2|4|5|maj9|M9|m9b5|sus2b5|sus4|7sus4|7\+|7sus2|sus2b5|6|9|11|13|dim|°|m7♭5|add2|add9|m9\(b5\)|ø)?(?:sus[24]?)?\b/gm

  static SINGLE_CHORD_REGEX =
    /^(?:[ABCDEFG](?:#|b)?)(?:m|maj7|m7|7|7\/9|dim7|7b5|7b9|msus4|7sus|°7|dim7|m7b5|7b5|ø||dimM7|m7-5|9|m9|m6|aug|7\+5|aug7|7#5|Maj7|7M|mM7|mMaj7|-7|2|4|5|6|11|13|dim|sus2|sus4|sus|add9|°|m7♭5|maj9|M9|m9b5|sus2b5|sus4|7sus2|7sus4|7\+|sus2b5|add2|add9|m9\(b5\)|ø|∆)?(?:\/[ABCDEFG](?:#|b)?)?$/

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
