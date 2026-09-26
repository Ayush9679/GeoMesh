import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Layers,
  Home,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Eye,
  Box,
  MapPin,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  api,
  CitizenSearchResult,
  CitizenBuildingResponse,
  CitizenFloorResponse,
} from '../services/api';
import CityZoomView from '../components/CityZoomView';
import BuildingStrataHologram from '../components/Portal/BuildingStrataHologram';
import { findLocation, LocationData } from '../data/locations';

export default function CitizenSearchPage() {
  const { token, user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CitizenSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Drilldown state
  const [selectedParcel, setSelectedParcel] = useState<CitizenSearchResult | null>(null);
  const [buildings, setBuildings] = useState<CitizenBuildingResponse[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);

  const [selectedBuilding, setSelectedBuilding] = useState<CitizenBuildingResponse | null>(null);
  const [floors, setFloors] = useState<CitizenFloorResponse[]>([]);
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [floorsError, setFloorsError] = useState<string | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);

  // 3D City View state
  const [show3DView, setShow3DView] = useState(false);
  const [location3D, setLocation3D] = useState<LocationData | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/#auth', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Initial search on mount
  useEffect(() => {
    if (!token) return;
    handleSearch('knowledge');
  }, [token]);

  const handleSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q || !token) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await api.citizenSearch(token, q);
      setSearchResults(results);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search cadastral registry');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectParcel = async (parcel: CitizenSearchResult) => {
    setSelectedParcel(parcel);
    setSelectedBuilding(null);
    setFloors([]);
    setBuildingsLoading(true);
    setBuildingsError(null);

    // Setup 3D location if available
    const loc = findLocation(parcel.ulpin_3d) || findLocation(parcel.id);
    setLocation3D(loc || null);

    if (!token) return;
    try {
      const bData = await api.getCitizenBuildings(token, parcel.ulpin_3d);
      setBuildings(bData);
    } catch (err: any) {
      setBuildingsError(err.message || 'Failed to load building data');
    } finally {
      setBuildingsLoading(false);
    }
  };

  const handleSelectBuilding = async (building: CitizenBuildingResponse) => {
    if (!selectedParcel || !token) return;
    setSelectedBuilding(building);
    setFloorsLoading(true);
    setFloorsError(null);
    try {
      const fData = await api.getCitizenFloors(token, selectedParcel.ulpin_3d, building.id);
      setFloors(fData);
    } catch (err: any) {
      setFloorsError(err.message || 'Failed to load floors and units');
    } finally {
      setFloorsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={pageStyles.centered}>
        <div style={pageStyles.spinner} />
        <p style={{ color: '#94a3b8', marginTop: 14 }}>Authenticating citizen access…</p>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      {/* 3D City View Modal */}
      {show3DView && location3D && (
        <CityZoomView
          open={show3DView}
          location={location3D}
          onClose={() => setShow3DView(false)}
        />
      )}

      {/* Top Header */}
      <div style={pageStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={pageStyles.backBtn}
          >
            <ArrowLeft size={16} /> Home
          </button>
          <div>
            <div style={pageStyles.citizenBadge}>
              <ShieldCheck size={13} color="#38bdf8" />
              <span>Verified Citizen Portal</span>
            </div>
            <h1 style={pageStyles.title}>Citizen 3D Cadastral Explorer</h1>
            <p style={pageStyles.subtitle}>
              Search Indian multi-layer land records, explore strata volumes, and inspect verified 3D ULPIN units.
            </p>
          </div>
        </div>

        {user && (
          <div style={pageStyles.userCard}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#38bdf8', fontFamily: 'monospace' }}>Role: {user.role}</div>
          </div>
        )}
      </div>

      {/* Breadcrumb path if drilled down */}
      {selectedParcel && (
        <div style={pageStyles.breadcrumbBar}>
          <button
            type="button"
            onClick={() => { setSelectedParcel(null); setSelectedBuilding(null); }}
            style={pageStyles.breadcrumbBtn}
          >
            Search Results
          </button>
          <ChevronRight size={14} color="#64748b" />
          <button
            type="button"
            onClick={() => setSelectedBuilding(null)}
            style={{
              ...pageStyles.breadcrumbBtn,
              color: selectedBuilding ? '#94a3b8' : '#38bdf8',
              fontWeight: selectedBuilding ? 500 : 700,
            }}
          >
            {selectedParcel.name}
          </button>
          {selectedBuilding && (
            <>
              <ChevronRight size={14} color="#64748b" />
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
                {selectedBuilding.feature_name || `Building #${selectedBuilding.fid || selectedBuilding.id}`}
              </span>
            </>
          )}
        </div>
      )}

      {/* VIEW 1: SEARCH & PARCEL RESULTS (when no parcel is chosen) */}
      {!selectedParcel && (
        <>
          {/* Search Input Bar */}
          <div style={pageStyles.searchSection}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
              style={pageStyles.searchForm}
            >
              <Search size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parcels by name, ULPIN, or district (e.g. Knowledge Park, Delhi, UP1228)..."
                style={pageStyles.searchInput}
              />
              <button
                type="submit"
                disabled={searching}
                style={pageStyles.searchSubmitBtn}
              >
                {searching ? 'Searching…' : 'Search Cadastre'}
              </button>
            </form>
          </div>

          {searchError && (
            <div style={pageStyles.errorAlert}>
              <AlertTriangle size={18} color="#f87171" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Results Grid */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>
              Cadastral Records Found ({searchResults.length})
            </div>

            <div style={pageStyles.resultsGrid}>
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectParcel(p)}
                  style={pageStyles.parcelCard}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={pageStyles.classificationBadge}>{p.classification}</span>
                    {p.is_mine && (
                      <span style={pageStyles.mineBadge}>
                        <ShieldCheck size={12} /> Linked to You
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px' }}>
                    {p.name}
                  </h3>

                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <MapPin size={13} color="#38bdf8" />
                    <span>{p.state}</span>
                    <span>·</span>
                    <span>{p.area}</span>
                  </div>

                  <div style={pageStyles.ulpinCodeBox}>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>3D ULPIN IDENTIFIER</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                      {p.ulpin_3d}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {p.feature_count ? `${p.feature_count} registered buildings` : 'Multi-strata parcel'}
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Explore 3D Units →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: PARCEL BUILDINGS LIST (parcel selected, no building selected) */}
      {selectedParcel && !selectedBuilding && (
        <div>
          {/* Parcel Overview Bar */}
          <div style={pageStyles.overviewBar}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  {selectedParcel.name}
                </h2>
                {selectedParcel.is_mine && (
                  <span style={pageStyles.mineBadge}>
                    <ShieldCheck size={12} /> Owned Unit in Parcel
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0' }}>
                ULPIN: <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedParcel.ulpin_3d}</code> · {selectedParcel.state} · {selectedParcel.area}
              </p>
            </div>

            {location3D && (
              <button
                type="button"
                onClick={() => setShow3DView(true)}
                style={pageStyles.launch3DBtn}
              >
                <Box size={16} /> Launch Interactive 3D City View
              </button>
            )}
          </div>

          {buildingsLoading && (
            <div style={pageStyles.centered}>
              <div style={pageStyles.spinner} />
              <p style={{ color: '#94a3b8', marginTop: 12 }}>Loading parcel buildings and AI verification status…</p>
            </div>
          )}

          {buildingsError && (
            <div style={pageStyles.errorAlert}>
              <AlertTriangle size={18} color="#f87171" />
              <span>{buildingsError}</span>
            </div>
          )}

          {!buildingsLoading && !buildingsError && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>
                Registered Structures & Strata Blocks ({buildings.length})
              </div>

              <div style={pageStyles.buildingsGrid}>
                {buildings.map((b) => {
                  const isFlagged = b.flag_status === 'flagged';
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBuilding(b)}
                      style={pageStyles.buildingCard}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={pageStyles.buildingTypeBadge}>
                          {b.building_type || 'Structure'}
                        </span>
                        {isFlagged ? (
                          <span style={pageStyles.flagBadge}>
                            ⚠ {b.flag_reason || 'Under Review'}
                          </span>
                        ) : (
                          <span style={pageStyles.cleanBadge}>
                            ✓ Verified Clean
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px' }}>
                        {b.feature_name || `Building #${b.fid || b.id}`}
                      </h4>

                      <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 14, marginBottom: 12 }}>
                        <span>Floors: <strong>{b.floor_count}</strong></span>
                        {b.height && <span>Height: <strong>{b.height}m</strong></span>}
                        {b.area && <span>Footprint: <strong>{Math.round(b.area)} m²</strong></span>}
                      </div>

                      <div style={pageStyles.ulpinCodeBox}>
                        <span style={{ fontSize: 10, color: '#64748b' }}>BUILDING ULPIN</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#38bdf8' }}>
                          {b.ulpin_3d}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                        <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          View Floors & Flats →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: FLOORS & FLATS DRILL-DOWN (building selected) */}
      {selectedParcel && selectedBuilding && (
        <div>
          <div style={pageStyles.overviewBar}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {selectedBuilding.feature_name || `Building #${selectedBuilding.fid || selectedBuilding.id}`}
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                Building ULPIN: <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedBuilding.ulpin_3d}</code> · {selectedBuilding.floor_count} Floors
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBuilding(null)}
              style={pageStyles.backBtn}
            >
              ← Back to Buildings
            </button>
          </div>

          {floorsLoading && (
            <div style={pageStyles.centered}>
              <div style={pageStyles.spinner} />
              <p style={{ color: '#94a3b8', marginTop: 12 }}>Retrieving 3D floor units and cadastral ownership…</p>
            </div>
          )}

          {floorsError && (
            <div style={pageStyles.errorAlert}>
              <AlertTriangle size={18} color="#f87171" />
              <span>{floorsError}</span>
            </div>
          )}

          {!floorsLoading && !floorsError && floors.length === 0 && (
            <div style={pageStyles.emptyCard}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No floor levels have been cataloged for this structure yet.</p>
            </div>
          )}

          {!floorsLoading && !floorsError && floors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 3D Strata Slicer Hologram View */}
              <BuildingStrataHologram
                building={selectedBuilding}
                floors={floors}
                activeFloorId={activeFloorId}
                onSelectFloor={(fid) => setActiveFloorId(fid)}
                height={320}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>
                  Floor Strata & Units ({floors.length} Levels)
                </span>
                {activeFloorId && (
                  <button
                    type="button"
                    onClick={() => setActiveFloorId(null)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear Active Selection
                  </button>
                )}
              </div>

              {floors.map((fl) => {
                const isActive = activeFloorId === fl.id;
                return (
                  <div
                    key={fl.id}
                    onClick={() => setActiveFloorId(fl.id)}
                    style={{
                      ...pageStyles.floorCard,
                      border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isActive ? '0 0 20px rgba(56, 189, 248, 0.22)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Floor Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: isActive ? '#38bdf8' : '#f8fafc' }}>
                          {fl.floor_label}
                        </span>
                        <span style={pageStyles.floorNumberBadge}>
                          Level {fl.floor_number}
                        </span>
                        {/* Elevation Tag */}
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 5, padding: '2px 8px' }}>
                          📐 {(fl.elevation_base_m ?? 0) >= 0 ? '+' : ''}{(fl.elevation_base_m ?? 0).toFixed(1)}m → {(fl.elevation_top_m ?? 3) >= 0 ? '+' : ''}{(fl.elevation_top_m ?? 3).toFixed(1)}m
                        </span>
                        {fl.floor_ulpin ? (
                          <span style={pageStyles.ulpinPill}>
                            ULPIN: {fl.floor_ulpin}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748b' }}>ULPIN Pending</span>
                        )}
                        {fl.flag_status === 'flagged' && (
                          <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 4, padding: '2px 6px' }}>
                            ⚠ Under Review
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {fl.flat_count} Registered Flat{fl.flat_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Flats List */}
                    {fl.flats.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                        No flats defined on this floor.
                      </div>
                    ) : (
                      <div style={pageStyles.flatsGrid}>
                        {fl.flats.map((flat) => (
                          <div key={flat.id} style={pageStyles.flatCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                                Unit {flat.unit_number}
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 6px' }}>
                                {flat.unit_type}
                              </span>
                            </div>

                            <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                              {flat.area_sqm ? `${flat.area_sqm} m²` : 'Area not specified'}
                            </div>

                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                              Owner:{' '}
                              {flat.owner_name ? (
                                <span style={{ color: '#34d399', fontWeight: 600 }}>
                                  {flat.owner_name} (You)
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                                  [Redacted for Citizen Privacy]
                                </span>
                              )}
                            </div>

                            {flat.unit_ulpin && (
                              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '4px 6px', borderRadius: 4 }}>
                                {flat.unit_ulpin}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const pageStyles = {
  container: {
    minHeight: '100vh',
    background: '#02060e',
    color: '#f8fafc',
    padding: '24px 40px 80px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#f8fafc',
    margin: '4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    margin: 0,
    maxWidth: 620,
  },
  citizenBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    padding: '2px 8px',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  userCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: '8px 16px',
    textAlign: 'right' as const,
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 20,
  },
  breadcrumbBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '14px 16px',
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
  },
  searchSubmitBtn: {
    background: '#0284c7',
    border: 'none',
    color: '#fff',
    padding: '14px 24px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  parcelCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 18,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  classificationBadge: {
    fontSize: 11,
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 4,
    padding: '2px 7px',
    fontWeight: 600,
  },
  mineBadge: {
    fontSize: 11,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 4,
    padding: '2px 7px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  ulpinCodeBox: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: '8px 10px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  overviewBar: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap' as const,
    gap: 14,
  },
  launch3DBtn: {
    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
  },
  buildingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  buildingCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buildingTypeBadge: {
    fontSize: 11,
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    padding: '2px 6px',
  },
  cleanBadge: {
    fontSize: 10,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    padding: '2px 6px',
    fontWeight: 600,
  },
  flagBadge: {
    fontSize: 10,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 4,
    padding: '2px 6px',
    fontWeight: 600,
  },
  emptyCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 30,
    textAlign: 'center' as const,
  },
  floorCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 16,
  },
  floorNumberBadge: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 4,
    padding: '2px 6px',
  },
  ulpinPill: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 4,
    padding: '2px 8px',
  },
  flatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  flatCard: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 12,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '3px solid rgba(56, 189, 248, 0.2)',
    borderTopColor: '#38bdf8',
    animation: 'spin 0.8s linear infinite',
  },
};
