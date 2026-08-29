import { CivicIssue, IssueStatus, NotificationItem } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SmsMessage {
  id: string;
  recipientPhone: string;
  ticketNumber: string;
  issueTitle: string;
  stage: IssueStatus;
  smsBody: string;
  senderId: string; // e.g. 'KMC-GOV'
  sentAt: string;
  deliveryStatus: 'delivered' | 'sent' | 'pending';
  realNetworkResponse?: string;
}

export class SMSAlertService {
  private static STORAGE_KEY = 'civicpulse_citizen_sms_inbox';

  /**
   * Generates official bilingual SMS text tailored to each lifecycle milestone
   */
  public static formatSmsText(
    stage: IssueStatus,
    issue: {
      ticketNumber: string;
      title: string;
      locationAddress: string;
      priorityScore?: number;
      requiredEquipment?: string;
      requiredStaffCount?: number;
      slaHours?: number;
    },
    language: 'en' | 'mr' = 'en'
  ): string {
    const ticket = issue.ticketNumber;
    const title = issue.title.slice(0, 35);
    const loc = issue.locationAddress.slice(0, 30);
    const score = issue.priorityScore ? Math.round(issue.priorityScore) : 75;

    if (language === 'mr') {
      switch (stage) {
        case 'submitted':
          return `[कोपरगाव नगरपरिषद] तक्रार नोंदणी यशस्वी! क्र. ${ticket} (${title}) स्वीकारली आहे. AI प्राधान्यता गुण: ${score}/100. निवारण प्रक्रियेत आहे.`;
        case 'prioritized':
          return `[कोपरगाव नगरपरिषद] अपडेट: तक्रार क्र. ${ticket} चे प्राधान्य मूल्यमापन पूर्ण झाले आहे (गुण: ${score}/100). संबंधित विभागाकडे वर्ग केले आहे.`;
        case 'scheduled':
          return `[कोपरगाव नगरपरिषद] कृती आदेश: तक्रार क्र. ${ticket} साठी साधनसामग्री (${issue.requiredEquipment?.replace('_', ' ') || 'यंत्रसामग्री'}) व ${issue.requiredStaffCount || 2} कर्मचारी पथक रवाना करण्यात आले आहे.`;
        case 'in_progress':
          return `[कोपरगाव नगरपरिषद] प्रत्यक्ष काम सुरू: ${loc} येथे तक्रार क्र. ${ticket} चे प्रत्यक्ष दुरुस्ती काम चालू आहे.`;
        case 'resolved':
          return `[कोपरगाव नगरपरिषद] तक्रार निवारण पूर्ण: क्र. ${ticket} चे काम यशस्वीरित्या पूर्ण झाले असून कनिष्ठ अभियंत्यांकडून तपासणी पूर्ण झाली आहे. धन्यवाद!`;
        case 'rejected':
          return `[कोपरगाव नगरपरिषद] माहिती: तक्रार क्र. ${ticket} चे पुनरावलोकन झाले असून पुढील तपशीलासाठी नगरपरिषद कार्यालयाशी संपर्क साधावा.`;
        default:
          return `[कोपरगाव नगरपरिषद] तक्रार क्र. ${ticket} ची स्थिती अद्यतनित झाली आहे.`;
      }
    }

    // English Default
    switch (stage) {
      case 'submitted':
        return `[KMC GOV ALERT] Grievance #${ticket} for "${title}" registered successfully! Verified by AI (Priority Score: ${score}/100). Track at municipal portal.`;
      case 'prioritized':
        return `[KMC UPDATE] Issue #${ticket} prioritized by Municipal Decision Engine (Score: ${score}/100). SLA target assigned.`;
      case 'scheduled':
        return `[KMC DISPATCH] Action Scheduled! Machinery (${issue.requiredEquipment?.replace('_', ' ') || 'Equipment'}) & Crew (${issue.requiredStaffCount || 2} staff) assigned for #${ticket}. Target resolution underway.`;
      case 'in_progress':
        return `[KMC ON-SITE] Municipal repair crew has arrived at ${loc}. Repair work for #${ticket} is actively in progress.`;
      case 'resolved':
        return `[KMC RESOLVED] Your grievance #${ticket} at ${loc} has been resolved & verified by Municipal Engineer. Thank you for helping Kopargaon!`;
      case 'rejected':
        return `[KMC NOTICE] Grievance #${ticket} status updated. Contact KMC office for further details.`;
      default:
        return `[KMC ALERT] Grievance #${ticket} status updated to ${stage.toUpperCase()}.`;
    }
  }

