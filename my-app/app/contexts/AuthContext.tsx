'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role: 'citizen' | 'gov_employee', latitude?: number, longitude?: number, govSubRole?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string, role: 'citizen' | 'gov_employee', latitude?: number, longitude?: number, govSubRole?: string) => {
    if (role === 'gov_employee' && (latitude === undefined || longitude === undefined)) {
      throw new Error('Location is required for government employees')
    }

    if (role === 'gov_employee' && (!govSubRole || !govSubRole.trim())) {
      throw new Error('Government sector is required for government employees')
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          gov_sub_role: role === 'gov_employee' ? govSubRole?.trim() : null,
        },
      },
    })
    
    if (error) throw error
    if (data.user) {
      const { error: profileError } = await supabase.from('users2').insert({
        id: data.user.id,
        name: fullName,
        email,
        role,
        gov_sub_role: role === 'gov_employee' ? govSubRole?.trim() : null,
        latitude: role === 'gov_employee' ? latitude : null,
        longitude: role === 'gov_employee' ? longitude : null,
      })

      if (profileError) {
        throw new Error(`Failed to save profile: ${profileError.message}`)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
