import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useProfile(session) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('primary_role, full_name')
        .eq('id', session.user.id)
        .single()
      if (!cancelled) {
        setProfile(data)
        setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [session])

  return { profile, loading }
}
