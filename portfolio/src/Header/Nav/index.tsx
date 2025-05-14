`use client`

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

const NavLink: React.FC<{ href: string; label: string }> = ({ href, label }) => {
  const pathname = usePathname()
  const isActive = pathname === href
  const [isHovered, setIsHovered] = useState(false)

  // Determine text color: always black if selected, otherwise white on hover, black otherwise
  const textColor = isActive ? '#000000' : isHovered ? '#FFFFFF' : '#000000'

  return (
    <Link
      href={href}
      className="relative px-4 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shared highlight: full card on hover, line on active */}
      {(isHovered || isActive) && (
        <motion.div
          layoutId="highlight"
          className="absolute bg-blue-500 rounded-md"
          style={{
            top: isActive ? 'auto' : 0,
            bottom: isActive ? 0 : 'auto',
            height: isActive ? 2 : '100%',
            width: '100%',
            left: 0,
          }}
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
        />
      )}

      {/* Label */}
      <span className="relative transition-colors duration-200" style={{ color: textColor }}>
        {label}
      </span>
    </Link>
  )
}

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav className="flex gap-4 items-center relative">
      {navItems.map(({ link }, i) => (
        <CMSLink key={i} {...link} appearance="link" />
      ))}
      <NavLink href="/art" label="Art" />
      <NavLink href="/projects" label="Projects" />
      <NavLink href="/resume" label="resume" />
      <NavLink href="/scientific-works" label="Scientific works" />
      <Link href="/search" className="relative px-4 py-2">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 h-5 text-black" />
      </Link>
    </nav>
  )
}
