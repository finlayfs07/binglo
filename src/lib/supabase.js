import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase settings. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart `npm run dev`.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Remember the sign-in in progress, so two calls at the same time
// (e.g. React StrictMode running effects twice) don't create two users.
let signInPromise = null

export function ensureSignedIn() {
  if (!signInPromise) {
    signInPromise = signIn().catch((error) => {
      signInPromise = null // let the next call try again
      throw error
    })
  }
  return signInPromise
}

async function signIn() {
  // getSession reads the saved session from this browser, no network needed.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session) return sessionData.session.user

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user
}
