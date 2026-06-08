import type { MedicalStaff } from '@/types';

export interface Athlete {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  sport: string;
  gender: 'male' | 'female';
  age: number;
  avatar: string;
  medals: { gold: number; silver: number; bronze: number };
}

export interface Event {
  id: string;
  name: string;
  sport: string;
  category: string;
  gender: 'male' | 'female' | 'mixed';
  venueId: string;
}

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string;
  status: 'open' | 'closed' | 'maintenance';
}

export interface Schedule {
  id: string;
  eventId: string;
  eventName: string;
  venueId: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participants: string[];
}

export interface Result {
  id: string;
  eventId: string;
  eventName: string;
  athleteId: string;
  athleteName: string;
  country: string;
  score: string;
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  date: string;
}

export interface MedalStanding {
  id: string;
  country: string;
  countryCode: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  avatar: string;
  assignedVenue: string;
}

export interface SecurityPerson {
  id: string;
  name: string;
  rank: string;
  assignedArea: string;
  status: 'on-duty' | 'off-duty';
  avatar: string;
  contact: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  read: boolean;
  date: string;
}

export interface TicketOrder {
  id: string;
  orderNo: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  seatType: 'VIP' | '普通';
  quantity: number;
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  purchaser: string;
}

export interface DopingTest {
  id: string;
  athleteId: string;
  athleteName: string;
  country: string;
  testDate: string;
  testType: 'in-competition' | 'out-of-competition';
  substance: string | null;
  result: 'negative' | 'positive' | 'pending';
  notes: string;
}

export interface MedicalRecord {
  id: string;
  patientName: string;
  patientType: 'athlete' | 'staff' | 'spectator';
  date: string;
  diagnosis: string;
  treatment: string;
  doctor: string;
  status: 'treated' | 'ongoing' | 'referred';
}

