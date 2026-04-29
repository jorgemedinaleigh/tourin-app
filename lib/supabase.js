import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
const supabaseKey = supabasePublishableKey || supabaseAnonKey

if (!supabaseUrl || !supabaseKey) {
  const missingVariables = [
    !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
    !supabaseKey ? 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean)

  throw new Error(
    `Missing Supabase configuration: ${missingVariables.join(', ')}. ` +
    'Set these values in .env for local development and in the matching EAS environment ' +
    '(for preview builds, configure the EAS preview environment), then rebuild the app.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
