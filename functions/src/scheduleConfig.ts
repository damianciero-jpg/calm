// Firestore schema this reads from — document per child:
// scheduleConfig/{childId}
// {
//   childId: string,
//   ageProfile: 'kids' | 'teens',
//   timezone: string,          // IANA tz, e.g. "America/New_York"
//   triggers: {
//     wake?:     { hour: number, minute: number, enabled: boolean },
//     homework?: { hour: number, minute: number, enabled: boolean },
//     checkin?:  { hour: number, minute: number, enabled: boolean },
//     winddown?: { hour: number, minute: number, enabled: boolean },
//   },
//   fcmToken: string,          // caregiver/child device token
// }

export interface TriggerConfig {
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface ScheduleConfig {
  childId: string;
  ageProfile: 'kids' | 'teens';
  timezone: string;
  triggers: Partial<Record<'wake' | 'homework' | 'checkin' | 'winddown', TriggerConfig>>;
  fcmToken: string;
}
