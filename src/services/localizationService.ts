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
  },
};
