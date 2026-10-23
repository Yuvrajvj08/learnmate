import React, { useState, useRef } from 'react';
import { BookOpen, CheckCircle, Brain, Target, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Hero3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 10, y: -12 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle 3D tilt angles (-16 to +16 deg)
    const rotateX = -((y - centerY) / centerY) * 14;
    const rotateY = ((x - centerX) / centerX) * 16;
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 8, y: -10 }); // Return to pleasant default isometric tilt
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="hero-3d-stage relative w-full max-w-xl mx-auto h-[460px] flex items-center justify-center cursor-pointer select-none py-4"
    >
      {/* 3D Transform Object Layer */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        {/* Layer 0 (Back): Ambient Backdrop Glow Plate */}
        <div
          className="absolute w-[90%] h-[340px] rounded-3xl bg-gradient-to-tr from-violet-600/20 via-indigo-600/15 to-cyan-500/10 border border-violet-500/20 backdrop-blur-md shadow-2xl shadow-indigo-950/60"
          style={{
            transform: 'translateZ(0px)',
          }}
        >
          {/* Subtle grid pattern inside */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] rounded-3xl" />
        </div>

        {/* Layer 1 (Middle): Central Study Material Card */}
        <div
          className="absolute w-[82%] p-5 rounded-2xl bg-[#141833]/90 border border-white/[0.12] backdrop-blur-2xl shadow-2xl shadow-black/80"
          style={{
            transform: 'translateZ(35px)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Active Source Material
              </span>
            </div>
            <Badge variant="cyan" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
              Grounded Evidence
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                Electric Charges & Fields
              </h4>
              <span className="text-[11px] text-violet-400 font-mono">Page 4 of 12</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0e1226]/80 p-3 rounded-xl border border-white/[0.05]">
              “Coulomb’s law states that the electrical force between two charged points is inversely proportional to the square of the distance between them...”
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Citation verified in source PDF</span>
              </div>
              <span className="text-[10px] font-mono bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">
                Ref #P4-C2
              </span>
            </div>
          </div>
        </div>

        {/* Layer 2 (Front-Left): Floating Diagnostic Insight Card */}
        <div
          className="absolute -left-3 bottom-12 w-64 p-3.5 rounded-2xl bg-[#181D3D]/95 border border-rose-500/40 shadow-2xl shadow-rose-950/40 backdrop-blur-xl"
          style={{
            transform: 'translateZ(70px)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" />
              Diagnosed Gap
            </span>
            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">
              High Confidence / Error
            </span>
          </div>
          <p className="text-xs font-semibold text-white">Electric Potential vs Field</p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Classified as <strong className="text-rose-300">Possible Misconception</strong>. Revision action generated.
          </p>
        </div>

        {/* Layer 3 (Front-Right): Floating Mastery Achievement Pill */}
        <div
          className="absolute -right-4 top-14 w-56 p-3.5 rounded-2xl bg-[#161C3B]/95 border border-emerald-500/40 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl"
          style={{
            transform: 'translateZ(90px)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Stage 4 Master
            </span>
            <span className="text-[10px] font-bold text-emerald-300 font-mono">+37.5%</span>
          </div>
          <p className="text-xs font-semibold text-white">Flux Density Mastery</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full w-[88%] rounded-full" />
          </div>
        </div>

        {/* Layer 4: Interactive Depth Badge */}
        <div
          className="absolute -bottom-4 right-8 px-3 py-1.5 rounded-xl bg-violet-600/90 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-600/40 border border-white/20"
          style={{
            transform: 'translateZ(105px)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>Interactive 3D Workspace</span>
        </div>
      </div>
    </div>
  );
};
