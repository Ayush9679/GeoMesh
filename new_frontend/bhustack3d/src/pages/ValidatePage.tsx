import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { parcelService } from '../services/parcelService';
import { ValidationResult } from '../types';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  WifiOff,
  ArrowRight,
  Loader2,
  MapPin,
} from 'lucide-react';

interface SampleUlpin {
  label: string;
  value: string;
  level: string;
  entity_type: string;
}

export const ValidatePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputUlpin, setInputUlpin] = useState(searchParams.get('ulpin') || '');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sampleUlpins, setSampleUlpins] = useState<SampleUlpin[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);

  // Load live specimen codes on mount — never show hardcoded stale values
  useEffect(() => {
    parcelService.getSampleUlpins().then((samples) => {
      setSampleUlpins(samples);
      setSamplesLoading(false);
    });
  }, []);

  const handleValidate = async (ulpinToValidate: string) => {
    const clean = ulpinToValidate.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await parcelService.validateUlpin(clean);
      setResult(res);
      setSearchParams({ ulpin: clean });
    } catch (err: any) {
      setResult({
        valid: false,
        ulpin: clean,
        error: 'Unable to reach the Cadastral verification service. Please check your connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const param = searchParams.get('ulpin');
    if (param) {
      setInputUlpin(param);
      handleValidate(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate(inputUlpin);
  };

  const getErrorIcon = (err?: string) => {
    if (!err) return <XCircle className="w-8 h-8 shrink-0" />;
    if (err.includes('reach') || err.includes('connection')) return <WifiOff className="w-8 h-8 shrink-0" />;
    if (err.includes('Malformed') || err.includes('format')) return <AlertCircle className="w-8 h-8 shrink-0" />;
    return <XCircle className="w-8 h-8 shrink-0" />;
  };

  const getErrorTitle = (err?: string) => {
    if (!err) return 'IDENTITY VALIDATION FAILED';
    if (err.includes('reach') || err.includes('connection')) return 'SERVICE UNAVAILABLE';
    if (err.includes('Malformed') || err.includes('format')) return 'MALFORMED IDENTIFIER';
    if (err.includes('checksum')) return 'CHECKSUM MISMATCH';
    if (err.includes('no matching') || err.includes('not in official')) return 'RECORD NOT FOUND IN REGISTRY';
    return 'IDENTITY VALIDATION FAILED';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#071426] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10253D] border border-[#38BDF8]/40 text-xs font-mono font-semibold text-[#38BDF8]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NATIONAL CADASTRAL REGISTRY CHECK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            VALIDATE PROPERTY IDENTITY
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-lg mx-auto">
            Verify 3D ULPIN authenticity against the Survey of India cadastral records database and digital twin index.
          </p>
        </div>

        {/* Input Form */}
        <div className="p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-xl space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="ulpin-input" className="block text-xs font-mono text-[#94A3B8] uppercase mb-1.5">
                Enter 3D ULPIN
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-[#64748B]" />
                <input
                  id="ulpin-input"
                  type="text"
                  value={inputUlpin}
                  onChange={(e) => setInputUlpin(e.target.value.toUpperCase())}
                  placeholder="e.g. UP28KP2GNIDA0A-V01-U101-C4"
                  className="w-full pl-11 pr-32 py-3 text-sm font-mono font-bold bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] tracking-wider uppercase"
                />
                <button
                  type="submit"
                  disabled={loading || !inputUlpin.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-6 rounded-md bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs hover:bg-[#60A5FA] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>VALIDATE</span>
                </button>
              </div>
            </div>
          </form>

          {/* Live specimen chips — only rendered when backend returned real data */}
          {samplesLoading && (
            <div className="pt-2 border-t border-[#243B53]">
              <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading registry specimens…
              </div>
            </div>
          )}
          {!samplesLoading && sampleUlpins.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#243B53]">
              <div className="text-[11px] font-mono text-[#64748B]">
                Try verified specimen codes (live from registry):
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleUlpins.map((s) => (
                  <button
                    key={s.value}
                    id={`specimen-${s.entity_type.toLowerCase()}`}
                    onClick={() => {
                      setInputUlpin(s.value);
                      handleValidate(s.value);
                    }}
                    title={s.label}
                    className="text-xs font-mono px-2.5 py-1 rounded bg-[#071426] text-[#38BDF8] border border-[#243B53] hover:border-[#38BDF8] transition-colors"
                  >
                    {s.value}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* If specimens couldn't load (backend offline), we show nothing — never fake codes */}
        </div>

        {/* Validation Output Result */}
        {result && (
          <div className="transition-all duration-300">
            {result.valid && result.details ? (
              /* ── Success ── */
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1F33] border border-[#22C55E]/50 shadow-2xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-0.5 rounded border border-[#22C55E]/30">
                      <CheckCircle2 className="w-4 h-4" />
                      AUTHENTIC &amp; SANCTIONED RECORD
                    </span>
                    <h2 className="text-2xl font-bold text-[#F8FAFC] pt-1">
                      {result.details.name}
                    </h2>
                    <p className="text-xs font-mono text-[#38BDF8]">ULPIN: {result.ulpin}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#10253D] border border-[#22C55E]/40 text-center font-mono shrink-0">
                    <div className="text-[10px] text-[#64748B] uppercase">Confidence</div>
                    <div className="text-xl font-black text-[#22C55E]">{result.details.confidence}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-4 border-t border-[#243B53]">
                  <div className="p-3 rounded-lg bg-[#10253D] border border-[#243B53] space-y-1">
                    <div className="text-[10px] text-[#64748B] uppercase">Hierarchy Level</div>
                    <div className="font-semibold text-[#F8FAFC]">{result.details.level}</div>
                    <div className="text-[11px] text-[#94A3B8]">{result.details.parentHierarchy}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#10253D] border border-[#243B53] space-y-1">
                    <div className="text-[10px] text-[#64748B] uppercase">Issuing Authority</div>
                    <div className="font-semibold text-[#F8FAFC]">{result.details.issuingAuthority}</div>
                    <div className="text-[11px] text-[#94A3B8]">Verified: {result.details.verificationDate}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#10253D] border border-[#243B53] text-xs font-mono flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span className="text-[#94A3B8]">Spatial Envelope: {result.details.geographicalBoundary}</span>
                </div>

                <div className="flex justify-end pt-2">
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs hover:bg-[#60A5FA] transition-colors"
                  >
                    <span>OPEN IN 3D CADASTRAL TWIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Error ── */
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1F33] border border-[#EF4444]/50 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-[#EF4444]">
                  {getErrorIcon(result.error)}
                  <div>
                    <h2 className="text-lg font-bold">{getErrorTitle(result.error)}</h2>
                    <p className="text-xs font-mono text-[#94A3B8]">{result.ulpin}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#10253D] border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] leading-relaxed">
                  {result.error || 'The submitted identifier does not match any authenticated 3D cadastral record.'}
                </div>
                {sampleUlpins.length > 0 && (
                  <p className="text-xs text-[#94A3B8]">
                    Try one of the verified specimen codes above, for example:{' '}
                    <code className="text-[#38BDF8]">{sampleUlpins[0]?.value}</code>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
