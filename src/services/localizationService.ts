export type Language = 'en' | 'mr';

export interface Translations {
  councilName: string;
  subTitle: string;
  tagline: string;
  overview: string;
  priorityEngine: string;
  issuesQueue: string;
  gisMap: string;
  resourcesFleet: string;
  citizens: string;
  analytics: string;
  settings: string;
  reportIssue: string;
  trackTicket: string;
  notifications: string;
  criticalIssues: string;
  resourcesDeployed: string;
  shiftAllocation: string;
  budgetUtilization: string;
  slaBreachRisk: string;
  aiSuggested: string;
  officerOverride: string;
  explainPriority: string;
  approvePlan: string;
  printWorkOrder: string;
  broadcastAlert: string;
  wastewaterReuse: string;
  municipalWaste: string;
  wastewaterIntake: string;
  treatmentPlant: string;
  qualityCheck: string;
  reusePlan: string;
  agriculture: string;
  gradeA: string;
  gradeB: string;
  gradeC: string;
  failedRetreat: string;
  bookWaterQuota: string;
  printCertificate: string;
  flowDestination: string;
  edibleAgriDest: string;
  commercialAgriDest: string;
  bigTreesDest: string;
  industrialDest: string;
  rechargeDest: string;
  retreatmentDest: string;
  sluiceGateRouting: string;
  floodPriority: string;
  damDischarge: string;
  evacuationSequence: string;
  rescueFleet: string;
  dewateringPumps: string;
  rescueBoats: string;
  sandbagTrucks: string;
  evacuationBuses: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  en: {
    councilName: 'Kopargaon Municipal Council',
    subTitle: 'Decision Support System',
    tagline: 'Kopargaon Civic Priority Engine',
    overview: 'Overview',
    priorityEngine: 'Decision Workbench',
    issuesQueue: 'Issues Queue',
    gisMap: 'Civic Map',
    resourcesFleet: 'Resources & Fleet',
    citizens: 'Citizen Portal',
    analytics: 'Analytics & SLA',
    settings: 'Settings & Audit',
    reportIssue: 'Report Grievance',
    trackTicket: 'Track Issue Status',
    notifications: 'Notifications',
    criticalIssues: 'Critical Priority (P0)',
    resourcesDeployed: 'Resources Deployed',
    shiftAllocation: 'Shift 1 Planning',
    budgetUtilization: 'Budget Utilization',
    slaBreachRisk: 'SLA Breach Risk',
    aiSuggested: 'AI Recommendation',
    officerOverride: 'Manual Override',
    explainPriority: 'Why this priority?',
    approvePlan: 'Approve & Commit Plan',
    printWorkOrder: 'Official Work Order',
    broadcastAlert: 'Ward Broadcast Alert',
    wastewaterReuse: 'Circular Water & Agri Reuse',
    municipalWaste: 'Municipal Waste Stream',
    wastewaterIntake: 'Wastewater Intake & Monitoring',
    treatmentPlant: 'STP Treatment Plant',
    qualityCheck: 'Water Quality & CPCB Check',
    reusePlan: 'Agricultural Reuse Plan',
    agriculture: 'Agriculture & Farmer Delivery',
    gradeA: 'Grade A (Unrestricted Edible Crops)',
    gradeB: 'Grade B (Sugarcane & Commercial Crops)',
    gradeC: 'Grade C (Agroforestry & Greenbelts)',
    failedRetreat: 'Failed - Re-treatment Required',
    bookWaterQuota: 'Book Farmer Water Quota',
    printCertificate: 'Official Lab Quality Certificate',
    flowDestination: 'Water Flow Destination Decision',
    edibleAgriDest: 'High-Value Food & Edible Crops',
    commercialAgriDest: 'Sugarcane & Commercial Cash Crops',
    bigTreesDest: 'Big Trees & Municipal Agroforestry',
    industrialDest: 'PWD Construction & Dust Control',
    rechargeDest: 'Groundwater Aquifer Recharge',
    retreatmentDest: 'Re-treatment & Polishing Loop',
    sluiceGateRouting: 'Sluice Gate & Flow Allocation',
    floodPriority: 'Flood Alert & Emergency Resource Dispatch',
    damDischarge: 'Dam Discharge & River Surge Telemetry',
    evacuationSequence: 'Zone Dispatch Priority Sequence',
    rescueFleet: 'Emergency Disaster Response Fleet',
    dewateringPumps: 'De-watering Heavy Pumps',
    rescueBoats: 'Motorized Rescue Boats',
    sandbagTrucks: 'Sandbag Bunding Trucks',
    evacuationBuses: 'Emergency Evacuation Buses',
  },
  mr: {
    councilName: 'कोपरगाव नगरपरिषद',
    subTitle: 'निर्णय समर्थन प्रणाली',
    tagline: 'कोपरगाव नागरी प्राधान्य इंजिन',
    overview: 'मुख्य डॅशबोर्ड',
    priorityEngine: 'प्राधान्य व वाटप इंजिन',
    issuesQueue: 'तक्रार निवारण यादी',
    gisMap: 'नकाशा व प्रभाग',
    resourcesFleet: 'यंत्रसामग्री व कर्मचारी',
    citizens: 'नागरिक सेवा केंद्र',
    analytics: 'आकडेवारी व अहवाल',
    settings: 'प्रणाली सेटिंग्ज',
    reportIssue: 'तक्रार नोंदवा',
    trackTicket: 'तक्रार स्थिती तपासा',
    notifications: 'सूचना फलक',
    criticalIssues: 'अति-तातडीच्या समस्या (P0)',
    resourcesDeployed: 'कार्यरत साधनसामग्री',
    shiftAllocation: 'शिफ्ट १ नियोजन',
    budgetUtilization: 'निधी वापर',
    slaBreachRisk: 'मुदत समाप्ती धोका',
    aiSuggested: 'AI शिफारस',
    officerOverride: 'अधिकारी बदल (Override)',
    explainPriority: 'हे प्राधान्य का?',
    approvePlan: 'कृती आराखडा मंजूर करा',
    printWorkOrder: 'अधिकृत कार्य आदेश',
    broadcastAlert: 'प्रभाग नागरिक सूचना',
    wastewaterReuse: 'सांडपाणी ते कृषी पुनर्वापर',
    municipalWaste: 'नगरपालिका सांडपाणी संकलन',
    wastewaterIntake: 'सांडपाणी आवक व तपासणी',
    treatmentPlant: 'मलनिःसारण प्रक्रिया केंद्र',
    qualityCheck: 'जल गुणवत्ता व CPCB तपासणी',
    reusePlan: 'कृषी जल पुनर्वापर आराखडा',
    agriculture: 'शेतकरी वाटप व सिंचन वितरण',
    gradeA: 'वर्ग अ (खाद्य पिके व भाजीपाला)',
    gradeB: 'वर्ग ब (ऊस व व्यावसायिक पिके)',
    gradeC: 'वर्ग क (वृक्षलागवड व जैवइंधन)',
    failedRetreat: 'अपात्र - पुनर्प्रक्रिया आवश्यक',
    bookWaterQuota: 'शेतकरी जल कोटा नोंदणी',
    printCertificate: 'अधिकृत प्रयोगशाळा प्रमाणपत्र',
    flowDestination: 'जल प्रवाह व वापर उद्दिष्ट निर्णय',
    edibleAgriDest: 'भाजीपाला, कांदा व फळबागा',
    commercialAgriDest: 'ऊस, कापूस व नगदी शेती',
    bigTreesDest: 'मोठी झाडे, वनीकरण व हरित पट्टे',
    industrialDest: 'बांधकाम व धूळ नियंत्रण',
    rechargeDest: 'भूजल पुनर्भरण',
    retreatmentDest: 'पुनर्प्रक्रिया व शुद्धीकरण लूप',
    sluiceGateRouting: 'कालवा गेट व व्हॉल्व प्रवाह वाटप',
    floodPriority: 'पूर इशारा व आपत्कालीन साधन वाटप',
    damDischarge: 'धरण विसर्ग व नदी पातळी',
    evacuationSequence: 'प्रभाग स्थलांतर व साधन प्राधान्यक्रम',
    rescueFleet: 'आपत्कालीन बचाव ताफा',
    dewateringPumps: 'पाणी उपसा डीझेल पंप',
    rescueBoats: 'इन्फ्लेटेबल बचाव नौका',
    sandbagTrucks: 'वाळू पोती संरक्षण ट्रक',
    evacuationBuses: 'नागरिक स्थलांतर बसेस',
  },
};
