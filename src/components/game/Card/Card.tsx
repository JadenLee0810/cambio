'use client'

import { motion } from 'framer-motion'
import { Card as CardType } from '@/types/card'
import { CardFront } from './CardFront'
import { CardBack } from './CardBack'

interface CardProps {
  card: CardType
  isFaceUp: boolean
  isPlayable?: boolean
  onClick?: () => void
  className?: string
}

export const Card = ({ card, isFaceUp, isPlayable, onClick, className }: CardProps) => {
  return (
    <motion.div
      className={`relative w-24 h-36 cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={isPlayable ? { scale: 1.05, y: -10 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      initial={{ rotateY: isFaceUp ? 0 : 180 }}
      animate={{ rotateY: isFaceUp ? 0 : 180 }}
      transition={{ duration: 0.6 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
        <CardFront card={card} />
      </div>
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
      >
        <CardBack />
      </div>
    </motion.div>
  )
}