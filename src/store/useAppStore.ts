import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateDistance } from '../utils';
import type {
  User,
  UserRole,
  Athlete,
  Event,
  Venue,
  Schedule,
  Result,
  MedalStanding,
  Volunteer,
  SecurityPersonnel,
  Notification,
  TicketOrder,
  DopingTest,
  MedicalRecord,
  MedicalStaff,
  Conflict,
  NotificationType,
  ResultStatus,
  MedicalStatus,
  TicketStatus,
  CheckIn,
  TimeSlot,
  AssignResult,
  PatrolRoute,
  HeatmapPoint,
} from '../types';
import {
  athletes as mockAthletes,
  events as mockEvents,
  venues as mockVenues,
  schedules as mockSchedules,
  results as mockResults,
  medalStandings as mockMedalStandings,
  volunteers as mockVolunteers,
  securityPersons as mockSecurityPersons,
  medicalStaffs as mockMedicalStaffs,
  notifications as mockNotifications,
  ticketOrders as mockTicketOrders,
  dopingTests as mockDopingTests,
  medicalRecords as mockMedicalRecords,
} from '../data/mockData';

interface AppState {
  currentUser: User | null;
  users: User[];
  athletes: Athlete[];
  events: Event[];
  venues: Venue[];
  schedules: Schedule[];
  results: Result[];
  medalStanding: MedalStanding[];
  volunteers: Volunteer[];
  securityPersonnel: SecurityPersonnel[];
  medicalStaff: MedicalStaff[];
  notifications: Notification[];
  ticketOrders: TicketOrder[];
  dopingTests: DopingTest[];
  medicalRecords: MedicalRecord[];
  patrolRoutes: PatrolRoute[];
  crowdHeatmapData: Record<string, HeatmapPoint[]>;
  crowdDensityData: Record<string, { density: number; count: number; timestamp: string }>;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  addAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt'>) => void;
  registerAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt'>) => Athlete;
  updateAthlete: (id: string, athlete: Partial<Athlete>) => void;
  deleteAthlete: (id: string) => void;
  addEvent: (event: Omit<Event, 'id'>) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addVenue: (venue: Omit<Venue, 'id'>) => void;
  updateVenue: (id: string, venue: Partial<Venue>) => void;
  deleteVenue: (id: string) => void;
  addSchedule: (schedule: Omit<Schedule, 'id'>) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  addResult: (result: Omit<Result, 'id' | 'createdAt'>) => void;
  updateResult: (id: string, result: Partial<Result>) => void;
  deleteResult: (id: string) => void;
  addVolunteer: (volunteer: Omit<Volunteer, 'id' | 'createdAt'>) => void;
  registerVolunteer: (volunteer: Omit<Volunteer, 'id' | 'createdAt'>) => Volunteer;
  updateVolunteer: (id: string, volunteer: Partial<Volunteer>) => void;
  deleteVolunteer: (id: string) => void;
  checkIn: (volunteerId: string, stationId: string) => CheckIn;
  checkOut: (checkInId: string, rating?: number) => CheckIn;
  getServiceHours: (volunteerId: string) => number;
  matchVolunteerToStation: (
    volunteer: Volunteer,
    stations: { id: string; name: string; requiredSkills: string[]; capacity: number }[]
  ) => AssignResult | null;
  autoAssignVolunteers: (
    volunteerIds: string[],
    stations: { id: string; name: string; requiredSkills: string[]; capacity: number }[]
  ) => AssignResult[];
  addSecurityPersonnel: (personnel: Omit<SecurityPersonnel, 'id' | 'createdAt'>) => void;
  updateSecurityPersonnel: (id: string, personnel: Partial<SecurityPersonnel>) => void;
  deleteSecurityPersonnel: (id: string) => void;
  addMedicalStaff: (staff: Omit<MedicalStaff, 'id'>) => void;
  updateMedicalStaff: (id: string, staff: Partial<MedicalStaff>) => void;
  deleteMedicalStaff: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  updateNotification: (id: string, notification: Partial<Notification>) => void;
  deleteNotification: (id: string) => void;
  addTicketOrder: (order: Omit<TicketOrder, 'id' | 'purchaseTime'>) => void;
  updateTicketOrder: (id: string, order: Partial<TicketOrder>) => void;
  deleteTicketOrder: (id: string) => void;
  addDopingTest: (test: Omit<DopingTest, 'id'>) => void;
  updateDopingTest: (id: string, test: Partial<DopingTest>) => void;
  deleteDopingTest: (id: string) => void;
  addMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt'>) => void;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;
  pushNotification: (
    recipientId: string,
    type: NotificationType,
    title: string,
    content: string,
    relatedEntityId?: string,
    relatedEntityType?: string
  ) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  submitResult: (
    scheduleId: string,
    athleteId: string,
    result: string,
    rank: number,
    medal?: 'gold' | 'silver' | 'bronze',
    isRecord?: boolean,
    recordType?: 'world' | 'olympic' | 'national'
  ) => void;
  generateSchedule: (eventId: string, venueId: string, date: string, startTime: string, endTime: string, round: string) => Schedule;
  generateUniqueAthleteId: () => string;
  checkAgeAndEventConflict: (athleteId: string, eventId: string, selectedEventIds?: string[]) => Conflict[];
  dispatchMedicalStaff: (medicalRecordId: string, medicalStaffId: string) => void;
  reportInjury: (data: Omit<MedicalRecord, 'id' | 'createdAt' | 'status'>) => MedicalRecord;
  dispatchNearestMedical: (medicalRecordId: string) => { staff: MedicalStaff; distance: number; estimatedTime: number } | null;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => void;
  purchaseTicket: (audienceId: string, scheduleId: string, seatId: string, seatInfo: string, price: number, originalPrice: number) => TicketOrder;
  refundTicket: (orderId: string) => void;
  lockAthleteResult: (athleteId: string) => void;
  generatePatrolRoute: (venueId: string, personnelId: string) => PatrolRoute;
  adjustPatrolRoute: (routeId: string, waypoints: { lat: number; lng: number }[]) => void;
  updateLocation: (personnelId: string, location: { lat: number; lng: number }) => void;
  updateCrowdData: (venueId: string) => void;
  addPatrolRoute: (route: PatrolRoute) => void;
  updatePatrolRoute: (id: string, route: Partial<PatrolRoute>) => void;
  deletePatrolRoute: (id: string) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  approveAthlete: (athleteId: string) => void;
  rejectAthlete: (athleteId: string, reason: string) => void;
}

