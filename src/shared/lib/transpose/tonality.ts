import Chord from './chord'

const tonaRegex = /^[A-G][b#]?(-|m|min)?$/

export interface Tonality {
  names: string[]
  preferredAccidental: string
}

export const tonalities: Tonality[] = [
  {
    names: ['C', 'A-'],
    preferredAccidental: ''
  },
  {
    names: ['C#', 'Db', 'A#-', 'Bb-'],
    preferredAccidental: 'b'
  },
  {
    names: ['D', 'B-'],
    preferredAccidental: '#'
  },
  {
    names: ['D#', 'Eb', 'C-'],
    preferredAccidental: 'b'
  },
  {
    names: ['E', 'C#-', 'Db-'],
    preferredAccidental: '#'
  },
  {
    names: ['F', 'D-'],
    preferredAccidental: 'b'
  },
  {
    names: ['F#', 'Gb', 'D#-', 'Eb-'],
    preferredAccidental: '#'
  },
  {
    names: ['G', 'E-'],
    preferredAccidental: '#'
  },
  {
    names: ['G#', 'Ab', 'F-'],
    preferredAccidental: 'b'
  },
  {
    names: ['A', 'F#-', 'Gb-'],
    preferredAccidental: '#'
  },
  {
    names: ['A#', 'Bb', 'G-'],
    preferredAccidental: 'b'
  },
  {
    names: ['B', 'G#-', 'Ab-'],
    preferredAccidental: '#'
  }
]

export function getTonalityPreferredName(tonality: Tonality, minorMode) {
  const names = tonality.names.filter((name) => minorMode === name.includes('-'))

  return (
    names.find((name) => name.includes(tonality.preferredAccidental) && !name.includes('-')) ??
    names[0]
  )
}

// Define positive modulus function
const modulus = (n: number, m: number): number => ((n % m) + m) % m

export function getTonalityIndex(name: string): number {
  if (!tonaRegex.test(name)) {
    throw new Error("Couldn't initialize tonality, invalid name.")
  } else {
    const normalizedName = name.replace(/(m|min)/, '-')
    return tonalities.findIndex((tona) => tona.names.includes(normalizedName))
  }
}

function getPreferredAccidental(index: number): string {
  index = modulus(index, tonalities.length)
  return tonalities[index].preferredAccidental
}

export function stepsBetweenKeys(startKey, endKey) {
  const startIndex = getTonalityIndex(startKey)
  const endIndex = getTonalityIndex(endKey)

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Invalid key(s) provided.')
  }

  let steps = endIndex - startIndex

  // Ensure steps is positive and within the bounds of the array
  if (steps < 0) {
    steps += tonalities.length
  }

  return steps
}

export const transposeChord = (
  originalTonality: string | undefined,
  transpo: number,
  chordString: string
): string => {
  if (!originalTonality) return chordString

  const chord = new Chord(chordString)
  const tonaIndex = getTonalityIndex(originalTonality)
  const transposedIndex = tonaIndex + transpo
  const preferredAccidental = getPreferredAccidental(transposedIndex)

  chord.setTranspo(transpo)
  chord.setPreferredAccidental(preferredAccidental)

  return chord.getName()
}
