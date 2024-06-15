import Chord from './chord'

const tonaRegex = /^[A-G][b#]?(-|m|min)?$/

const tonalities = [
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

export const tonalitiesNames = tonalities.map((tona) => tona.names[0])

// Define positive modulus function
const modulus = (n: number, m: number): number => ((n % m) + m) % m

function getTonalityIndex(name: string): number {
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

// function getTonalityNames(index: number): string[] {
//   index = modulus(index, tonalities.length)
//   return tonalities[index].names
// }

export function stepsBetweenKeys(startKey, endKey) {
  const startIndex = getTonalityIndex(startKey)
  const endIndex = getTonalityIndex(endKey)

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Invalid key(s) provided.')
  }

  let steps = endIndex - startIndex

  // Ensure steps is positive and within the bounds of the array
  if (steps < 0) {
    steps += tonalitiesNames.length
  }

  return steps
}

export const transposeChord = (
  originalTonality: string | null,
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