const transformAthlete = (mock: typeof mockAthletes[0]): Athlete => ({
  id: mock.id,
  athleteId: mock.id,
  username: mock.id,
  role: 'athlete',
  name: mock.name,
  email: `${mock.id}@example.com`,
  phone: '13800000000',
  avatar: mock.avatar,
  createdAt: new Date().toISOString(),
  birthDate: new Date(new Date().getFullYear() - mock.age, 0, 1).toISOString().split('T')[0],
  age: mock.age,
  gender: mock.gender,
  country: mock.country,
  countryCode: mock.countryCode,
  events: [],
  historicalRecords: [],
  status: 'approved',
});

const transformEvent = (mock: typeof mockEvents[0]): Event => ({
  id: mock.id,
  name: mock.name,
  category: mock.category,
  gender: mock.gender,
  ageMin: 14,
  ageMax: 40,
  venueId: mock.venueId,
  status: 'upcoming',
});

const transformVenue = (mock: typeof mockVenues[0]): Venue => ({
  id: mock.id,
  name: mock.name,
  type: mock.type,
  capacity: mock.capacity,
  location: { lat: 39.9, lng: 116.4 },
  availableTimeSlots: [],
});

const transformSchedule = (mock: typeof mockSchedules[0]): Schedule => ({
  id: mock.id,
  eventId: mock.eventId,
  eventName: mock.eventName,
  venueId: mock.venueId,
  venueName: mock.venueName,
  startTime: mock.startTime,
  endTime: mock.endTime,
  date: mock.date,
  round: '决赛',
  athletes: mock.participants,
  status: mock.status === 'completed' ? 'completed' : mock.status === 'ongoing' ? 'ongoing' : 'scheduled',
  transitionTime: 30,
});

const transformResult = (mock: typeof mockResults[0]): Result => ({
  id: mock.id,
  scheduleId: mock.eventId,
  athleteId: mock.athleteId,
  athleteName: mock.athleteName,
  country: mock.country,
  result: mock.score,
  rank: mock.rank,
  medal: mock.medal || undefined,
  isRecord: false,
  refereeId: 'REF001',
  createdAt: mock.date,
  status: 'confirmed',
});

const transformMedalStanding = (mock: typeof mockMedalStandings[0]): MedalStanding => ({
  country: mock.country,
  countryCode: mock.countryCode,
  gold: mock.gold,
  silver: mock.silver,
  bronze: mock.bronze,
  total: mock.total,
  rank: 0,
});

const transformVolunteer = (mock: typeof mockVolunteers[0]): Volunteer => ({
  id: mock.id,
  username: mock.id,
  role: 'volunteer',
  name: mock.name,
  email: `${mock.id}@example.com`,
  phone: '13800000000',
  avatar: mock.avatar,
  createdAt: new Date().toISOString(),
  status: mock.status,
  skills: [mock.role],
  availableSlots: [],
  assignedStation: mock.assignedVenue,
  totalServiceHours: 0,
  checkIns: [],
});

const transformSecurityPersonnel = (mock: typeof mockSecurityPersons[0]): SecurityPersonnel => ({
  id: mock.id,
  username: mock.id,
  role: 'security',
  name: mock.name,
  email: `${mock.id}@example.com`,
  phone: mock.contact,
  avatar: mock.avatar,
  createdAt: new Date().toISOString(),
  currentPatrolRoute: mock.assignedArea,
  currentLocation: { lat: 39.9, lng: 116.4 },
  status: mock.status === 'on-duty' ? 'patrolling' : 'idle',
});

const transformNotification = (mock: typeof mockNotifications[0]): Notification => ({
  id: mock.id,
  recipientId: mock.recipientId,
  type: mock.type,
  title: mock.title,
  content: mock.content,
  relatedEntityId: mock.relatedEntityId,
  relatedEntityType: mock.relatedEntityType,
  isRead: mock.isRead,
  createdAt: mock.createdAt,
});

