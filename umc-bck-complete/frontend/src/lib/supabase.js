import { createClient } from '@supabase/supabase-js'

// Real project — the same database every migration in this project has been
// applied to. Not a placeholder, not a mock.
export const SUPABASE_URL = 'https://ynuoaehkrdkjubzlipll.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludW9hZWhrcmRranViemxpcGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1ODE0NzMsImV4cCI6MjEwMTE1NzQ3M30.iLnCI95mxTLPL7xtmf98jNXZc8k-PsxWjR--wVbFk8s'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
