import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    <div className={clsx('flex items-center', className)}>
      <span className={clsx('ml-1 text-2xl whitespace-nowrap flex font-medium items-center')}>Dan Thösen</span>
      {/* eslint-disable @next/next/no-img-element */}
      <img
        alt="Logo"
        loading={loading}
        fetchPriority={priority}
        decoding="async"
        className={clsx('max-w-[11rem] w-full h-[36px]')}
        src="/logo.png"
      />

    </div>
  )
}
