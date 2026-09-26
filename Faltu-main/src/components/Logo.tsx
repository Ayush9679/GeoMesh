import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export default function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  const dimensions = {
    sm: { mark: 28, text: 'text-lg' },
    md: { mark: 36, text: 'text-xl' },
    lg: { mark: 48, text: 'text-2xl' },
  };
  const dim = dimensions[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <motion.img
        src="/geomesh_icon.png"
        alt="GeoMesh"
        width={dim.mark}
        height={dim.mark}
        style={{ width: dim.mark, height: dim.mark, objectFit: 'contain' }}
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        whileHover={{ scale: 1.08 }}
      />

      {showWordmark && (
        <span className={`font-display font-700 ${dim.text} tracking-tight text-white leading-none`}>
          Geo<span className="text-accent-300">Mesh</span>
        </span>
      )}
    </div>
  );
}