  /**
   * Dispatches and stores an SMS alert to citizen's mobile device via Fast2SMS Real Network
   */
  public static async sendLifecycleSms(
    issue: CivicIssue,
    stage: IssueStatus,
    phoneOverride?: string,
    language: 'en' | 'mr' = 'en'
  ): Promise<{ sms: SmsMessage; notification: NotificationItem }> {
    const targetPhone = phoneOverride || issue.citizenPhone || '';
    const smsBody = this.formatSmsText(
      stage,
      {
        ticketNumber: issue.ticketNumber,
        title: issue.title,
        locationAddress: issue.locationAddress,
        priorityScore: issue.priorityScore?.finalScore,
        requiredEquipment: issue.requiredEquipment,
        requiredStaffCount: issue.requiredStaffCount,
      },
      language
    );

    let networkStatusDesc = 'Simulated Delivery';

    // -------------------------------------------------------------
    // REAL-TIME CELLULAR SMS DISPATCH VIA FAST2SMS
    // -------------------------------------------------------------
    const fast2smsKey = (import.meta as any).env?.VITE_FAST2SMS_API_KEY || 'PwLBD8jznGN4MpRHo7IrEVvyxsKQdfJFq6gtcXA0YUlbSmke1hUJf43uM8stOhFG2xqKYjCLAgvpmRHw';
    const cleanDigits = targetPhone.replace(/\D/g, '').slice(-10);

    if (fast2smsKey && cleanDigits.length === 10) {
      try {
        const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const endpoint = isDev ? '/api/fast2sms' : 'https://www.fast2sms.com/dev/bulkV2';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'authorization': fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: smsBody,
            language: 'english',
            flash: 0,
            numbers: cleanDigits,
          }),
        });

        const data = await response.json();
        if (data.return) {
          networkStatusDesc = `Fast2SMS Real Dispatch OK (${data.message?.[0] || 'Delivered'})`;
          console.log('✅ Fast2SMS Real-Time Cellular SMS Dispatched successfully:', data);
        } else {
          networkStatusDesc = `Fast2SMS Gateway: ${data.message || 'Queued'}`;
          console.warn('⚠️ Fast2SMS Response:', data);
        }
      } catch (networkErr) {
        console.warn('Fast2SMS network note (CORS or offline fallback):', networkErr);
        networkStatusDesc = 'Fast2SMS Client Queued';
      }
    }

    const smsMessage: SmsMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      recipientPhone: targetPhone,
      ticketNumber: issue.ticketNumber,
      issueTitle: issue.title,
      stage,
      smsBody,
      senderId: 'KMC-GOV',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'delivered',
      realNetworkResponse: networkStatusDesc,
    };

    // Save to citizen simulated SMS inbox
    this.saveToSmsInbox(smsMessage);

    // Create Notification Item
    const notification: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: issue.citizenId || 'citizen-public',
      issueId: issue.id,
      ticketNumber: issue.ticketNumber,
      title: `SMS Alert (${issue.ticketNumber}): ${stage.replace('_', ' ').toUpperCase()}`,
      message: `${smsBody} [${networkStatusDesc}]`,
      channel: 'sms',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Sync to Supabase if live
    if (isSupabaseConfigured) {
      try {
        await supabase.from('notifications').insert([{
          recipient_id: issue.citizenId || null,
          issue_id: issue.id,
          title: notification.title,
          message: notification.message,
          channel: 'sms',
          is_read: false,
        }]);
      } catch {
        // Safe catch
      }
    }

    return { sms: smsMessage, notification };
  }

  /**
   * Retrieves all SMS messages for a given phone or all messages
   */
  public static getSmsInbox(phoneFilter?: string): SmsMessage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const list: SmsMessage[] = stored ? JSON.parse(stored) : [];
      if (!phoneFilter) return list;
      return list.filter((m) => m.recipientPhone.replace(/\D/g, '') === phoneFilter.replace(/\D/g, ''));
    } catch {
      return [];
    }
  }

  /**
   * Saves an SMS message into the citizen device storage
   */
  private static saveToSmsInbox(msg: SmsMessage) {
    try {
      const existing = this.getSmsInbox();
      const updated = [msg, ...existing].slice(0, 50); // keep recent 50
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  /**
   * Clears SMS inbox
   */
  public static clearSmsInbox() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
