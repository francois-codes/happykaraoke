const notes = [
  ['C'],
  ['C#', 'Db'],
  ['D'],
  ['D#', 'Eb'],
  ['E'],
  ['F'],
  ['F#', 'Gb'],
  ['G'],
  ['G#', 'Ab'],
  ['A'],
  ['A#', 'Bb'],
  ['B']
]

// Define positive modulus function
const modulus = (n: number, m: number): number => ((n % m) + m) % m

class Note {
  static transpose(note: string, semitones: number, preferredAccidental: string = '#'): string {
    if (!note || note === '') {
      // console.log('Empty note transposition requested.');
      return note
    } else if (semitones === 0) {
      // console.log('0 semitones transposition requested.');
      return note
    } else {
      let noteIndex = notes.findIndex((noteArray) => noteArray.includes(note))

      if (noteIndex === -1) {
        console.log("Error: couldn't transpose note.", note)
        return note
      } else {
        noteIndex = modulus(noteIndex + semitones, notes.length)

        const transposedNotes = notes[noteIndex]
        if (transposedNotes.length === 1) {
          return transposedNotes[0]
        } else {
          const tester = new RegExp(preferredAccidental)
          const result = transposedNotes.find((noteName) => tester.test(noteName))
          if (result) {
            return result
          } else {
            return transposedNotes[0]
          }
        }
      }
    }
  }
}

export default Note
