/**
 * ===========================================================================
 * KoparNiti (कोपरनीती) - Civic Claim Verification & Provenance Service
 *
 * Implements P1 Tasks 1, 2, 3, 4, 5, 6:
 *  - Complete claim lifecycle (UNVERIFIED -> UNDER_REVIEW -> VERIFIED_TRUE/FALSE/PARTIALLY_TRUE/INSUFFICIENT_EVIDENCE)
 *  - Official Evidence repository with cryptographic content hashes
 *  - Immutable official answer versioning (V1 -> V2 supersession tracking)
 *  - Provenance trails for public citizen transparency and defensibility
 * ===========================================================================
 */

import { CivicClaim, CivicEvidence, OfficialAnswer, CivicClaimStatus } from '../types';
import { computeSHA256Sync } from './cryptoUtils';

const CLAIMS_STORAGE_KEY = 'civicpulse_claims_repo_v2';
const ANSWERS_STORAGE_KEY = 'civicpulse_official_answers_v2';
const EVIDENCE_STORAGE_KEY = 'civicpulse_evidence_repo_v2';

// ---------------------------------------------------------------------------
// 1. Baseline Seeded Official Evidence Records (P0 & P1 Provenance)
// ---------------------------------------------------------------------------
export const SEED_EVIDENCE: CivicEvidence[] = [
  {
    id: 'EVID-SWM-001',
    type: 'OFFICIAL_RECORD',
    title: 'Ward 4 Daily Solid Waste Compactor GPS & Weighbridge Log',
    source: 'KMC Solid Waste Management Dept',
    sourceReference: 'KMC/SWM/LOG/2026/08-30-01',
    contentHash: computeSHA256Sync('KMC-SWM-LOG-WARD4-COMPACTOR-ACTIVE-2026-08-30'),
    collectedAt: '2026-08-30T04:00:00.000Z',
    verifiedBy: 'Er. R. K. Patil (Sanitation Superintendent)',
    verificationStatus: 'VERIFIED',
    description: 'Automated GPS telematics log confirming 100% route completion of compactor vehicle MH-17-AZ-1044 across Ward 4 alleys.',
  },
  {
    id: 'EVID-WSS-002',
    type: 'OFFICIAL_DOCUMENT',
    title: 'Kopargaon Water Treatment Plant Bacteriological & Chlorine Residual Lab Report',
    source: 'KMC Public Health Engineering Laboratory',
    sourceReference: 'WSS/LAB/ANALYSIS/2026-W34',
    contentHash: computeSHA256Sync('KMC-WSS-LAB-CHLORINE-0.5PPM-COLIFORM-ZERO-2026-08-29'),
    collectedAt: '2026-08-29T18:30:00.000Z',
    verifiedBy: 'Dr. V. M. Shinde (Chief Municipal Microbiologist)',
    verificationStatus: 'VERIFIED',
    description: 'Certified lab analysis of Godavari master intake and elevated storage reservoir; free residual chlorine maintained at 0.5 mg/L with zero E. coli.',
  },
  {
    id: 'EVID-WSS-003',
    type: 'FIELD_VERIFICATION',
    title: 'Civil Hospital OPD Potable Water Pipeline Physical Inspection & Pressure Test',
    source: 'KMC Water Supply & Sanitation Department',
    sourceReference: 'KMC/FIELD/INSP/2026/08-30-W4',
    contentHash: computeSHA256Sync('KMC-FIELD-CIVIL-HOSPITAL-SEWER-CROSS-LEAK-DETECTED'),
    collectedAt: '2026-08-30T02:15:00.000Z',
    verifiedBy: 'Er. S. B. Deshmukh (Executive Engineer)',
    verificationStatus: 'VERIFIED',
    description: 'On-site excavation at Hospital Road junction confirmed cross-contamination between broken stormwater sewer and sub-main drinking line; rapid response crew dispatched.',
  },
  {
    id: 'EVID-PWD-004',
    type: 'OFFICIAL_RECORD',
    title: 'Station Road Arterial Asphalt Bitumen Core Density & Defect Log',
    source: 'KMC Public Works Department (PWD)',
    sourceReference: 'KMC/PWD/RD/2026/07-14',
    contentHash: computeSHA256Sync('KMC-PWD-STATION-ROAD-DEFECT-LOG-2026'),
    collectedAt: '2026-08-28T14:00:00.000Z',
    verifiedBy: 'Er. P. N. Joshi (Assistant Engineer)',
    verificationStatus: 'VERIFIED',
    description: 'Routine PWD structural asphalt audit documenting localized pothole formation at chainage 1+400 requiring jetting suction pre-clearing.',
  },
];

