declare module '*.png' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}

type Song = TableType<{
  title: string
  author: string
  key: string
  tags: string
  lines: string[]
}>

declare module 'utils'

declare type KEY_VALUES = import('./lib/consts').KEYS

declare type ModifierKey = 'meta' | 'ctrl' | 'shift' | 'alt'

declare type ModifierKeyProp = `${modifier}Key`

declare interface IShortcut {
  key: KEY_VALUES
  modifiers: ModifierKey[]
  matches(event: KeyboardEvent): boolean
  get label(): string
}

declare type Maybe<T> = T | undefined | null

declare type Nullable<T> = T | null

declare type MaybeArray<T> = T | T[]

declare type MaybePromise<T> = T | Promise<T>

declare type ValueOf<T> = T[keyof T]

declare interface Window {
  electron?: {
    openDialog: () => Promise<string>
    writeScrollDiagnosticLog: (content: string) => Promise<{ path: string; name: string }>
    revealScrollDiagnosticLogs: () => Promise<void>
  }
}
