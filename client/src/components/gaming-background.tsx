import React from 'react';

interface GamingSymbolProps {
  id: number;
  symbol: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
  size: string;
  color: string;
}

const GamingSymbol: React.FC<GamingSymbolProps> = ({ 
  id, 
  symbol, 
  left, 
  animationDelay, 
  animationDuration,
  size,
  color
}) => {
  return (
    <div
      key={id}
      className="absolute opacity-20 font-bold select-none"
      style={{
        left,
        top: '-50px',
        fontSize: size,
        color,
        fontFamily: 'var(--font-mono)',
        textShadow: `0 0 8px ${color}`,
        animationName: 'symbol-fall',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationDelay,
        animationDuration,
        pointerEvents: 'none',
      } as React.CSSProperties}
    >
      {symbol}
    </div>
  );
};

interface GamingBackgroundProps {
  symbolCount?: number;
}

const GamingBackground: React.FC<GamingBackgroundProps> = ({ symbolCount = 20 }) => {
  // Gaming-themed symbols
  const symbols = ['🎮', '🕹️', '🎯', '👾', '🚀', '⭐', '⚡', '🔥', '💎', '🏆', '⚔️', '🛡️', '🎲', '🃏', '🎧', '💻', '📱', '🕹', '🎮', '🕹️'];
  
  // Gaming colors
  const colors = [
    'var(--gaming-blue)',
    'var(--gaming-purple)', 
    'var(--gaming-green)',
    'var(--gaming-gold)',
    'var(--gaming-red)'
  ];

  // Create falling symbols
  const fallingSymbols = Array.from({ length: symbolCount }, (_, i) => ({
    id: i,
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 15}s`,
    animationDuration: `${20 + Math.random() * 20}s`,
    size: `${16 + Math.random() * 24}px`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {fallingSymbols.map((symbol) => (
        <GamingSymbol
          key={symbol.id}
          id={symbol.id}
          symbol={symbol.symbol}
          left={symbol.left}
          animationDelay={symbol.animationDelay}
          animationDuration={symbol.animationDuration}
          size={symbol.size}
          color={symbol.color}
        />
      ))}
    </div>
  );
};

export default GamingBackground;