export type UserRole =
  | 'admin'
  | 'athlete'
  | 'referee'
  | 'volunteer'
  | 'security'
  | 'medical'
  | 'audience'
  | 'doping';

export type UserStatus = 'active' | 'inactive' | 'pending';

export type AthleteStatus = 'pending' | 'approved' | 'rejected';

export type Gender = 'male' | 'female' | 'mixed';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export type ScheduleStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export type MedalType = 'gold' | 'silver' | 'bronze';

export type RecordType = 'world' | 'olympic' | 'national';

export type ResultStatus = 'pending' | 'confirmed' | 'locked';

export type DopingTestType = 'random' | 'targeted';

export type DopingSampleType = 'blood' | 'urine';

export type DopingResult = 'pending' | 'negative' | 'positive' | 'abnormal';

export type SecurityStatus = 'idle' | 'patrolling' | 'emergency';

export type TicketStatus = 'paid' | 'refunded' | 'cancelled';

export type SeatStatus = 'available' | 'sold' | 'reserved';

export type PriceTier = 'VIP' | 'A' | 'B' | 'C';

export type PatientType = 'athlete' | 'audience' | 'staff' | 'volunteer';

export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';

export type MedicalStatus = 'reported' | 'dispatched' | 'processing' | 'completed';

export type NotificationType =
  | 'registration'
  | 'schedule'
  | 'result'
  | 'doping'
  | 'ticket'
  | 'medical'
  | 'system';

export type ConflictType = 'time' | 'venue' | 'athlete' | 'age';

export type ConflictSeverity = 'error' | 'warning';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  status: UserStatus;
}

export interface HistoricalRecord {
  id: string;
  eventId: string;
  eventName: string;
  result: string;
  date: string;
  competition: string;
  isRecord: boolean;
}

export interface Athlete extends Omit<User, 'status'> {
  athleteId: string;
  birthDate: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  countryCode: string;
  events: string[];
  historicalRecords: HistoricalRecord[];
  status: AthleteStatus;
}

export interface Event {
  id: string;
  name: string;
  category: string;
  gender: Gender;
  ageMin: number;
  ageMax: number;
  venueId: string;
  status: EventStatus;
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: { lat: number; lng: number };
  availableTimeSlots: TimeSlot[];
}

export interface Schedule {
  id: string;
  eventId: string;
  eventName: string;
  venueId: string;
  venueName: string;
  startTime: string;
  endTime: string;
  date: string;
  round: string;
  athletes: string[];
  status: ScheduleStatus;
  transitionTime: number;
}

export interface Result {
  id: string;
  scheduleId: string;
  athleteId: string;
  athleteName: string;
  country: string;
  result: string;
  rank: number;
  medal?: MedalType;
  isRecord: boolean;
  recordType?: RecordType;
  refereeId: string;
  createdAt: string;
  status: ResultStatus;
}

export interface MedalStanding {
  country: string;
  countryCode: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  rank: number;
}

export interface DopingTest {
  id: string;
  athleteId: string;
  athleteName: string;
  scheduleId: string;
  testType: DopingTestType;
  sampleType: DopingSampleType;
  sampleCollectedAt: string;
  result: DopingResult;
  testedAt?: string;
  isLocked: boolean;
  notes?: string;
}

export interface CheckIn {
  id: string;
  volunteerId: string;
  stationId: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number;
  rating?: number;
}

export interface Volunteer extends User {
  skills: string[];
  availableSlots: TimeSlot[];
  assignedStation?: string;
  totalServiceHours: number;
  checkIns: CheckIn[];
}

export interface SecurityPersonnel extends Omit<User, 'status'> {
  currentPatrolRoute?: string;
  currentLocation?: { lat: number; lng: number };
  status: SecurityStatus;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  value: number;
}

export interface CrowdData {
  venueId: string;
  timestamp: string;
  density: number;
  heatmapData: HeatmapPoint[];
}

export interface Seat {
  id: string;
  venueId: string;
  section: string;
  row: string;
  number: string;
  status: SeatStatus;
  priceTier: PriceTier;
  dynamicPrice: number;
}

export interface TicketOrder {
  id: string;
  audienceId: string;
  scheduleId: string;
  seatId: string;
  seatInfo: string;
  price: number;
  originalPrice: number;
  purchaseTime: string;
  status: TicketStatus;
  qrCode?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientType: PatientType;
  patientName: string;
  age: number;
  gender: 'male' | 'female';
  location: { lat: number; lng: number; description: string };
  injuryType: string;
  severity: Severity;
  symptoms: string;
  assignedMedicalId?: string;
  responseTime?: number;
  treatment: string;
  medications: string[];
  status: MedicalStatus;
  createdAt: string;
  completedAt?: string;
}

export interface MedicalStaff {
  id: string;
  name: string;
  specialty: string;
  department: string;
  status: 'on-duty' | 'off-duty';
  avatar: string;
  licenseNo: string;
  currentLocation?: { lat: number; lng: number };
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  certificateUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conflict {
  type: ConflictType;
  description: string;
  affectedEntities: string[];
  severity: ConflictSeverity;
}

export interface AssignResult {
  volunteerId: string;
  stationId: string;
  matchScore: number;
  reason: string;
}

export interface PatrolRoute {
  id: string;
  personnelId: string;
  venueId: string;
  waypoints: { lat: number; lng: number }[];
  estimatedDuration: number;
  generatedAt: string;
}
