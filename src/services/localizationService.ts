export type Language = 'en' | 'mr';

export interface Translations {
  councilName: string;
  subTitle: string;
  tagline: string;
  dashboard: string;
  civicIssues: string;
  priorityEngine: string;
  resources: string;
  civicMap: string;
  citizens: string;
  notifications: string;
  analytics: string;
  settings: string;
  reportIssue: string;
  trackTicket: string;
  criticalP0: string;
  highP1: string;
  mediumP2: string;
  lowP3: string;
  submitted: string;
  triaged: string;
  prioritized: string;
  scheduled: string;
  inProgress: string;
  resolved: string;
  deferred: string;
  citizen: string;
  officer: string;
  admin: string;
  scoreBreakdown: string;
  officerOverride: string;
  runAllocation: string;
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
}

export const DICTIONARY: Record<Language, Translations> = {
  en: {
    councilName: 'KOPARGAON MUNICIPAL COUNCIL',
    subTitle: 'District Ahilyanagar, Maharashtra • PIN 423601',
    tagline: 'Municipal Decision Support & Resource Allocation Platform',
    dashboard: 'Dashboard',
    civicIssues: 'Civic Issues',
    priorityEngine: 'Priority Engine & Plan',
    resources: 'Resources & Fleet',
    civicMap: 'Civic Map (GIS)',
    citizens: 'Citizen Portal',
    notifications: 'Notifications',
    analytics: 'Analytics & SLA',
    settings: 'Settings & Audit Logs',
    reportIssue: 'Report New Civic Issue',
    trackTicket: 'Track Ticket Status',
    criticalP0: 'Critical Emergency (P0)',
    highP1: 'High Priority (P1)',
    mediumP2: 'Medium Priority (P2)',
    lowP3: 'Standard Priority (P3)',
    submitted: 'Submitted',
    triaged: 'AI Triaged',
    prioritized: 'Prioritized',
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    deferred: 'Deferred',
    citizen: 'Citizen',
    officer: 'Officer',
    admin: 'Admin',
    scoreBreakdown: 'Score Breakdown',
    officerOverride: 'Officer Override',
    runAllocation: 'Run Allocation Engine',
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
  },
  mr: {
    councilName: 'कोपरगाव नगरपरिषद',
    subTitle: 'जिल्हा अहिल्यानगर, महाराष्ट्र • पिन ४२३६०१',
    tagline: 'नागरी समस्या प्राधान्यक्रम व साधनसामग्री वाटप प्रणाली',
    dashboard: 'मुख्य डॅशबोर्ड',
    civicIssues: 'नागरी तक्रारी',
    priorityEngine: 'प्राधान्य व वाटप इंजिन',
    resources: 'साधनसामग्री व वाहने',
    civicMap: 'नागरी नकाशा (GIS)',
    citizens: 'नागरिक सेवा केंद्र',
    notifications: 'सूचना व संदेश',
    analytics: 'अहवाल व विश्लेषण',
    settings: 'नियम व ऑडिट नोंदवही',
    reportIssue: 'नवीन तक्रार नोंदवा',
    trackTicket: 'तक्रार स्थिती तपासा',
    criticalP0: 'तातडीचे संकट (P0)',
    highP1: 'उच्च प्राधान्य (P1)',
    mediumP2: 'मध्यम प्राधान्य (P2)',
    lowP3: 'सामान्य प्राधान्य (P3)',
    submitted: 'नोंदणीकृत',
    triaged: 'माहिती पडताळणी',
    prioritized: 'प्राधान्य निश्चित',
    scheduled: 'कार्यारंभ नियोजित',
    inProgress: 'काम प्रगतीपथावर',
    resolved: 'तक्रार निवारण पूर्ण',
    deferred: 'साधनसामग्री अभावी प्रलंबित',
    citizen: 'नागरिक',
    officer: 'अधिकारी',
    admin: 'प्रशासक',
    scoreBreakdown: 'गुणांकन तपशील',
    officerOverride: 'अधिकारी फेरबदल',
    runAllocation: 'वाटप इंजिन चालवा',
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
  },
};


