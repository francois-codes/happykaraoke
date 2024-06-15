export enum UserType {
  ADMIN = 'admin',
  GUEST = 'guest'
}

export interface User {
  id: string
  name: string
  type: UserType
}