// ---------------------------------------------------------------------------
// 2. Baseline Seeded Civic Claims (P1 Task 19 Demo Scenarios)
// ---------------------------------------------------------------------------
export const SEED_CLAIMS: CivicClaim[] = [
  {
    id: 'CLM-2026-001',
    title: 'WhatsApp Viral Rumor: Garbage pickup completely halted across Ward 4',
    submittedText: 'Viral audio message circulating on Kopargaon WhatsApp groups claiming that sanitation workers are on indefinite strike and garbage collection is suspended.',
    category: 'Sanitation',
    sourceType: 'CITIZEN',
    submittedBy: 'Kopargaon Citizen Forum',
    status: 'VERIFIED_FALSE',
    riskScore: 84,
    evidenceIds: ['EVID-SWM-001'],
    sourceAuthority: 'KMC Solid Waste Management Dept',
    sourceDocumentId: 'KMC/SWM/LOG/2026/08-30-01',
    reviewedBy: 'Er. R. K. Patil (Sanitation Superintendent)',
    reviewedAt: '2026-08-30T04:30:00.000Z',
    reviewNotes: 'GPS logs confirm all 4 compactor trucks completed morning routes normally. Audio rumor debunked.',
    effectiveFrom: '2026-08-30T04:30:00.000Z',
    effectiveUntil: '2026-09-06T23:59:59.000Z',
    createdAt: '2026-08-30T03:45:00.000Z',
    updatedAt: '2026-08-30T04:30:00.000Z',
  },
  {
    id: 'CLM-2026-002',
    relatedIssueId: 'iss-seed-00101',
    title: 'Water Supply Contamination near Civil Hospital OPD',
    submittedText: 'Drinking water from taps in staff quarters and OPD washbasins at Civil Hospital smells like sewage and has yellow tint.',
    category: 'Water Supply',
    sourceType: 'OFFICIAL_NOTICE',
    submittedBy: 'Civil Hospital Attendant & Ward 4 Residents',
    status: 'VERIFIED_TRUE',
    riskScore: 95,
    evidenceIds: ['EVID-WSS-002', 'EVID-WSS-003'],
    sourceAuthority: 'KMC Water Supply & Sanitation Department',
    sourceDocumentId: 'KMC/FIELD/INSP/2026/08-30-W4',
    reviewedBy: 'Er. S. B. Deshmukh (Executive Engineer)',
    reviewedAt: '2026-08-30T03:00:00.000Z',
    reviewNotes: 'Field excavation confirmed sewer line backflow into localized distribution pipe. Main treatment plant water is clean, but localized hospital branch is contaminated. Jetting dispatch initiated.',
    effectiveFrom: '2026-08-30T03:00:00.000Z',
    effectiveUntil: '2026-09-02T23:59:59.000Z',
    createdAt: '2026-08-30T02:00:00.000Z',
    updatedAt: '2026-08-30T03:00:00.000Z',
  },
  {
    id: 'CLM-2026-003',
    title: 'Dengue Outbreak Rumor at Subhash Chowk Market',
    submittedText: 'Unverified social media post claiming 40+ hospitalization cases of hemorrhagic dengue in Subhash Chowk within 48 hours.',
    category: 'Public Health',
    sourceType: 'CITIZEN',
    submittedBy: 'Anonymous Citizen',
    status: 'INSUFFICIENT_EVIDENCE',
    riskScore: 68,
    evidenceIds: [],
    sourceAuthority: 'KMC Public Health Department',
    reviewedBy: 'Dr. A. P. Kulkarni (Health Officer)',
    reviewedAt: '2026-08-30T04:15:00.000Z',
    reviewNotes: 'Hospital records show only 2 viral fever cases. Official vector surveillance team deployed for larvae testing. Claim remains under active investigation.',
    effectiveFrom: '2026-08-30T04:15:00.000Z',
    createdAt: '2026-08-30T03:30:00.000Z',
    updatedAt: '2026-08-30T04:15:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// 3. Baseline Seeded Official Answers (Versioned with Provenance)
// ---------------------------------------------------------------------------
export const SEED_OFFICIAL_ANSWERS: OfficialAnswer[] = [
  {
    id: 'ANS-2026-001-V1',
    version: 1,
    claimId: 'CLM-2026-001',
    claimSummary: 'Garbage pickup is completely halted in Ward 4.',
    verdict: 'VERIFIED_FALSE',
    authority: 'KMC Solid Waste Management Department',
    reviewedBy: 'Er. R. K. Patil (Sanitation Superintendent)',
    reviewedAt: '2026-08-30T04:30:00.000Z',
    evidence: [SEED_EVIDENCE[0]],
    policyVersion: 'KMC-SWM-2026-V2',
    validUntil: '2026-09-06T23:59:59.000Z',
    officialStatementEn: 'FALSE. Door-to-door solid waste collection in Ward 4 operates on regular morning schedules. Telematics telemetry logs confirm all 4 compactor trucks completed 100% of routes on 30 Aug 2026.',
    officialStatementMr: 'खोटे. प्रभाग क्र. ४ मध्ये कचरा संकलन नियमित सुरू आहे. ३० ऑगस्ट रोजी सकाळी सर्व ४ कॉम्पॅक्टर वाहनांनी १००% मार्ग पूर्ण केल्याची जीपीएस नोंदीद्वारे पुष्टी झाली आहे.',
    isCitizenFacing: true,
    publishedAt: '2026-08-30T04:30:00.000Z',
    provenanceHash: computeSHA256Sync('ANS-2026-001-V1-VERIFIED_FALSE-KMC-SWM-2026-V2'),
  },
  {
    id: 'ANS-2026-002-V1',
    version: 1,
    claimId: 'CLM-2026-002',
    claimSummary: 'Water supply near Civil Hospital OPD is contaminated.',
    verdict: 'VERIFIED_TRUE',
    authority: 'KMC Water Supply & Sanitation Department',
    reviewedBy: 'Er. S. B. Deshmukh (Executive Engineer)',
    reviewedAt: '2026-08-30T03:00:00.000Z',
    evidence: [SEED_EVIDENCE[1], SEED_EVIDENCE[2]],
    policyVersion: 'KMC-WSS-2026-V4',
    validUntil: '2026-09-02T23:59:59.000Z',
    officialStatementEn: 'VERIFIED TRUE (LOCALIZED). Main Godavari treatment supply is 100% safe, but a localized sewer cross-contamination leak was detected at the Civil Hospital junction. Tanker relief dispatched while jetting repair proceeds.',
    officialStatementMr: 'तथ्य सत्य (स्थानिक). गोदावरी जलशुद्धीकरण केंद्राचे पाणी सुरक्षित आहे, मात्र सिव्हिल हॉस्पिटलजवळील स्थानिक वाहिनीमध्ये सांडपाणी गळती आढळली आहे. टँकरने पाणीपुरवठा सुरू असून दुरुस्ती काम सुरू आहे.',
    isCitizenFacing: true,
    publishedAt: '2026-08-30T03:00:00.000Z',
    provenanceHash: computeSHA256Sync('ANS-2026-002-V1-VERIFIED_TRUE-KMC-WSS-2026-V4'),
  },
];

export class ClaimVerificationService {
  private static claims: CivicClaim[] = [];
  private static evidenceRepo: CivicEvidence[] = [];
  private static officialAnswers: OfficialAnswer[] = [];

  /**
   * Initializes storage with baseline evidence, claims, and answers.
   */
  public static init(): void {
    if (typeof window === 'undefined') {
      this.claims = [...SEED_CLAIMS];
      this.evidenceRepo = [...SEED_EVIDENCE];
      this.officialAnswers = [...SEED_OFFICIAL_ANSWERS];
      return;
    }

    try {
      const storedClaims = localStorage.getItem(CLAIMS_STORAGE_KEY);
      this.claims = storedClaims ? JSON.parse(storedClaims) : [...SEED_CLAIMS];

      const storedEvid = localStorage.getItem(EVIDENCE_STORAGE_KEY);
      this.evidenceRepo = storedEvid ? JSON.parse(storedEvid) : [...SEED_EVIDENCE];

      const storedAns = localStorage.getItem(ANSWERS_STORAGE_KEY);
      this.officialAnswers = storedAns ? JSON.parse(storedAns) : [...SEED_OFFICIAL_ANSWERS];
    } catch {
      this.claims = [...SEED_CLAIMS];
      this.evidenceRepo = [...SEED_EVIDENCE];
      this.officialAnswers = [...SEED_OFFICIAL_ANSWERS];
    }
  }

  private static persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(this.claims));
      localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(this.evidenceRepo));
      localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(this.officialAnswers));
    } catch (e) {
      console.warn('Failed to persist claims/answers state:', e);
    }
  }

  public static getAllClaims(): CivicClaim[] {
    if (this.claims.length === 0) this.init();
    return [...this.claims];
  }

  public static getAllEvidence(): CivicEvidence[] {
    if (this.evidenceRepo.length === 0) this.init();
    return [...this.evidenceRepo];
  }

  public static getAllOfficialAnswers(): OfficialAnswer[] {
    if (this.officialAnswers.length === 0) this.init();
    return [...this.officialAnswers];
  }

  public static getActiveOfficialAnswers(): OfficialAnswer[] {
    if (this.officialAnswers.length === 0) this.init();
    return this.officialAnswers.filter((a) => !a.supersededByAnswerId);
  }

  /**
   * Submits a new citizen or officer claim for verification.
   */
  public static submitClaim(data: {
    title: string;
    submittedText: string;
    category: string;
    sourceType?: CivicClaim['sourceType'];
    submittedBy?: string;
    relatedIssueId?: string;
  }): CivicClaim {
    if (this.claims.length === 0) this.init();

    const newClaim: CivicClaim = {
      id: `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      relatedIssueId: data.relatedIssueId,
      title: data.title,
      submittedText: data.submittedText,
      category: data.category,
      sourceType: data.sourceType || 'CITIZEN',
      submittedBy: data.submittedBy || 'Citizen',
      status: 'UNVERIFIED',
      riskScore: 50,
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.claims.unshift(newClaim);
    this.persist();
    return newClaim;
  }

  /**
   * Adds an official evidence record with automatic SHA-256 content hashing.
   */
  public static addEvidence(data: Omit<CivicEvidence, 'id' | 'contentHash'>): CivicEvidence {
    if (this.evidenceRepo.length === 0) this.init();

    const rawContent = `${data.title}|${data.source}|${data.sourceReference || ''}|${data.collectedAt || ''}|${data.verifiedBy || ''}`;
    const contentHash = computeSHA256Sync(rawContent);

    const newEvidence: CivicEvidence = {
      ...data,
      id: `EVID-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      contentHash,
    };

    this.evidenceRepo.push(newEvidence);
    this.persist();
    return newEvidence;
  }

  /**
   * Publishes an authoritative official answer backed by evidence and policy versioning.
   */
  public static publishOfficialAnswer(params: {
    claimId: string;
    verdict: CivicClaimStatus;
    authority: string;
    reviewedBy: string;
    evidenceIds: string[];
    policyVersion: string;
    validUntilDays?: number;
    officialStatementEn: string;
    officialStatementMr: string;
  }): OfficialAnswer {
    if (this.claims.length === 0) this.init();

    const claim = this.claims.find((c) => c.id === params.claimId);
    if (!claim) throw new Error(`Claim not found: ${params.claimId}`);

    // Update claim status
    claim.status = params.verdict;
    claim.reviewedBy = params.reviewedBy;
    claim.reviewedAt = new Date().toISOString();
    claim.evidenceIds = params.evidenceIds;
    claim.sourceAuthority = params.authority;
    claim.updatedAt = new Date().toISOString();

    const validUntilDate = new Date(Date.now() + (params.validUntilDays || 7) * 24 * 3600 * 1000).toISOString();
    const attachedEvidence = this.evidenceRepo.filter((e) => params.evidenceIds.includes(e.id));

    const answerId = `ANS-${claim.id}-V1`;
    const provenanceContent = `${answerId}|${params.verdict}|${params.authority}|${params.policyVersion}|${params.reviewedBy}`;
    const provenanceHash = computeSHA256Sync(provenanceContent);

    const answer: OfficialAnswer = {
      id: answerId,
      version: 1,
      claimId: claim.id,
      claimSummary: claim.title,
      verdict: params.verdict,
      authority: params.authority,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date().toISOString(),
      evidence: attachedEvidence,
      policyVersion: params.policyVersion,
      validUntil: validUntilDate,
      officialStatementEn: params.officialStatementEn,
      officialStatementMr: params.officialStatementMr,
      isCitizenFacing: true,
      publishedAt: new Date().toISOString(),
      provenanceHash,
    };

    this.officialAnswers.unshift(answer);
    this.persist();
    return answer;
  }

  /**
   * Supersedes an existing official answer (P1 Task 5 - Official Answer Versioning).
   * Preserves historical records without overwriting.
   */
  public static supersedeOfficialAnswer(params: {
    existingAnswerId: string;
    newVerdict: CivicClaimStatus;
    newEvidenceIds: string[];
    reviewedBy: string;
    newPolicyVersion?: string;
    newStatementEn: string;
    newStatementMr: string;
    reason: string;
  }): OfficialAnswer {
    if (this.officialAnswers.length === 0) this.init();

    const oldAnswer = this.officialAnswers.find((a) => a.id === params.existingAnswerId);
    if (!oldAnswer) throw new Error(`Existing answer not found: ${params.existingAnswerId}`);

    const newVersion = oldAnswer.version + 1;
    const newAnswerId = `ANS-${oldAnswer.claimId}-V${newVersion}`;
    const attachedEvidence = this.evidenceRepo.filter((e) => params.newEvidenceIds.includes(e.id));
    const now = new Date().toISOString();

    const newProvenance = `${newAnswerId}|${params.newVerdict}|${oldAnswer.authority}|${params.newPolicyVersion || oldAnswer.policyVersion}|${params.reviewedBy}`;
    const provenanceHash = computeSHA256Sync(newProvenance);

    // 1. Mark existing answer as superseded
    oldAnswer.supersededAt = now;
    oldAnswer.supersededByAnswerId = newAnswerId;

    // 2. Create versioned replacement
    const newAnswer: OfficialAnswer = {
      id: newAnswerId,
      version: newVersion,
      claimId: oldAnswer.claimId,
      claimSummary: oldAnswer.claimSummary,
      verdict: params.newVerdict,
      authority: oldAnswer.authority,
      reviewedBy: params.reviewedBy,
      reviewedAt: now,
      evidence: attachedEvidence,
      policyVersion: params.newPolicyVersion || oldAnswer.policyVersion,
      validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      supersedesId: oldAnswer.id,
      officialStatementEn: params.newStatementEn,
      officialStatementMr: params.newStatementMr,
      isCitizenFacing: true,
      publishedAt: now,
      provenanceHash,
    };

    // 3. Update parent claim status
    const claim = this.claims.find((c) => c.id === oldAnswer.claimId);
    if (claim) {
      claim.status = params.newVerdict;
      claim.reviewedBy = params.reviewedBy;
      claim.reviewedAt = now;
      claim.reviewNotes = `Version ${newVersion} supersedes ${oldAnswer.id}: ${params.reason}`;
      claim.evidenceIds = params.newEvidenceIds;
      claim.updatedAt = now;
    }

    this.officialAnswers.unshift(newAnswer);
    this.persist();
    return newAnswer;
  }
}