const transformTicketOrder = (mock: typeof mockTicketOrders[0]): TicketOrder => ({
  id: mock.id,
  audienceId: 'AUD001',
  scheduleId: 'S001',
  seatId: mock.id,
  seatInfo: `${mock.seatType}座 ${mock.quantity}张`,
  price: mock.totalPrice / mock.quantity,
  originalPrice: mock.totalPrice / mock.quantity,
  purchaseTime: new Date().toISOString(),
  status: mock.status === 'confirmed' ? 'paid' : mock.status === 'pending' ? 'paid' : 'refunded',
  qrCode: mock.orderNo,
});

const transformDopingTest = (mock: typeof mockDopingTests[0]): DopingTest => ({
  id: mock.id,
  athleteId: mock.athleteId,
  athleteName: mock.athleteName,
  scheduleId: 'S001',
  testType: mock.testType === 'in-competition' ? 'targeted' : 'random',
  sampleType: 'urine',
  sampleCollectedAt: mock.testDate,
  result: mock.result,
  isLocked: mock.result !== 'pending',
  notes: mock.notes,
});

const transformMedicalRecord = (mock: typeof mockMedicalRecords[0]): MedicalRecord => ({
  id: mock.id,
  patientId: mock.patientType === 'athlete' ? 'A001' : 'AUD001',
  patientType: mock.patientType === 'spectator' ? 'audience' : mock.patientType,
  patientName: mock.patientName,
  age: 25,
  gender: 'male',
  location: { lat: 39.9, lng: 116.4, description: '场馆内' },
  injuryType: mock.diagnosis,
  severity: 'moderate',
  symptoms: mock.diagnosis,
  treatment: mock.treatment,
  medications: [],
  status: mock.status === 'treated' ? 'completed' : mock.status === 'ongoing' ? 'processing' : 'dispatched',
  createdAt: mock.date,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [
        { id: 'ADMIN001', username: 'admin', role: 'admin', name: '系统管理员', email: 'admin@example.com', phone: '13800000001', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20administrator%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'ATH001', username: 'athlete', role: 'athlete', name: '张三', email: 'athlete@example.com', phone: '13800000002', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20athlete%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'REF001', username: 'referee', role: 'referee', name: '李裁判', email: 'referee@example.com', phone: '13800000003', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20referee%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'VOL001', username: 'volunteer', role: 'volunteer', name: '王志愿者', email: 'volunteer@example.com', phone: '13800000004', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20volunteer%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'SEC001', username: 'security', role: 'security', name: '赵安保', email: 'security@example.com', phone: '13800000005', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=security%20officer%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'MED001', username: 'medical', role: 'medical', name: '钱医生', email: 'medical@example.com', phone: '13800000006', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=doctor%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'AUD001', username: 'audience', role: 'audience', name: '孙观众', email: 'audience@example.com', phone: '13800000007', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=audience%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
        { id: 'DOP001', username: 'doping', role: 'doping', name: '周反兴奋剂专员', email: 'doping@example.com', phone: '13800000008', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20officer%20portrait&image_size=square', createdAt: new Date().toISOString(), status: 'active' },
      ],
      athletes: mockAthletes.map(transformAthlete),
      events: mockEvents.map(transformEvent),
      venues: mockVenues.map(transformVenue),
      schedules: mockSchedules.map(transformSchedule),
      results: mockResults.map(transformResult),
      medalStanding: mockMedalStandings.map(transformMedalStanding).sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze).map((m, i) => ({ ...m, rank: i + 1 })),
      volunteers: mockVolunteers.map(transformVolunteer),
      securityPersonnel: mockSecurityPersons.map(transformSecurityPersonnel),
      medicalStaff: mockMedicalStaffs.map((m) => ({ ...m })),
      notifications: mockNotifications.map(transformNotification),
      ticketOrders: mockTicketOrders.map(transformTicketOrder),
      dopingTests: mockDopingTests.map(transformDopingTest),
      medicalRecords: mockMedicalRecords.map(transformMedicalRecord),
      patrolRoutes: [],
      crowdHeatmapData: {},
      crowdDensityData: {},

      login: (username: string, password: string) => {
        if (password !== '123456') {
          return null;
        }
        const user = get().users.find(u => u.username === username && u.status === 'active');
        if (!user) {
          const roleUser = get().users.find(u => u.role === username as UserRole && u.status === 'active');
          if (roleUser) {
            set({ currentUser: roleUser });
            return roleUser;
          }
          return null;
        }
        set({ currentUser: user });
        return user;
      },

      logout: () => set({ currentUser: null }),

      addAthlete: (athlete) => {
        const newAthlete: Athlete = {
          ...athlete,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ athletes: [...state.athletes, newAthlete] }));
      },
      registerAthlete: (athlete) => {
        const newAthlete: Athlete = {
          ...athlete,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        
        const newUser: User = {
          id: newAthlete.id,
          username: athlete.username || newAthlete.athleteId,
          role: 'athlete',
          name: athlete.name,
          email: athlete.email,
          phone: athlete.phone,
          avatar: athlete.avatar,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        
        set((state) => ({ 
          athletes: [...state.athletes, newAthlete],
          users: [...state.users, newUser]
        }));
        
        get().pushNotification(
          'all',
          'registration',
          '新运动员注册申请',
          `${athlete.name}提交了运动员注册申请，请及时审核`,
          newAthlete.id,
          'athlete'
        );
        
        return newAthlete;
      },
      updateAthlete: (id, athlete) => {
        set((state) => ({
          athletes: state.athletes.map((a) => (a.id === id ? { ...a, ...athlete } : a)),
        }));
      },
      deleteAthlete: (id) => {
        set((state) => ({ athletes: state.athletes.filter((a) => a.id !== id) }));
      },

      addEvent: (event) => {
        const newEvent: Event = { ...event, id: uuidv4() };
        set((state) => ({ events: [...state.events, newEvent] }));
      },
      updateEvent: (id, event) => {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...event } : e)),
        }));
      },
      deleteEvent: (id) => {
        set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
      },

      addVenue: (venue) => {
        const newVenue: Venue = { ...venue, id: uuidv4() };
        set((state) => ({ venues: [...state.venues, newVenue] }));
      },
      updateVenue: (id, venue) => {
        set((state) => ({
          venues: state.venues.map((v) => (v.id === id ? { ...v, ...venue } : v)),
        }));
      },
      deleteVenue: (id) => {
        set((state) => ({ venues: state.venues.filter((v) => v.id !== id) }));
      },

      addSchedule: (schedule) => {
        const newSchedule: Schedule = { ...schedule, id: uuidv4() };
        set((state) => ({ schedules: [...state.schedules, newSchedule] }));
      },
      updateSchedule: (id, schedule) => {
        set((state) => ({
          schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...schedule } : s)),
        }));
      },
      deleteSchedule: (id) => {
        set((state) => ({ schedules: state.schedules.filter((s) => s.id !== id) }));
      },

      addResult: (result) => {
        const newResult: Result = {
          ...result,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ results: [...state.results, newResult] }));
      },
      updateResult: (id, result) => {
        set((state) => ({
          results: state.results.map((r) => (r.id === id ? { ...r, ...result } : r)),
        }));
      },
      deleteResult: (id) => {
        set((state) => ({ results: state.results.filter((r) => r.id !== id) }));
      },

      addVolunteer: (volunteer) => {
        const newVolunteer: Volunteer = {
          ...volunteer,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ volunteers: [...state.volunteers, newVolunteer] }));
      },
      registerVolunteer: (volunteer) => {
        const newVolunteer: Volunteer = {
          ...volunteer,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          status: 'pending',
          checkIns: [],
          totalServiceHours: 0,
        };
        set((state) => ({ volunteers: [...state.volunteers, newVolunteer] }));

        get().pushNotification(
          'all',
          'registration',
          '新志愿者注册申请',
          `${newVolunteer.name}提交了志愿者注册申请，请审核`,
          newVolunteer.id,
          'volunteer'
        );

        return newVolunteer;
      },
      updateVolunteer: (id, volunteer) => {
        set((state) => ({
          volunteers: state.volunteers.map((v) => (v.id === id ? { ...v, ...volunteer } : v)),
        }));
      },
      deleteVolunteer: (id) => {
        set((state) => ({ volunteers: state.volunteers.filter((v) => v.id !== id) }));
      },
      checkIn: (volunteerId, stationId) => {
        const newCheckIn: CheckIn = {
          id: uuidv4(),
          volunteerId,
          stationId,
          checkInTime: new Date().toISOString(),
        };

        set((state) => ({
          volunteers: state.volunteers.map((v) =>
            v.id === volunteerId
              ? { ...v, checkIns: [...v.checkIns, newCheckIn], assignedStation: stationId }
              : v
          ),
        }));

        return newCheckIn;
      },
      checkOut: (checkInId, rating) => {
        const checkOutTime = new Date().toISOString();
        let updatedCheckIn: CheckIn | null = null;

        set((state) => ({
          volunteers: state.volunteers.map((v) => ({
            ...v,
            checkIns: v.checkIns.map((c) => {
              if (c.id === checkInId) {
                const checkInDate = new Date(c.checkInTime);
                const checkOutDate = new Date(checkOutTime);
                const duration = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60) * 10) / 10;

                updatedCheckIn = {
                  ...c,
                  checkOutTime,
                  duration,
                  rating,
                };
                return updatedCheckIn;
              }
              return c;
            }),
            totalServiceHours: v.checkIns
              .map((c) => {
                if (c.id === checkInId) {
                  const checkInDate = new Date(c.checkInTime);
                  const checkOutDate = new Date(checkOutTime);
                  const duration = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60) * 10) / 10;
                  return c.duration || duration;
                }
                return c.duration || 0;
              })
              .reduce((sum, d) => sum + d, 0),
          })),
        }));

        if (updatedCheckIn) {
          const volunteer = get().volunteers.find((v) => v.id === updatedCheckIn!.volunteerId);
          get().pushNotification(
            updatedCheckIn.volunteerId,
            'system',
            '服务完成',
            `您今日的服务已完成，时长 ${updatedCheckIn.duration} 小时${rating ? `，评价 ${rating} 星` : ''}`,
            updatedCheckIn.id,
            'checkIn'
          );
        }

        return updatedCheckIn!;
      },
      getServiceHours: (volunteerId) => {
        const volunteer = get().volunteers.find((v) => v.id === volunteerId);
        if (!volunteer) return 0;
        return volunteer.checkIns.reduce((sum, c) => sum + (c.duration || 0), 0);
      },
      matchVolunteerToStation: (volunteer: Volunteer, stations: { id: string; name: string; requiredSkills: string[]; capacity: number }[]): AssignResult | null => {
        const availableStations = stations.filter((s) => {
          const assignedCount = get().volunteers.filter((v) => v.assignedStation === s.id).length;
          return assignedCount < s.capacity;
        });

        if (availableStations.length === 0) return null;

        let bestMatch: AssignResult | null = null;
        let highestScore = 0;

        for (const station of availableStations) {
          const matchedSkills = volunteer.skills.filter((s) => station.requiredSkills.includes(s));
          const skillScore = (matchedSkills.length / station.requiredSkills.length) * 70;
          const availabilityScore = volunteer.availableSlots.length > 0 ? 30 : 10;
          const totalScore = Math.round(skillScore + availabilityScore);

          if (totalScore > highestScore) {
            highestScore = totalScore;
            bestMatch = {
              volunteerId: volunteer.id,
              stationId: station.id,
              matchScore: totalScore,
              reason: `匹配技能：${matchedSkills.join('、') || '无'}`,
            };
          }
        }

        return bestMatch;
      },
      autoAssignVolunteers: (volunteerIds: string[], stations: { id: string; name: string; requiredSkills: string[]; capacity: number }[]): AssignResult[] => {
        const results: AssignResult[] = [];
        const volunteers = get().volunteers.filter((v) => volunteerIds.includes(v.id));

        for (const volunteer of volunteers) {
          const match = get().matchVolunteerToStation(volunteer, stations);
          if (match) {
            get().updateVolunteer(volunteer.id, { assignedStation: match.stationId });
            results.push(match);
          }
        }

        get().pushNotification(
          'all',
          'system',
          '志愿者分配完成',
          `已完成 ${results.length} 名志愿者的岗位分配`,
          '',
          'volunteer'
        );

        return results;
      },

      addSecurityPersonnel: (personnel) => {
        const newPersonnel: SecurityPersonnel = {
          ...personnel,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ securityPersonnel: [...state.securityPersonnel, newPersonnel] }));
      },
      updateSecurityPersonnel: (id, personnel) => {
        set((state) => ({
          securityPersonnel: state.securityPersonnel.map((s) => (s.id === id ? { ...s, ...personnel } : s)),
        }));
      },
      deleteSecurityPersonnel: (id) => {
        set((state) => ({ securityPersonnel: state.securityPersonnel.filter((s) => s.id !== id) }));
      },

      addMedicalStaff: (staff) => {
        const newStaff: MedicalStaff = { ...staff, id: uuidv4() };
        set((state) => ({ medicalStaff: [...state.medicalStaff, newStaff] }));
      },
      updateMedicalStaff: (id, staff) => {
        set((state) => ({
          medicalStaff: state.medicalStaff.map((m) => (m.id === id ? { ...m, ...staff } : m)),
        }));
      },
      deleteMedicalStaff: (id) => {
        set((state) => ({ medicalStaff: state.medicalStaff.filter((m) => m.id !== id) }));
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
      },
      updateNotification: (id, notification) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...notification } : n)),
        }));
      },
      deleteNotification: (id) => {
        set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
      },

      addTicketOrder: (order) => {
        const newOrder: TicketOrder = {
          ...order,
          id: uuidv4(),
          purchaseTime: new Date().toISOString(),
        };
        set((state) => ({ ticketOrders: [...state.ticketOrders, newOrder] }));
      },
      updateTicketOrder: (id, order) => {
        set((state) => ({
          ticketOrders: state.ticketOrders.map((t) => (t.id === id ? { ...t, ...order } : t)),
        }));
      },
      deleteTicketOrder: (id) => {
        set((state) => ({ ticketOrders: state.ticketOrders.filter((t) => t.id !== id) }));
      },

      addDopingTest: (test) => {
        const newTest: DopingTest = { ...test, id: uuidv4() };
        set((state) => ({ dopingTests: [...state.dopingTests, newTest] }));
      },
      updateDopingTest: (id, test) => {
        set((state) => ({
          dopingTests: state.dopingTests.map((d) => (d.id === id ? { ...d, ...test } : d)),
        }));
      },
      deleteDopingTest: (id) => {
        set((state) => ({ dopingTests: state.dopingTests.filter((d) => d.id !== id) }));
      },

      addMedicalRecord: (record) => {
        const newRecord: MedicalRecord = {
          ...record,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ medicalRecords: [...state.medicalRecords, newRecord] }));
      },
      updateMedicalRecord: (id, record) => {
        set((state) => ({
          medicalRecords: state.medicalRecords.map((m) => (m.id === id ? { ...m, ...record } : m)),
        }));
      },
      deleteMedicalRecord: (id) => {
        set((state) => ({ medicalRecords: state.medicalRecords.filter((m) => m.id !== id) }));
      },

      pushNotification: (recipientId, type, title, content, relatedEntityId, relatedEntityType) => {
        const newNotification: Notification = {
          id: uuidv4(),
          recipientId,
          type,
          title,
          content,
          relatedEntityId,
          relatedEntityType,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        }));
      },

      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        }));
      },

      submitResult: (scheduleId, athleteId, result, rank, medal, isRecord = false, recordType) => {
        const { schedules, athletes } = get();
        const schedule = schedules.find((s) => s.id === scheduleId);
        const athlete = athletes.find((a) => a.id === athleteId);

        if (!schedule || !athlete) return;

        const newResult: Result = {
          id: uuidv4(),
          scheduleId,
          athleteId,
          athleteName: athlete.name,
          country: athlete.country,
          result,
          rank,
          medal,
          isRecord,
          recordType,
          refereeId: get().currentUser?.id || 'REF001',
          createdAt: new Date().toISOString(),
          status: 'pending' as ResultStatus,
        };

        set((state) => ({ results: [...state.results, newResult] }));

        if (medal) {
          set((state) => {
            const newMedalStanding = [...state.medalStanding];
            const countryIndex = newMedalStanding.findIndex((m) => m.countryCode === athlete.countryCode);
            if (countryIndex >= 0) {
              newMedalStanding[countryIndex] = {
                ...newMedalStanding[countryIndex],
                [medal]: newMedalStanding[countryIndex][medal] + 1,
                total: newMedalStanding[countryIndex].total + 1,
              };
            }
            newMedalStanding.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
            return {
              medalStanding: newMedalStanding.map((m, i) => ({ ...m, rank: i + 1 })),
            };
          });
        }

        get().pushNotification(
          athleteId,
          'result',
          '比赛成绩已公布',
          `您在${schedule.eventName}中获得第${rank}名${medal ? `，${medal === 'gold' ? '金牌' : medal === 'silver' ? '银牌' : '铜牌'}` : ''}`,
          scheduleId,
          'schedule'
        );
      },

      generateSchedule: (eventId, venueId, date, startTime, endTime, round) => {
        const { events, venues } = get();
        const event = events.find((e) => e.id === eventId);
        const venue = venues.find((v) => v.id === venueId);

        const newSchedule: Schedule = {
          id: uuidv4(),
          eventId,
          eventName: event?.name || '',
          venueId,
          venueName: venue?.name || '',
          startTime,
          endTime,
          date,
          round,
          athletes: [],
          status: 'scheduled',
          transitionTime: 30,
        };

        set((state) => ({ schedules: [...state.schedules, newSchedule] }));

        get().pushNotification(
          'all',
          'schedule',
          '新赛程已生成',
          `${event?.name}将于${date} ${startTime}在${venue?.name}举行`,
          newSchedule.id,
          'schedule'
        );

        return newSchedule;
      },

      generateUniqueAthleteId: () => {
        const { athletes } = get();
        const maxId = athletes.reduce((max, a) => {
          const num = parseInt(a.athleteId.replace(/\D/g, ''), 10);
          return num > max ? num : max;
        }, 0);
        return `A${String(maxId + 1).padStart(3, '0')}`;
      },

      checkAgeAndEventConflict: (athleteId, eventId, selectedEventIds) => {
        const conflicts: Conflict[] = [];
        const { athletes, events, schedules } = get();
        const athlete = athletes.find((a) => a.id === athleteId);
        const event = events.find((e) => e.id === eventId);

        if (!athlete || !event) return conflicts;

        if (athlete.age < event.ageMin || athlete.age > event.ageMax) {
          conflicts.push({
            type: 'age',
            description: `运动员年龄${athlete.age}岁不符合项目年龄要求(${event.ageMin}-${event.ageMax}岁)`,
            affectedEntities: [athleteId, eventId],
            severity: 'error',
          });
        }

        if (event.gender !== 'mixed' && athlete.gender !== event.gender) {
          conflicts.push({
            type: 'athlete',
            description: `运动员性别${athlete.gender}不符合项目性别要求${event.gender}`,
            affectedEntities: [athleteId, eventId],
            severity: 'error',
          });
        }

        const athleteSchedules = schedules.filter(
          (s) => s.athletes.includes(athleteId) && s.eventId !== eventId
        );
        const newEventSchedules = schedules.filter((s) => s.eventId === eventId);

        for (const existing of athleteSchedules) {
          for (const newSched of newEventSchedules) {
            if (existing.date === newSched.date) {
              const existingStart = parseInt(existing.startTime.replace(':', ''), 10);
              const existingEnd = parseInt(existing.endTime.replace(':', ''), 10);
              const newStart = parseInt(newSched.startTime.replace(':', ''), 10);
              const newEnd = parseInt(newSched.endTime.replace(':', ''), 10);

              if (!(existingEnd <= newStart || newEnd <= existingStart)) {
                conflicts.push({
                  type: 'time',
                  description: `运动员在${existing.date}已有比赛${existing.eventName}与新项目${newSched.eventName}时间冲突`,
                  affectedEntities: [athleteId, existing.id, newSched.id],
                  severity: 'error',
                });
              }
            }
          }
        }

        if (selectedEventIds && selectedEventIds.length > 0) {
          const otherSelectedEventIds = selectedEventIds.filter(id => id !== eventId);
          if (otherSelectedEventIds.length > 0) {
            const newEventSchedules = schedules.filter((s) => s.eventId === eventId);
            
            for (const otherEventId of otherSelectedEventIds) {
              const otherEventSchedules = schedules.filter((s) => s.eventId === otherEventId);
              
              for (const newSched of newEventSchedules) {
                for (const otherSched of otherEventSchedules) {
                  if (newSched.date === otherSched.date) {
                    const newStart = parseInt(newSched.startTime.replace(':', ''), 10);
                    const newEnd = parseInt(newSched.endTime.replace(':', ''), 10);
                    const otherStart = parseInt(otherSched.startTime.replace(':', ''), 10);
                    const otherEnd = parseInt(otherSched.endTime.replace(':', ''), 10);
                    
                    if (!(newEnd <= otherStart || otherEnd <= newStart)) {
                      const otherEvent = events.find((e) => e.id === otherEventId);
                      const currentEvent = events.find((e) => e.id === eventId);
                      conflicts.push({
                        type: 'time',
                        description: `与已选择的"${otherEvent?.name || otherEventId}"在${newSched.date}时间冲突（${newSched.startTime}-${newSched.endTime} vs ${otherSched.startTime}-${otherSched.endTime}）`,
                        affectedEntities: [athleteId, eventId, otherEventId],
                        severity: 'error',
                      });
                    }
                  }
                }
              }
            }
          }
        }

        return conflicts;
      },

      dispatchMedicalStaff: (medicalRecordId, medicalStaffId) => {
        const { medicalRecords, medicalStaff } = get();
        const record = medicalRecords.find((r) => r.id === medicalRecordId);
        const staff = medicalStaff.find((m) => m.id === medicalStaffId);

        if (!record || !staff) return;

        set((state) => ({
          medicalRecords: state.medicalRecords.map((r) =>
            r.id === medicalRecordId
              ? {
                  ...r,
                  assignedMedicalId: medicalStaffId,
                  status: 'dispatched' as MedicalStatus,
                  responseTime: Math.floor(Date.now() / 1000) - Math.floor(new Date(r.createdAt).getTime() / 1000),
                }
              : r
          ),
        }));

        get().pushNotification(
          medicalStaffId,
          'medical',
          '新的医疗任务分配',
          `您已被分配处理${record.patientName}的${record.injuryType}`,
          medicalRecordId,
          'medicalRecord'
        );
      },

      purchaseTicket: (audienceId, scheduleId, seatId, seatInfo, price, originalPrice) => {
        const newOrder: TicketOrder = {
          id: uuidv4(),
          audienceId,
          scheduleId,
          seatId,
          seatInfo,
          price,
          originalPrice,
          purchaseTime: new Date().toISOString(),
          status: 'paid' as TicketStatus,
          qrCode: `QR-${uuidv4()}`,
        };

        set((state) => ({ ticketOrders: [...state.ticketOrders, newOrder] }));

        const { schedules } = get();
        const schedule = schedules.find((s) => s.id === scheduleId);

        get().pushNotification(
          audienceId,
          'ticket',
          '购票成功',
          `您已成功购买${schedule?.eventName}门票，座位：${seatInfo}`,
          newOrder.id,
          'ticketOrder'
        );

        return newOrder;
      },

      refundTicket: (orderId) => {
        const { ticketOrders } = get();
        const order = ticketOrders.find((t) => t.id === orderId);

        if (!order || order.status === 'refunded') return;

        set((state) => ({
          ticketOrders: state.ticketOrders.map((t) =>
            t.id === orderId ? { ...t, status: 'refunded' as TicketStatus } : t
          ),
        }));

        get().pushNotification(
          order.audienceId,
          'ticket',
          '退票成功',
          `您的订单${orderId}已退票，款项将在3-5个工作日内原路返回`,
          orderId,
          'ticketOrder'
        );
      },

      lockAthleteResult: (athleteId) => {
        set((state) => ({
          results: state.results.map((r) =>
            r.athleteId === athleteId ? { ...r, status: 'locked' as ResultStatus } : r
          ),
        }));

        const { athletes } = get();
        const athlete = athletes.find((a) => a.id === athleteId);

        get().pushNotification(
          'all',
          'doping',
          '运动员成绩已锁定',
          `运动员${athlete?.name || athleteId}因兴奋剂检测异常，所有成绩已被锁定`,
          athleteId,
          'athlete'
        );
      },

      generatePatrolRoute: (venueId, personnelId) => {
        const { venues } = get();
        const venue = venues.find((v) => v.id === venueId);

        const baseLat = venue?.location.lat || 39.9;
        const baseLng = venue?.location.lng || 116.4;

        const waypoints = [
          { lat: baseLat, lng: baseLng },
          { lat: baseLat + 0.002, lng: baseLng + 0.001 },
          { lat: baseLat + 0.003, lng: baseLng - 0.002 },
          { lat: baseLat - 0.001, lng: baseLng - 0.003 },
          { lat: baseLat - 0.002, lng: baseLng + 0.002 },
          { lat: baseLat, lng: baseLng },
        ];

        const newRoute: PatrolRoute = {
          id: uuidv4(),
          personnelId,
          venueId,
          waypoints,
          estimatedDuration: waypoints.length * 5,
          generatedAt: new Date().toISOString(),
        };

        set((state) => ({ patrolRoutes: [...state.patrolRoutes, newRoute] }));

        get().pushNotification(
          personnelId,
          'system',
          '新巡逻路线已生成',
          `您的巡逻路线已生成，预计时长${newRoute.estimatedDuration}分钟`,
          newRoute.id,
          'patrolRoute'
        );

        return newRoute;
      },

      adjustPatrolRoute: (routeId, waypoints) => {
        set((state) => ({
          patrolRoutes: state.patrolRoutes.map((r) =>
            r.id === routeId ? { ...r, waypoints, estimatedDuration: waypoints.length * 5 } : r
          ),
        }));
      },

      updateLocation: (personnelId, location) => {
        set((state) => ({
          securityPersonnel: state.securityPersonnel.map((s) =>
            s.id === personnelId ? { ...s, currentLocation: location } : s
          ),
        }));
      },

      updateCrowdData: (venueId) => {
        const venue = get().venues.find((v) => v.id === venueId);
        if (!venue) return;

        const baseLat = venue.location.lat;
        const baseLng = venue.location.lng;
        const capacity = venue.capacity;

        const heatmapData: HeatmapPoint[] = [];
        for (let i = 0; i < 20; i++) {
          heatmapData.push({
            lat: baseLat + (Math.random() - 0.5) * 0.01,
            lng: baseLng + (Math.random() - 0.5) * 0.01,
            value: Math.floor(Math.random() * 100),
          });
        }

        const density = Math.floor(Math.random() * 100);
        const count = Math.floor((capacity * density) / 100);

        set((state) => ({
          crowdHeatmapData: {
            ...state.crowdHeatmapData,
            [venueId]: heatmapData,
          },
          crowdDensityData: {
            ...state.crowdDensityData,
            [venueId]: {
              density,
              count,
              timestamp: new Date().toISOString(),
            },
          },
        }));
      },

      addPatrolRoute: (route) => {
        set((state) => ({ patrolRoutes: [...state.patrolRoutes, route] }));
      },

      updatePatrolRoute: (id, route) => {
        set((state) => ({
          patrolRoutes: state.patrolRoutes.map((r) => (r.id === id ? { ...r, ...route } : r)),
        }));
      },

      deletePatrolRoute: (id) => {
        set((state) => ({ patrolRoutes: state.patrolRoutes.filter((r) => r.id !== id) }));
      },

      reportInjury: (data) => {
        const newRecord: MedicalRecord = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          status: 'reported' as MedicalStatus,
        };

        set((state) => ({
          medicalRecords: [...state.medicalRecords, newRecord],
        }));

        get().pushNotification(
          'all',
          'medical',
          '新的伤病上报',
          `${newRecord.patientName} - ${newRecord.injuryType} (${newRecord.severity === 'critical' ? '危急' : newRecord.severity === 'severe' ? '重度' : newRecord.severity === 'moderate' ? '中度' : '轻度'})`,
          newRecord.id,
          'medicalRecord'
        );

        return newRecord;
      },

      dispatchNearestMedical: (medicalRecordId) => {
        const { medicalRecords, medicalStaff } = get();
        const record = medicalRecords.find((r) => r.id === medicalRecordId);

        if (!record) return null;

        const availableStaff = medicalStaff.filter((s) => s.status === 'on-duty');
        if (availableStaff.length === 0) return null;

        let nearestStaff: MedicalStaff | null = null;
        let minDistance = Infinity;

        for (const staff of availableStaff) {
          const staffLocation = staff.currentLocation || { lat: 39.9, lng: 116.4 };
          const distance = calculateDistance(
            record.location.lat,
            record.location.lng,
            staffLocation.lat,
            staffLocation.lng
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestStaff = staff;
          }
        }

        if (!nearestStaff) return null;

        const estimatedTime = Math.ceil(minDistance * 15);

        get().dispatchMedicalStaff(medicalRecordId, nearestStaff.id);

        return {
          staff: nearestStaff,
          distance: minDistance,
          estimatedTime,
        };
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          medicalRecords: state.medicalRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      updateCurrentUser: (updates) => {
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
        }));
      },

      approveAthlete: (athleteId) => {
        set((state) => ({
          athletes: state.athletes.map(a => 
            a.id === athleteId ? { ...a, status: 'approved' as const } : a
          ),
          users: state.users.map(u => 
            u.id === athleteId ? { ...u, status: 'active' as const } : u
          )
        }));
        
        const athlete = get().athletes.find(a => a.id === athleteId);
        if (athlete) {
          get().pushNotification(
            athleteId,
            'registration',
            '注册申请已通过',
            `恭喜您，您的运动员注册申请已通过审核，可以开始参赛了！`,
            athleteId,
            'athlete'
          );
        }
      },

      rejectAthlete: (athleteId, reason) => {
        set((state) => ({
          athletes: state.athletes.map(a => 
            a.id === athleteId ? { ...a, status: 'rejected' as const } : a
          ),
          users: state.users.map(u => 
            u.id === athleteId ? { ...u, status: 'inactive' as const } : u
          )
        }));
        
        const athlete = get().athletes.find(a => a.id === athleteId);
        if (athlete) {
          get().pushNotification(
            athleteId,
            'registration',
            '注册申请未通过',
            `很遗憾，您的运动员注册申请未通过。原因：${reason}`,
            athleteId,
            'athlete'
          );
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        athletes: state.athletes,
        events: state.events,
        venues: state.venues,
        schedules: state.schedules,
        results: state.results,
        medalStanding: state.medalStanding,
        volunteers: state.volunteers,
        securityPersonnel: state.securityPersonnel,
        medicalStaff: state.medicalStaff,
        notifications: state.notifications,
        ticketOrders: state.ticketOrders,
        dopingTests: state.dopingTests,
        medicalRecords: state.medicalRecords,
        patrolRoutes: state.patrolRoutes,
      }),
    }
  )
);
