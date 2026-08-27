import { createClient } from '@supabase/supabase-js'

// Las ponemos directas para asegurar que conecte al 100%
const supabaseUrl = 'https://amvurnyvbhapkrtcvxbw.supabase.co'
const supabaseKey = 'sb_publishable_2jwXSFLmhGlRC8y7DCGUHw_vFMWJyCY'

export const supabase = createClient(supabaseUrl, supabaseKey)