import { request } from './api';
import { DigiLockerIntegration, BankKycIntegration } from '../types';
import { MOCK_DIGILOCKER_MAP, MOCK_BANK_KYC_MAP } from './mockData';

export const integrationService = {
  async getDigiLockerStatus(ulpin_id: string): Promise<DigiLockerIntegration> {
    try {
      const data = await request<DigiLockerIntegration>(`/integrations/digilocker/${encodeURIComponent(ulpin_id)}`);
      return {
        ...data,
        isMock: true,
        label: 'DEMO INTEGRATION',
      };
    } catch {
      const existing = MOCK_DIGILOCKER_MAP[ulpin_id];
      if (existing) return existing;

      return {
        isMock: true,
        label: 'DEMO INTEGRATION',
        status: 'VERIFIED',
        documentId: `DL-DEMO-${ulpin_id.replace(/[^a-zA-Z0-9]/g, '')}`,
        deedType: 'Cadastral Spatial Allotment Document (Demo)',
        issueDate: '2026-02-14',
        signatory: 'Competent Land Authority (Simulated)',
        verificationHash: `SHA256:DEMO-${ulpin_id}`,
      };
    }
  },

  async getBankKycStatus(ulpin_id: string): Promise<BankKycIntegration> {
    try {
      const data = await request<BankKycIntegration>(`/integrations/bank-kyc/${encodeURIComponent(ulpin_id)}`);
      return {
        ...data,
        isMock: true,
        label: 'DEMO INTEGRATION',
      };
    } catch {
      const existing = MOCK_BANK_KYC_MAP[ulpin_id];
      if (existing) return existing;

      return {
        isMock: true,
        label: 'DEMO INTEGRATION',
        status: 'CLEAR',
        lendingInstitution: 'Consortium of Mortgage Lenders (Demo Registry)',
        mortgageStatus: 'Zero Encumbrance Registered (Simulated)',
        loanAccountRef: `NIL-ENC-${ulpin_id}`,
        lastUpdated: '2026-03-01',
      };
    }
  },
};
