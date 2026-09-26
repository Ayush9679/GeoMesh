import { SurveyRecord, Building } from '../types';
import { INITIAL_SURVEY_RECORDS, INITIAL_BUILDINGS, INITIAL_PARCELS } from './mockData';

const STORAGE_KEY_SURVEYS = 'GEOMESH_survey_records';
const STORAGE_KEY_BUILDINGS = 'GEOMESH_buildings_override';

function getStoredSurveys(): SurveyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SURVEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load stored surveys:', err);
  }
  return INITIAL_SURVEY_RECORDS;
}

function saveSurveys(surveys: SurveyRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SURVEYS, JSON.stringify(surveys));
  } catch (err) {
    console.warn('Failed to save surveys:', err);
  }
}

export const surveyService = {
  async getSurveyRecords(): Promise<SurveyRecord[]> {
    return getStoredSurveys();
  },

  async getSurveyStats() {
    const records = getStoredSurveys();
    const approvedCount = records.filter((r) => r.status === 'APPROVED').length;
    const pendingApprovalCount = records.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'FLAGGED_DISCREPANCY').length;
    const totalArea = records.reduce((sum, r) => sum + (r.areaSqM || 0), 0);
    const avgScore = records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.complianceScore, 0) / records.length)
      : 96;

    return {
      totalBuildingsSurveyed: records.length,
      approvedCount,
      pendingApprovalCount,
      totalArea,
      avgScore,
    };
  },

  async addSurveyRecord(record: Omit<SurveyRecord, 'id'>): Promise<SurveyRecord> {
    const surveys = getStoredSurveys();
    const newRecord: SurveyRecord = {
      ...record,
      id: `surv-rec-${Date.now()}`,
    };
    surveys.unshift(newRecord);
    saveSurveys(surveys);
    return newRecord;
  },

  /**
   * Auto-assigns compliant 14-digit hierarchical 3D ULPINs to all buildings
   */
  async autoAssign3DUlpinAllBuildings(buildings: Building[]): Promise<{ updatedCount: number; buildings: Building[] }> {
    const statePrefixes: Record<string, string> = {
      'parcel-kp2-0442': 'UP-GNB',
      'parcel-ecity-108': 'KA-BLR',
      'parcel-gift-0901': 'GJ-GND',
      'parcel-cyb-0412': 'HR-GGN',
    };

    const updated = buildings.map((bldg, idx) => {
      const prefix = statePrefixes[bldg.parcelId] || 'IN-CAD';
      const bldgNum = `B${String(idx + 1).padStart(2, '0')}`;
      const checksum = Math.floor(1000 + Math.random() * 9000);
      const new3DUlpin = `${prefix}-${bldgNum}-3DULPIN-${checksum}`;

      return {
        ...bldg,
        ulpin: new3DUlpin,
        status: bldg.status === 'PENDING_APPROVAL' ? 'ACTIVE' : bldg.status,
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    return { updatedCount: updated.length, buildings: updated };
  },

  /**
   * Auto-flags buildings for surveyor approval & review
   */
  async autoFlagBuildingsForApproval(buildings: Building[]): Promise<{ flaggedCount: number; buildings: Building[]; newRecords: SurveyRecord[] }> {
    const flagReasons = [
      'LiDAR vertical elevation exceeds sanction plan clearance by +2.1m (Z-axis audit required).',
      'Floor 07 to 10 cantilever volumetric setback review pending field inspection.',
      'Multipath GNSS signal deviation detected on eastern boundary perimeter.',
      'Cadastral subdivision deed mutation awaiting physical officer sign-off.',
    ];

    let flaggedCount = 0;
    const newRecords: SurveyRecord[] = [];
    const currentSurveys = getStoredSurveys();

    const updated = buildings.map((bldg, index) => {
      // Flag specific buildings (e.g. Building 02, Building 04, or unflagged)
      if (index === 1 || index === 3 || bldg.status === 'DISPUTED') {
        flaggedCount++;
        const reason = flagReasons[index % flagReasons.length];
        const dateStr = new Date().toISOString().split('T')[0];

        // Also add or update a pending survey review record
        const matchingSurvey = currentSurveys.find((s) => s.buildingId === bldg.id);
        if (matchingSurvey) {
          matchingSurvey.status = 'PENDING_APPROVAL';
          matchingSurvey.notes = `FLAGGED FOR APPROVAL: ${reason}`;
        } else {
          newRecords.push({
            id: `surv-flag-${bldg.id}-${Date.now()}`,
            buildingId: bldg.id,
            buildingName: bldg.name,
            parcelId: bldg.parcelId,
            parcelName: 'Knowledge Park II — Institutional Sector 3',
            location: 'Greater Noida Cadastral Cluster, Uttar Pradesh',
            coordinates: { lat: 28.4682, lng: 77.5042 },
            surveyDate: dateStr,
            surveyorId: 'usr-surv-01',
            surveyorName: 'Chief Cadastral Surveyor (Officer #704)',
            ulpin3D: bldg.ulpin,
            heightMeters: bldg.height,
            floorsCount: bldg.floorsCount,
            areaSqM: bldg.area,
            methodology: 'Terrestrial LiDAR',
            status: 'PENDING_APPROVAL',
            complianceScore: 78,
            notes: `FLAGGED FOR APPROVAL: ${reason}`,
            inspectionRef: `FLAG/2026/${bldg.code.replace(' ', '')}/${Math.floor(100 + Math.random() * 900)}`,
          });
        }

        return {
          ...bldg,
          status: 'PENDING_APPROVAL' as const,
          flaggedReason: reason,
          flaggedDate: dateStr,
        };
      }
      return bldg;
    });

    const combinedSurveys = [...newRecords, ...currentSurveys];
    saveSurveys(combinedSurveys);

    return { flaggedCount, buildings: updated, newRecords };
  },

  async approveSurveyRecord(recordId: string): Promise<SurveyRecord[]> {
    const surveys = getStoredSurveys();
    const updated = surveys.map((s) => {
      if (s.id === recordId) {
        return {
          ...s,
          status: 'APPROVED' as const,
          complianceScore: 98,
          notes: `APPROVED & CERTIFIED by Officer #704 on ${new Date().toISOString().split('T')[0]}. Digital signature sealed.`,
        };
      }
      return s;
    });
    saveSurveys(updated);
    return updated;
  },
};
