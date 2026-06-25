import { useState, useEffect } from 'react'

function formatClock() {
  const now = new Date()
  return {
    date: now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

export function useLiveTime() {
  const [clock, setClock] = useState(formatClock)

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000)
    return () => clearInterval(id)
  }, [])

  return clock
}
