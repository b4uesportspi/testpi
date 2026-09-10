interface ParticleBackgroundProps {
  count?: number;
}

export default function ParticleBackground({ count = 30 }: ParticleBackgroundProps) {
  // Create particles with different types and properties
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 10}s`,
    animationDuration: `${15 + Math.random() * 20}s`,
    size: `${4 + Math.random() * 6}px`,
    particleType: Math.floor(Math.random() * 5) + 1, // 1-5 for different particle types
  }));

  return (
    <div className="particles">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`particle particle-${particle.particleType}`}
          style={{
            left: particle.left,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
    </div>
  );
}