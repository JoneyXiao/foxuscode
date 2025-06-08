import { getUser } from "./auth"

export const auth = getUser
export const getServerSession = async () => {
  const user = await getUser()
  // Return session-like object with user for compatibility
  return user ? { user } : null
}
