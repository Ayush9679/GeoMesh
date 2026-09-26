import React from 'react';
import { Layers, ShieldCheck, Compass, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#243B53] bg-[#050E1B] text-[#94A3B8] font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#10253D] border border-[#38BDF8]/40 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <span className="font-extrabold text-base tracking-wider text-[#F8FAFC]">GeoMesh</span>
            </div>
            <p className="text-[#64748B] text-xs leading-relaxed max-w-md font-sans">
              GeoMesh transforms cadastral information into an intelligent three-dimensional property infrastructure — connecting parcels, buildings, floors and flats through a unified digital identity.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#22C55E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3D ULPIN Open Spatial Specification Compliant</span>
            </div>
          </div>

          {/* Core Cadastral Links */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">Cadastral Modules</div>
            <ul className="space-y-1.5 text-xs text-[#94A3B8]">
              <li>
                <Link to="/explore" className="hover:text-[#38BDF8] transition-colors">3D Parcel Digital Twin</Link>
              </li>
              <li>
                <Link to="/validate" className="hover:text-[#38BDF8] transition-colors">ULPIN Identity Validator</Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#38BDF8] transition-colors">Surveyor Command Center</Link>
              </li>
              <li>
                <Link to="/explore?q=Knowledge%20Park" className="hover:text-[#38BDF8] transition-colors">Greater Noida Sector 3 Demo</Link>
              </li>
            </ul>
          </div>

          {/* Technical Specs */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">Spatial Engine</div>
            <div className="space-y-1 text-[11px] text-[#64748B]">
              <div>Projection: EPSG:4326 / WGS84</div>
              <div>Vertical Datum: EGM2008 Geoid</div>
              <div>Model: CityGML / 3D-LOD2</div>
              <div>Backend: FastAPI + GeoJSON + Shapely</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#243B53]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B]">
          <div>
            © 2026 GeoMesh Platform. Built for Next-Generation Land & Property Infrastructure.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#38BDF8]">Smart India Hackathon Edition</span>
            <span>•</span>
            <span>Digital India Land Records</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
