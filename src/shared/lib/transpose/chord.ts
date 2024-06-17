import Note from './note'

const chordParseRegex = /^([ABCDEFG][b#]?|)(7\/9|[^/]*)(\/([ABCDEFG][#b]?|))?$/

interface ChordOptions {
  root?: string
  ext?: string
  bass?: string
  transpo?: number
  preferredAccidental?: string
}

class Chord {
  private root?: string
  private ext?: string
  private bass?: string
  private transpo?: number
  private preferredAccidental?: string

  constructor(options: string | ChordOptions) {
    if (typeof options === 'string') {
      const parseResult = chordParseRegex.exec(options)
      if (parseResult) {
        this.root = parseResult[1] || ''
        this.ext = parseResult[2] || ''
        this.bass = parseResult[4] || ''
      }
    } else {
      const { root = '', ext, bass, transpo, preferredAccidental } = options

      this.setRoot(root)
      if (ext) this.setExt(ext)
      if (bass) this.setBass(bass)
      if (transpo) this.setTranspo(transpo)
      if (preferredAccidental) this.setPreferredAccidental(preferredAccidental)
    }
  }

  getRoot(): string {
    const transpo = this.getTranspo()
    if (this.root && transpo !== undefined) {
      return Note.transpose(this.root, transpo, this.getPreferredAccidental())
    }
    return this.root || ''
  }

  getExt(): string | undefined {
    return this.ext
  }

  getBass(): string {
    if (this.bass) {
      const transpo = this.getTranspo()
      if (transpo !== undefined) {
        return Note.transpose(this.bass, transpo, this.getPreferredAccidental())
      }
      return this.bass
    }
    return this.getRoot()
  }

  getTranspo(): number | undefined {
    return this.transpo
  }

  getPreferredAccidental(): string | undefined {
    return this.preferredAccidental
  }

  getName(): string {
    let name = this.getRoot() + (this.getExt() || '')
    if (this.bass) {
      name += '/' + this.getBass()
    }
    return name
  }

  setRoot(newRoot: string): void {
    this.root = newRoot
  }

  setExt(newExt: string): void {
    this.ext = newExt
  }

  setBass(newBass: string): void {
    this.bass = newBass
  }

  setTranspo(newTranspo: number): void {
    this.transpo = newTranspo
  }

  setPreferredAccidental(newPreferredAccidental: string): void {
    this.preferredAccidental = newPreferredAccidental
  }
}

export default Chord
