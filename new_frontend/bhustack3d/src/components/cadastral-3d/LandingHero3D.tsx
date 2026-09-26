import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle2, ArrowUpRight } from 'lucide-react';

/**
 * Landing-page hero for GeoMesh — v4.
 *
 * Drops the 3D/radar scene entirely. The subject here is land records —
 * deeds, stamps, ULPIN certificates — so the hero visual is built from
 * that vocabulary instead of a generic tech dashboard: a single digitised
 * "record card" that looks like a certificate, with one deliberate
 * moment of motion (the verification seal stamping down on load).
 * Everything else is quiet: no radar sweeps, no starfields, no gradient
 * decoration.
 *
 * Component name / props are kept identical (`LandingHero3D`, `heightClass`)
 * so nothing else in the app needs to change — swap the file and go.
 */

const RECORD = {
  ulpin: 'GN-0704-1041',
  owner: 'Rakesh Sharma',
  village: 'Bisrakh, Gautam Buddh Nagar, UP',
  area: '1,240 sq.ft · Khasra No. 214/2',
  verifiedOn: '18 Sep 2026',
};

export const LandingHero3D: React.FC<{ heightClass?: string }> = ({
  heightClass = 'min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]',
}) => {
  const [stamped, setStamped] = useState(false);

  return (
    <section
      className={`relative w-full ${heightClass} bg-[#0B1220] overflow-hidden flex items-center`}
    >
      {/* faint paper-grain / linework backdrop, kept extremely quiet */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#F4F0E6 1px, transparent 1px), linear-gradient(90deg, #F4F0E6 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-10 py-16 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
        {/* ------------------------------ Copy ------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <h1
            className="text-[#F4F0E6] font-serif leading-[1.05] tracking-tight text-[2.6rem] sm:text-[3.4rem] lg:text-[3.8rem]"
            style={{ fontFamily: "'Fraunces', 'Source Serif 4', Georgia, serif" }}
          >
            Every parcel,
            <br />
            provably yours.
          </h1>

          <p className="mt-6 text-[#AEB6C4] text-base sm:text-lg leading-relaxed max-w-md">
            GeoMesh turns paper land records into tamper-proof digital
            deeds — searchable by owner, khasra number, or ULPIN, and
            verified against the original registry.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button className="inline-flex items-center gap-2 rounded-md bg-[#C6A15B] text-[#0B1220] font-medium px-5 py-3 text-sm hover:bg-[#D4B36F] transition-colors">
              Search a parcel
              <Search className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-1.5 text-[#F4F0E6] text-sm font-medium px-2 py-3 group">
              Talk to our team
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md border-t border-[#243149] pt-6">
            <div>
              <div className="text-[#F4F0E6] text-xl font-serif" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                12,480
              </div>
              <div className="text-[#7C879A] text-xs mt-1 leading-snug">Parcels digitised</div>
            </div>
            <div>
              <div className="text-[#F4F0E6] text-xl font-serif" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                28
              </div>
              <div className="text-[#7C879A] text-xs mt-1 leading-snug">Districts covered</div>
            </div>
            <div>
              <div className="text-[#F4F0E6] text-xl font-serif" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                98.7%
              </div>
              <div className="text-[#7C879A] text-xs mt-1 leading-snug">Match accuracy</div>
            </div>
          </div>
        </motion.div>

        {/* --------------------------- Record card --------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -1.5 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          onAnimationComplete={() => setStamped(true)}
          className="relative mx-auto w-full max-w-[380px]"
        >
          <div
            className="relative bg-[#F4F0E6] text-[#1C2333] rounded-sm shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] px-7 py-8"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(28,35,51,0.02) 0px, rgba(28,35,51,0.02) 1px, transparent 1px, transparent 3px)',
            }}
          >
            <div className="flex items-start justify-between border-b border-[#1C2333]/15 pb-4">
              <div>
                <div className="text-[10px] tracking-wide text-[#6B7280] font-medium">Land Record Certificate</div>
                <div className="mt-1 font-serif text-lg" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {RECORD.ulpin}
                </div>
              </div>
              <div className="text-[10px] text-[#6B7280] text-right leading-snug">
                Issued<br />{RECORD.verifiedOn}
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#6B7280]">Owner</dt>
                <dd className="text-right font-medium">{RECORD.owner}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6B7280]">Location</dt>
                <dd className="text-right font-medium max-w-[60%]">{RECORD.village}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6B7280]">Extent</dt>
                <dd className="text-right font-medium">{RECORD.area}</dd>
              </div>
            </dl>

            {/* simple linework parcel sketch, not a dashboard */}
            <svg viewBox="0 0 320 120" className="mt-6 w-full h-auto">
              <polygon
                points="20,20 180,14 190,100 30,106"
                fill="none"
                stroke="#1C2333"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <polygon
                points="200,26 300,34 292,96 196,92"
                fill="none"
                stroke="#1C2333"
                strokeOpacity="0.2"
                strokeWidth="1.5"
              />
            </svg>

            {/* verification seal — the one deliberate motion moment */}
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -8 }}
              animate={stamped ? { scale: 1, opacity: 1, rotate: -8 } : {}}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full border-[3px] border-[#B4432E] flex flex-col items-center justify-center text-[#B4432E] bg-[#F4F0E6]"
              style={{ transform: 'rotate(-8deg)' }}
            >
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold tracking-wide leading-none">VERIFIED</span>
              <span className="text-[7px] leading-none mt-0.5">REGISTRY MATCH</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};