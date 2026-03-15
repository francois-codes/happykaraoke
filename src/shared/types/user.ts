export enum UserType {
  ADMIN = 'ADMIN',
  GUEST = 'GUEST'
}

export interface User {
  id: string
  name: string
  type: UserType
}
