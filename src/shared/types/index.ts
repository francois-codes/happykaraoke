export * from './song'
export * from './user'

type Year = `${number}${number}${number}${number}`
type Month = `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `1${0 | 1 | 2}`
type Day = `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `${1 | 2}${number}` | `30` | `31`

export type ISODate = `${Year}-${Month}-${Day}`
