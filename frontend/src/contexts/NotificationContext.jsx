import React, { createContext, useContext, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    enabled: !!user,
    // Poll every 15 seconds so new approval notifications appear promptly
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })

  const markRead = useCallback(async (ids = null) => {
    await api.post('/notifications/mark-read', ids ? { ids } : {})
    // Invalidate both the count and the list so the panel refreshes too
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient])

  // Call this after any action that creates a notification (e.g. capital sanction submit)
  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient])

  return (
    <NotificationContext.Provider value={{
      unreadCount: data?.count ?? 0,
      markRead,
      refreshNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