export const athletes: Athlete[] = [
  { id: 'A001', name: '张三', country: '中国', countryCode: 'CHN', sport: '游泳', gender: 'male', age: 24, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20swimmer%20athlete%20portrait&image_size=square', medals: { gold: 3, silver: 1, bronze: 0 } },
  { id: 'A002', name: '李四', country: '中国', countryCode: 'CHN', sport: '乒乓球', gender: 'female', age: 26, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20table%20tennis%20player%20portrait&image_size=square', medals: { gold: 2, silver: 0, bronze: 1 } },
  { id: 'A003', name: 'Michael Phelps', country: '美国', countryCode: 'USA', sport: '游泳', gender: 'male', age: 28, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20american%20male%20swimmer%20athlete%20portrait&image_size=square', medals: { gold: 5, silver: 2, bronze: 1 } },
  { id: 'A004', name: 'Simone Biles', country: '美国', countryCode: 'USA', sport: '体操', gender: 'female', age: 25, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20american%20female%20gymnast%20portrait&image_size=square', medals: { gold: 4, silver: 1, bronze: 0 } },
  { id: 'A005', name: '羽生结弦', country: '日本', countryCode: 'JPN', sport: '花样滑冰', gender: 'male', age: 27, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20japanese%20male%20figure%20skater%20portrait&image_size=square', medals: { gold: 2, silver: 1, bronze: 0 } },
  { id: 'A006', name: '大坂直美', country: '日本', countryCode: 'JPN', sport: '网球', gender: 'female', age: 24, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20japanese%20female%20tennis%20player%20portrait&image_size=square', medals: { gold: 1, silver: 0, bronze: 0 } },
  { id: 'A007', name: 'Thomas Müller', country: '德国', countryCode: 'GER', sport: '足球', gender: 'male', age: 30, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20german%20male%20football%20player%20portrait&image_size=square', medals: { gold: 1, silver: 1, bronze: 0 } },
  { id: 'A008', name: 'Maya DiRado', country: '德国', countryCode: 'GER', sport: '游泳', gender: 'female', age: 26, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20german%20female%20swimmer%20portrait&image_size=square', medals: { gold: 1, silver: 1, bronze: 1 } },
  { id: 'A009', name: 'Cate Campbell', country: '澳大利亚', countryCode: 'AUS', sport: '游泳', gender: 'female', age: 29, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20australian%20female%20swimmer%20portrait&image_size=square', medals: { gold: 2, silver: 2, bronze: 1 } },
  { id: 'A010', name: 'Emma McKeon', country: '澳大利亚', countryCode: 'AUS', sport: '游泳', gender: 'female', age: 27, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20australian%20female%20swimmer%20athlete%20portrait&image_size=square', medals: { gold: 3, silver: 1, bronze: 2 } },
  { id: 'A011', name: '王五', country: '中国', countryCode: 'CHN', sport: '田径', gender: 'male', age: 28, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20track%20athlete%20portrait&image_size=square', medals: { gold: 1, silver: 2, bronze: 1 } },
  { id: 'A012', name: 'Timothy Hodge', country: '澳大利亚', countryCode: 'AUS', sport: '游泳', gender: 'male', age: 22, avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20australian%20male%20swimmer%20portrait&image_size=square', medals: { gold: 0, silver: 1, bronze: 2 } },
];

export const events: Event[] = [
  { id: 'E001', name: '男子100米自由泳', sport: '游泳', category: '游泳', gender: 'male', venueId: 'V002' },
  { id: 'E002', name: '女子100米自由泳', sport: '游泳', category: '游泳', gender: 'female', venueId: 'V002' },
  { id: 'E003', name: '男子200米自由泳', sport: '游泳', category: '游泳', gender: 'male', venueId: 'V002' },
  { id: 'E004', name: '女子200米蛙泳', sport: '游泳', category: '游泳', gender: 'female', venueId: 'V002' },
  { id: 'E005', name: '男子100米飞鱼', sport: '游泳', category: '游泳', gender: 'male', venueId: 'V002' },
  { id: 'E006', name: '男子100米短跑', sport: '田径', category: '田径', gender: 'male', venueId: 'V001' },
  { id: 'E007', name: '女子100米短跑', sport: '田径', category: '田径', gender: 'female', venueId: 'V001' },
  { id: 'E008', name: '男子马拉松', sport: '田径', category: '田径', gender: 'male', venueId: 'V001' },
  { id: 'E009', name: '女子400米接力', sport: '田径', category: '田径', gender: 'female', venueId: 'V001' },
  { id: 'E010', name: '男子跳高', sport: '田径', category: '田径', gender: 'male', venueId: 'V001' },
  { id: 'E011', name: '女子跳马', sport: '体操', category: '体操', gender: 'female', venueId: 'V003' },
  { id: 'E012', name: '男子自由操', sport: '体操', category: '体操', gender: 'male', venueId: 'V003' },
  { id: 'E013', name: '女子平衡木', sport: '体操', category: '体操', gender: 'female', venueId: 'V003' },
  { id: 'E014', name: '男子个人全能', sport: '体操', category: '体操', gender: 'male', venueId: 'V003' },
  { id: 'E015', name: '男子乒乓球单打', sport: '乒乓球', category: '乒乓球', gender: 'male', venueId: 'V004' },
  { id: 'E016', name: '女子乒乓球单打', sport: '乒乓球', category: '乒乓球', gender: 'female', venueId: 'V004' },
  { id: 'E017', name: '乒乓球混合双打', sport: '乒乓球', category: '乒乓球', gender: 'mixed', venueId: 'V004' },
  { id: 'E018', name: '男子羽毛球单打', sport: '羽毛球', category: '羽毛球', gender: 'male', venueId: 'V005' },
  { id: 'E019', name: '女子羽毛球单打', sport: '羽毛球', category: '羽毛球', gender: 'female', venueId: 'V005' },
  { id: 'E020', name: '羽毛球男子双打', sport: '羽毛球', category: '羽毛球', gender: 'male', venueId: 'V005' },
];

export const venues: Venue[] = [
  { id: 'V001', name: '主体育场', capacity: 80000, type: '综合', location: '中心区A座', status: 'open' },
  { id: 'V002', name: '游泳馆', capacity: 15000, type: '游泳', location: '中心区B座', status: 'open' },
  { id: 'V003', name: '体操馆', capacity: 12000, type: '体操', location: '中心区C座', status: 'open' },
  { id: 'V004', name: '乒乓球馆', capacity: 8000, type: '球类', location: '东区D座', status: 'open' },
  { id: 'V005', name: '羽毛球馆', capacity: 7500, type: '球类', location: '东区E座', status: 'open' },
];

export const schedules: Schedule[] = [
  { id: 'S001', eventId: 'E001', eventName: '男子100米自由泳', venueId: 'V002', venueName: '游泳馆', date: '2026-06-10', startTime: '09:00', endTime: '10:30', status: 'upcoming', participants: ['A001', 'A003', 'A008', 'A012'] },
  { id: 'S002', eventId: 'E002', eventName: '女子100米自由泳', venueId: 'V002', venueName: '游泳馆', date: '2026-06-10', startTime: '10:30', endTime: '12:00', status: 'upcoming', participants: ['A008', 'A009', 'A010'] },
  { id: 'S003', eventId: 'E006', eventName: '男子100米短跑', venueId: 'V001', venueName: '主体育场', date: '2026-06-10', startTime: '14:00', endTime: '15:00', status: 'upcoming', participants: ['A011'] },
  { id: 'S004', eventId: 'E015', eventName: '男子乒乓球单打', venueId: 'V004', venueName: '乒乓球馆', date: '2026-06-10', startTime: '15:30', endTime: '18:00', status: 'upcoming', participants: ['A002'] },
  { id: 'S005', eventId: 'E011', eventName: '女子跳马', venueId: 'V003', venueName: '体操馆', date: '2026-06-11', startTime: '09:00', endTime: '11:00', status: 'upcoming', participants: ['A004'] },
  { id: 'S006', eventId: 'E003', eventName: '男子200米自由泳', venueId: 'V002', venueName: '游泳馆', date: '2026-06-11', startTime: '11:30', endTime: '13:00', status: 'upcoming', participants: ['A001', 'A003', 'A012'] },
  { id: 'S007', eventId: 'E016', eventName: '女子乒乓球单打', venueId: 'V004', venueName: '乒乓球馆', date: '2026-06-11', startTime: '14:00', endTime: '16:30', status: 'upcoming', participants: ['A002'] },
  { id: 'S008', eventId: 'E018', eventName: '男子羽毛球单打', venueId: 'V005', venueName: '羽毛球馆', date: '2026-06-11', startTime: '17:00', endTime: '19:00', status: 'upcoming', participants: [] },
  { id: 'S009', eventId: 'E007', eventName: '女子100米短跑', venueId: 'V001', venueName: '主体育场', date: '2026-06-12', startTime: '09:00', endTime: '10:00', status: 'upcoming', participants: [] },
  { id: 'S010', eventId: 'E004', eventName: '女子200米蛙泳', venueId: 'V002', venueName: '游泳馆', date: '2026-06-12', startTime: '10:30', endTime: '12:00', status: 'upcoming', participants: ['A008', 'A009'] },
  { id: 'S011', eventId: 'E012', eventName: '男子自由操', venueId: 'V003', venueName: '体操馆', date: '2026-06-12', startTime: '13:00', endTime: '15:00', status: 'upcoming', participants: ['A004'] },
  { id: 'S012', eventId: 'E019', eventName: '女子羽毛球单打', venueId: 'V005', venueName: '羽毛球馆', date: '2026-06-12', startTime: '15:30', endTime: '17:30', status: 'upcoming', participants: [] },
  { id: 'S013', eventId: 'E005', eventName: '男子100米飞鱼', venueId: 'V002', venueName: '游泳馆', date: '2026-06-13', startTime: '09:00', endTime: '10:30', status: 'upcoming', participants: ['A003', 'A012'] },
  { id: 'S014', eventId: 'E008', eventName: '男子马拉松', venueId: 'V001', venueName: '主体育场', date: '2026-06-13', startTime: '07:00', endTime: '11:00', status: 'upcoming', participants: ['A011'] },
  { id: 'S015', eventId: 'E013', eventName: '女子平衡木', venueId: 'V003', venueName: '体操馆', date: '2026-06-13', startTime: '13:00', endTime: '15:00', status: 'upcoming', participants: ['A004'] },
  { id: 'S016', eventId: 'E017', eventName: '乒乓球混合双打', venueId: 'V004', venueName: '乒乓球馆', date: '2026-06-13', startTime: '15:30', endTime: '18:00', status: 'upcoming', participants: ['A002'] },
  { id: 'S017', eventId: 'E020', eventName: '羽毛球男子双打', venueId: 'V005', venueName: '羽毛球馆', date: '2026-06-14', startTime: '09:00', endTime: '11:00', status: 'upcoming', participants: [] },
  { id: 'S018', eventId: 'E009', eventName: '女子400米接力', venueId: 'V001', venueName: '主体育场', date: '2026-06-14', startTime: '11:30', endTime: '12:30', status: 'upcoming', participants: [] },
  { id: 'S019', eventId: 'E014', eventName: '男子个人全能', venueId: 'V003', venueName: '体操馆', date: '2026-06-14', startTime: '13:00', endTime: '16:00', status: 'upcoming', participants: [] },
  { id: 'S020', eventId: 'E010', eventName: '男子跳高', venueId: 'V001', venueName: '主体育场', date: '2026-06-15', startTime: '09:00', endTime: '11:00', status: 'upcoming', participants: ['A011'] },
  { id: 'S021', eventId: 'E001', eventName: '男子100米自由泳预赛', venueId: 'V002', venueName: '游泳馆', date: '2026-06-09', startTime: '09:00', endTime: '10:30', status: 'completed', participants: ['A001', 'A003', 'A008', 'A012'] },
  { id: 'S022', eventId: 'E002', eventName: '女子100米自由泳预赛', venueId: 'V002', venueName: '游泳馆', date: '2026-06-09', startTime: '10:30', endTime: '12:00', status: 'completed', participants: ['A008', 'A009', 'A010'] },
];

export const results: Result[] = [
  { id: 'R001', eventId: 'E001', eventName: '男子100米自由泳预赛', athleteId: 'A003', athleteName: 'Michael Phelps', country: '美国', score: '47.02', rank: 1, medal: 'gold', date: '2026-06-09' },
  { id: 'R002', eventId: 'E001', eventName: '男子100米自由泳预赛', athleteId: 'A001', athleteName: '张三', country: '中国', score: '47.58', rank: 2, medal: 'silver', date: '2026-06-09' },
  { id: 'R003', eventId: 'E001', eventName: '男子100米自由泳预赛', athleteId: 'A008', athleteName: 'Maya DiRado', country: '德国', score: '48.15', rank: 3, medal: 'bronze', date: '2026-06-09' },
  { id: 'R004', eventId: 'E001', eventName: '男子100米自由泳预赛', athleteId: 'A012', athleteName: 'Timothy Hodge', country: '澳大利亚', score: '48.72', rank: 4, medal: null, date: '2026-06-09' },
  { id: 'R005', eventId: 'E002', eventName: '女子100米自由泳预赛', athleteId: 'A010', athleteName: 'Emma McKeon', country: '澳大利亚', score: '52.14', rank: 1, medal: 'gold', date: '2026-06-09' },
  { id: 'R006', eventId: 'E002', eventName: '女子100米自由泳预赛', athleteId: 'A009', athleteName: 'Cate Campbell', country: '澳大利亚', score: '52.36', rank: 2, medal: 'silver', date: '2026-06-09' },
  { id: 'R007', eventId: 'E002', eventName: '女子100米自由泳预赛', athleteId: 'A008', athleteName: 'Maya DiRado', country: '德国', score: '53.02', rank: 3, medal: 'bronze', date: '2026-06-09' },
  { id: 'R008', eventId: 'E006', eventName: '男子100米短跑', athleteId: 'A011', athleteName: '王五', country: '中国', score: '9.83', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R009', eventId: 'E006', eventName: '男子100米短跑', athleteId: 'A003', athleteName: 'Michael Phelps', country: '美国', score: '9.88', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R010', eventId: 'E006', eventName: '男子100米短跑', athleteId: 'A007', athleteName: 'Thomas Müller', country: '德国', score: '9.91', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R011', eventId: 'E011', eventName: '女子跳马', athleteId: 'A004', athleteName: 'Simone Biles', country: '美国', score: '15.466', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R012', eventId: 'E011', eventName: '女子跳马', athleteId: 'A005', athleteName: '羽生结弦', country: '日本', score: '14.833', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R013', eventId: 'E011', eventName: '女子跳马', athleteId: 'A002', athleteName: '李四', country: '中国', score: '14.566', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R014', eventId: 'E015', eventName: '男子乒乓球单打', athleteId: 'A002', athleteName: '李四', country: '中国', score: '4-1', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R015', eventId: 'E015', eventName: '男子乒乓球单打', athleteId: 'A003', athleteName: 'Michael Phelps', country: '美国', score: '3-4', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R016', eventId: 'E015', eventName: '男子乒乓球单打', athleteId: 'A005', athleteName: '羽生结弦', country: '日本', score: '2-4', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R017', eventId: 'E016', eventName: '女子乒乓球单打', athleteId: 'A002', athleteName: '李四', country: '中国', score: '4-0', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R018', eventId: 'E016', eventName: '女子乒乓球单打', athleteId: 'A006', athleteName: '大坂直美', country: '日本', score: '3-4', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R019', eventId: 'E016', eventName: '女子乒乓球单打', athleteId: 'A009', athleteName: 'Cate Campbell', country: '澳大利亚', score: '1-4', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R020', eventId: 'E003', eventName: '男子200米自由泳', athleteId: 'A003', athleteName: 'Michael Phelps', country: '美国', score: '1:42.96', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R021', eventId: 'E003', eventName: '男子200米自由泳', athleteId: 'A001', athleteName: '张三', country: '中国', score: '1:43.45', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R022', eventId: 'E003', eventName: '男子200米自由泳', athleteId: 'A012', athleteName: 'Timothy Hodge', country: '澳大利亚', score: '1:44.12', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R023', eventId: 'E007', eventName: '女子100米短跑', athleteId: 'A010', athleteName: 'Emma McKeon', country: '澳大利亚', score: '10.54', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R024', eventId: 'E007', eventName: '女子100米短跑', athleteId: 'A009', athleteName: 'Cate Campbell', country: '澳大利亚', score: '10.61', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R025', eventId: 'E007', eventName: '女子100米短跑', athleteId: 'A004', athleteName: 'Simone Biles', country: '美国', score: '10.72', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R026', eventId: 'E012', eventName: '男子自由操', athleteId: 'A004', athleteName: 'Simone Biles', country: '美国', score: '15.233', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R027', eventId: 'E012', eventName: '男子自由操', athleteId: 'A005', athleteName: '羽生结弦', country: '日本', score: '14.966', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R028', eventId: 'E012', eventName: '男子自由操', athleteId: 'A001', athleteName: '张三', country: '中国', score: '14.633', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R029', eventId: 'E004', eventName: '女子200米蛙泳', athleteId: 'A008', athleteName: 'Maya DiRado', country: '德国', score: '2:18.45', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R030', eventId: 'E004', eventName: '女子200米蛙泳', athleteId: 'A009', athleteName: 'Cate Campbell', country: '澳大利亚', score: '2:19.23', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R031', eventId: 'E004', eventName: '女子200米蛙泳', athleteId: 'A010', athleteName: 'Emma McKeon', country: '澳大利亚', score: '2:20.11', rank: 3, medal: 'bronze', date: '2026-06-08' },
  { id: 'R032', eventId: 'E010', eventName: '男子跳高', athleteId: 'A011', athleteName: '王五', country: '中国', score: '2.38', rank: 1, medal: 'gold', date: '2026-06-08' },
  { id: 'R033', eventId: 'E010', eventName: '男子跳高', athleteId: 'A007', athleteName: 'Thomas Müller', country: '德国', score: '2.35', rank: 2, medal: 'silver', date: '2026-06-08' },
  { id: 'R034', eventId: 'E010', eventName: '男子跳高', athleteId: 'A012', athleteName: 'Timothy Hodge', country: '澳大利亚', score: '2.32', rank: 3, medal: 'bronze', date: '2026-06-08' },
];

export const medalStandings: MedalStanding[] = [
  { id: 'M001', country: '中国', countryCode: 'CHN', gold: 18, silver: 12, bronze: 9, total: 39 },
  { id: 'M002', country: '美国', countryCode: 'USA', gold: 15, silver: 14, bronze: 11, total: 40 },
  { id: 'M003', country: '澳大利亚', countryCode: 'AUS', gold: 10, silver: 8, bronze: 12, total: 30 },
  { id: 'M004', country: '日本', countryCode: 'JPN', gold: 8, silver: 10, bronze: 7, total: 25 },
  { id: 'M005', country: '德国', countryCode: 'GER', gold: 7, silver: 6, bronze: 8, total: 21 },
  { id: 'M006', country: '法国', countryCode: 'FRA', gold: 6, silver: 8, bronze: 5, total: 19 },
  { id: 'M007', country: '英国', countryCode: 'GBR', gold: 5, silver: 7, bronze: 9, total: 21 },
  { id: 'M008', country: '韩国', countryCode: 'KOR', gold: 4, silver: 5, bronze: 6, total: 15 },
  { id: 'M009', country: '意大利', countryCode: 'ITA', gold: 3, silver: 6, bronze: 4, total: 13 },
  { id: 'M010', country: '加拿大', countryCode: 'CAN', gold: 2, silver: 4, bronze: 7, total: 13 },
];

export const volunteers: Volunteer[] = [
  { id: 'V001', name: '陈小明', role: '场地引导', department: '场馆服务部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20volunteer%20portrait&image_size=square', assignedVenue: '主体育场' },
  { id: 'V002', name: '李小红', role: '观众服务', department: '观众服务部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20volunteer%20portrait&image_size=square', assignedVenue: '游泳馆' },
  { id: 'V003', name: '王大力', role: '交通协调', department: '交通部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20volunteer%20uniform&image_size=square', assignedVenue: '体操馆' },
  { id: 'V004', name: '张美丽', role: '语言翻译', department: '外联部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20translator%20portrait&image_size=square', assignedVenue: '乒乓球馆' },
  { id: 'V005', name: '刘小华', role: '媒体协助', department: '媒体部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20media%20assistant%20portrait&image_size=square', assignedVenue: '羽毛球馆' },
  { id: 'V006', name: '赵小芳', role: '运动员服务', department: '运动员村', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20volunteer%20portrait&image_size=square', assignedVenue: '运动员村' },
  { id: 'V007', name: '孙强', role: '安检协助', department: '安保部', status: 'inactive', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20security%20volunteer%20portrait&image_size=square', assignedVenue: '主体育场' },
  { id: 'V008', name: '周敏', role: '医疗协助', department: '医疗部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20medical%20volunteer%20portrait&image_size=square', assignedVenue: '主体育场' },
  { id: 'V009', name: '吴磊', role: '技术支持', department: '技术部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20tech%20volunteer%20portrait&image_size=square', assignedVenue: '游泳馆' },
  { id: 'V010', name: '郑雪', role: '行政助理', department: '组委会', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20office%20volunteer%20portrait&image_size=square', assignedVenue: '组委会' },
  { id: 'V011', name: '钱进', role: '餐饮服务', department: '后勤部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20male%20catering%20volunteer%20portrait&image_size=square', assignedVenue: '运动员村' },
  { id: 'V012', name: '杨丽', role: '礼仪接待', department: '外联部', status: 'active', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20chinese%20female%20receptionist%20volunteer%20portrait&image_size=square', assignedVenue: '主体育场' },
];

export const securityPersons: SecurityPerson[] = [
  { id: 'SEC001', name: '李国栋', rank: '安保队长', assignedArea: '主体育场', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20captain%20portrait&image_size=square', contact: '13800138001' },
  { id: 'SEC002', name: '王铁军', rank: '安保副队长', assignedArea: '游泳馆', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20guard%20portrait&image_size=square', contact: '13800138002' },
  { id: 'SEC003', name: '张威武', rank: '安保员', assignedArea: '体操馆', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20officer%20portrait&image_size=square', contact: '13800138003' },
  { id: 'SEC004', name: '刘卫国', rank: '安保员', assignedArea: '乒乓球馆', status: 'off-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20staff%20portrait&image_size=square', contact: '13800138004' },
  { id: 'SEC005', name: '陈和平', rank: '安检组长', assignedArea: '羽毛球馆', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20inspector%20portrait&image_size=square', contact: '13800138005' },
  { id: 'SEC006', name: '赵强', rank: '安保员', assignedArea: '运动员村', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20security%20personnel%20portrait&image_size=square', contact: '13800138006' },
];

export const medicalStaffs: MedicalStaff[] = [
  { id: 'MED001', name: '张医生', specialty: '运动医学', department: '医疗中心', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20doctor%20portrait&image_size=square', licenseNo: 'MED-2026-0001' },
  { id: 'MED002', name: '李医生', specialty: '骨科', department: '医疗中心', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20female%20doctor%20portrait&image_size=square', licenseNo: 'MED-2026-0002' },
  { id: 'MED003', name: '王医生', specialty: '急诊科', department: '主体育场医疗站', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20emergency%20doctor%20portrait&image_size=square', licenseNo: 'MED-2026-0003' },
  { id: 'MED004', name: '刘护士', specialty: '护理', department: '游泳馆医疗站', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20female%20nurse%20portrait&image_size=square', licenseNo: 'NUR-2026-0004' },
  { id: 'MED005', name: '陈医生', specialty: '运动心理学', department: '运动员村', status: 'off-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20female%20psychologist%20portrait&image_size=square', licenseNo: 'MED-2026-0005' },
  { id: 'MED006', name: '赵医生', specialty: '康复科', department: '体操馆医疗站', status: 'on-duty', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20chinese%20male%20physiotherapist%20portrait&image_size=square', licenseNo: 'MED-2026-0006' },
];

export const notifications: Notification[] = [
  { id: 'N001', title: '比赛日程更新', content: '男子100米自由泳决赛时间调整为明天上午9:00，请相关运动员准时参加。', type: 'info', read: false, date: '2026-06-08 08:30' },
  { id: 'N002', title: '天气预警', content: '今日下午有雷阵雨，请室外场馆做好防雨准备，观众请携带雨具。', type: 'warning', read: false, date: '2026-06-08 09:15' },
  { id: 'N003', title: '紧急通知', content: '游泳馆发现疑似病例，已启动应急预案，请相关人员配合隔离观察。', type: 'urgent', read: false, date: '2026-06-08 10:20' },
  { id: 'N004', title: '成绩公告', content: '女子乒乓球单打决赛已结束，中国选手李四获得金牌。', type: 'success', read: true, date: '2026-06-08 11:00' },
  { id: 'N005', title: '交通管制', content: '明日主体育场周边道路将进行交通管制，请提前规划出行路线。', type: 'info', read: true, date: '2026-06-08 11:30' },
  { id: 'N006', title: '志愿者通知', content: '请所有场馆志愿者于今日14:00到主体育场会议室参加培训。', type: 'info', read: false, date: '2026-06-08 12:00' },
  { id: 'N007', title: '兴奋剂检测提醒', content: '请今日获奖运动员于赛后1小时内到兴奋剂检测中心报到。', type: 'warning', read: true, date: '2026-06-08 13:00' },
  { id: 'N008', title: '票务信息', content: '男子篮球决赛门票已售罄，请关注后续退票信息。', type: 'info', read: true, date: '2026-06-08 14:00' },
  { id: 'N009', title: '医疗服务升级', content: '运动员村医疗中心已新增运动康复科，提供24小时服务。', type: 'success', read: true, date: '2026-06-08 14:30' },
  { id: 'N010', title: '安保升级', content: '接上级通知，即日起所有场馆安检等级提升至一级，请配合检查。', type: 'urgent', read: false, date: '2026-06-08 15:00' },
  { id: 'N011', title: '奖牌榜更新', content: '中国队今日再添3金，以18金继续领跑奖牌榜。', type: 'success', read: true, date: '2026-06-08 16:00' },
  { id: 'N012', title: '餐饮服务提醒', content: '运动员村餐厅今日新增日韩料理专区，欢迎品尝。', type: 'info', read: true, date: '2026-06-08 16:30' },
  { id: 'N013', title: '设备故障', content: '体操馆计分板出现故障，技术人员正在紧急维修。', type: 'warning', read: false, date: '2026-06-08 17:00' },
  { id: 'N014', title: '新闻发布会', content: '今日20:00将在主新闻中心召开男子游泳决赛新闻发布会。', type: 'info', read: true, date: '2026-06-08 17:30' },
  { id: 'N015', title: '班车调整', content: '运动员村至场馆的班车班次已加密，发车间隔缩短至15分钟。', type: 'success', read: true, date: '2026-06-08 18:00' },
  { id: 'N016', title: '观众须知', content: '观看比赛时禁止使用闪光灯拍照，请勿携带专业摄像设备。', type: 'warning', read: true, date: '2026-06-08 18:30' },
  { id: 'N017', title: '失物招领', content: '在游泳馆捡到一个黑色背包，请失主到服务台认领。', type: 'info', read: true, date: '2026-06-08 19:00' },
  { id: 'N018', title: '医疗紧急事件', content: '一名观众在主体育场突发心脏病，已送医救治，目前情况稳定。', type: 'urgent', read: false, date: '2026-06-08 19:30' },
  { id: 'N019', title: '文化活动', content: '明晚19:30将在运动员村举办文化交流晚会，欢迎参加。', type: 'info', read: true, date: '2026-06-08 20:00' },
  { id: 'N020', title: '闭幕彩排', content: '闭幕式第一次彩排在即，请所有演职人员准时到位。', type: 'info', read: false, date: '2026-06-08 20:30' },
  { id: 'N021', title: '系统维护', content: '票务系统将于今晚23:00-次日01:00进行维护，届时暂停服务。', type: 'warning', read: true, date: '2026-06-08 21:00' },
  { id: 'N022', title: '反兴奋剂教育', content: '明日10:00将举办反兴奋剂知识讲座，请运动员积极参加。', type: 'info', read: true, date: '2026-06-08 21:30' },
];

export const ticketOrders: TicketOrder[] = [
  { id: 'T001', orderNo: 'ORD202606080001', eventName: '男子100米自由泳决赛', eventDate: '2026-06-10', venueName: '游泳馆', seatType: 'VIP', quantity: 2, totalPrice: 3600, status: 'confirmed', purchaser: '张先生' },
  { id: 'T002', orderNo: 'ORD202606080002', eventName: '女子乒乓球单打决赛', eventDate: '2026-06-11', venueName: '乒乓球馆', seatType: '普通', quantity: 4, totalPrice: 2400, status: 'confirmed', purchaser: '李女士' },
  { id: 'T003', orderNo: 'ORD202606080003', eventName: '男子100米短跑决赛', eventDate: '2026-06-12', venueName: '主体育场', seatType: 'VIP', quantity: 5, totalPrice: 10000, status: 'confirmed', purchaser: '王先生' },
  { id: 'T004', orderNo: 'ORD202606080004', eventName: '女子跳马决赛', eventDate: '2026-06-11', venueName: '体操馆', seatType: '普通', quantity: 3, totalPrice: 1200, status: 'pending', purchaser: '赵女士' },
  { id: 'T005', orderNo: 'ORD202606080005', eventName: '羽毛球男子双打决赛', eventDate: '2026-06-14', venueName: '羽毛球馆', seatType: '普通', quantity: 2, totalPrice: 800, status: 'confirmed', purchaser: '孙先生' },
  { id: 'T006', orderNo: 'ORD202606080006', eventName: '男子马拉松', eventDate: '2026-06-13', venueName: '主体育场', seatType: 'VIP', quantity: 1, totalPrice: 2000, status: 'cancelled', purchaser: '周先生' },
  { id: 'T007', orderNo: 'ORD202606080007', eventName: '男子200米自由泳决赛', eventDate: '2026-06-11', venueName: '游泳馆', seatType: '普通', quantity: 6, totalPrice: 3000, status: 'confirmed', purchaser: '吴先生' },
  { id: 'T008', orderNo: 'ORD202606080008', eventName: '女子平衡木决赛', eventDate: '2026-06-13', venueName: '体操馆', seatType: 'VIP', quantity: 2, totalPrice: 3200, status: 'confirmed', purchaser: '郑女士' },
  { id: 'T009', orderNo: 'ORD202606080009', eventName: '乒乓球混合双打决赛', eventDate: '2026-06-13', venueName: '乒乓球馆', seatType: '普通', quantity: 3, totalPrice: 1500, status: 'pending', purchaser: '钱先生' },
  { id: 'T010', orderNo: 'ORD202606080010', eventName: '男子跳高决赛', eventDate: '2026-06-15', venueName: '主体育场', seatType: 'VIP', quantity: 4, totalPrice: 6400, status: 'confirmed', purchaser: '冯女士' },
  { id: 'T011', orderNo: 'ORD202606080011', eventName: '女子100米自由泳决赛', eventDate: '2026-06-10', venueName: '游泳馆', seatType: '普通', quantity: 2, totalPrice: 1000, status: 'confirmed', purchaser: '陈先生' },
  { id: 'T012', orderNo: 'ORD202606080012', eventName: '男子羽毛球单打决赛', eventDate: '2026-06-11', venueName: '羽毛球馆', seatType: 'VIP', quantity: 3, totalPrice: 4500, status: 'confirmed', purchaser: '褚女士' },
];

export const dopingTests: DopingTest[] = [
  { id: 'D001', athleteId: 'A001', athleteName: '张三', country: '中国', testDate: '2026-06-08', testType: 'in-competition', substance: null, result: 'negative', notes: '所有指标正常' },
  { id: 'D002', athleteId: 'A003', athleteName: 'Michael Phelps', country: '美国', testDate: '2026-06-08', testType: 'in-competition', substance: null, result: 'negative', notes: '检测通过' },
  { id: 'D003', athleteId: 'A008', athleteName: 'Maya DiRado', country: '德国', testDate: '2026-06-07', testType: 'out-of-competition', substance: null, result: 'negative', notes: '飞行检测，结果正常' },
  { id: 'D004', athleteId: 'A011', athleteName: '王五', country: '中国', testDate: '2026-06-08', testType: 'in-competition', substance: '促红细胞生成素(EPO)', result: 'positive', notes: 'A瓶检测阳性，已通知运动员申请B瓶检测' },
  { id: 'D005', athleteId: 'A010', athleteName: 'Emma McKeon', country: '澳大利亚', testDate: '2026-06-06', testType: 'out-of-competition', substance: null, result: 'negative', notes: '赛前随机检测' },
  { id: 'D006', athleteId: 'A005', athleteName: '羽生结弦', country: '日本', testDate: '2026-06-08', testType: 'in-competition', substance: null, result: 'pending', notes: '样本正在检测中' },
  { id: 'D007', athleteId: 'A004', athleteName: 'Simone Biles', country: '美国', testDate: '2026-06-05', testType: 'out-of-competition', substance: null, result: 'negative', notes: '常规检测' },
];

export const medicalRecords: MedicalRecord[] = [
  { id: 'MR001', patientName: '张三', patientType: 'athlete', date: '2026-06-08', diagnosis: '右肩肌肉拉伤', treatment: '冷敷+物理治疗', doctor: '张医生', status: 'ongoing' },
  { id: 'MR002', patientName: 'Michael Phelps', patientType: 'athlete', date: '2026-06-07', diagnosis: '轻微脱水', treatment: '补液+休息', doctor: '王医生', status: 'treated' },
  { id: 'MR003', patientName: '李四', patientType: 'athlete', date: '2026-06-08', diagnosis: '手腕腱鞘炎', treatment: '固定+药物治疗', doctor: '李医生', status: 'ongoing' },
  { id: 'MR004', patientName: '王观众', patientType: 'spectator', date: '2026-06-08', diagnosis: '突发心脏病', treatment: '紧急救治后转院', doctor: '王医生', status: 'referred' },
  { id: 'MR005', patientName: '陈小明', patientType: 'staff', date: '2026-06-07', diagnosis: '中暑', treatment: '降温+补液', doctor: '刘护士', status: 'treated' },
  { id: 'MR006', patientName: 'Simone Biles', patientType: 'athlete', date: '2026-06-06', diagnosis: '踝关节扭伤', treatment: '固定+康复训练', doctor: '赵医生', status: 'ongoing' },
  { id: 'MR007', patientName: '羽生结弦', patientType: 'athlete', date: '2026-06-08', diagnosis: '感冒', treatment: '药物治疗+休息', doctor: '张医生', status: 'treated' },
  { id: 'MR008', patientName: '刘工作人员', patientType: 'staff', date: '2026-06-07', diagnosis: '急性肠胃炎', treatment: '药物治疗', doctor: '李医生', status: 'treated' },
];
