import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole, MedalType, Severity } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateAthleteId(countryCode: string): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${countryCode.toUpperCase()}-${year}-${randomNum}`;
}

export function calculateAge(birthDate: string): number {
  const birth = parseISO(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatDate(date: string | Date, format: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, format, { locale: zhCN });
}

export function formatTime(time: string | Date): string {
  const timeObj = typeof time === 'string' ? parseISO(time) : time;
  return dateFnsFormat(timeObj, 'HH:mm:ss');
}

export function generateUUID(): string {
  return uuidv4();
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function calculateDynamicPrice(
  basePrice: number,
  heat: number,
  remaining: number,
  total: number
): number {
  const heatFactor = Math.max(0.8, Math.min(1.5, 1 + (heat - 50) / 100));
  const remainingRatio = remaining / total;
  const scarcityFactor = Math.max(1, 1.5 - remainingRatio * 0.5);
  const finalPrice = basePrice * heatFactor * scarcityFactor;
  return Math.round(finalPrice * 100) / 100;
}

export async function exportToPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export function getMedalColor(medal: string): string {
  const medalMap: Record<MedalType | string, string> = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  };
  return medalMap[medal] || '#9CA3AF';
}

export function getSeverityColor(severity: string): string {
  const severityMap: Record<Severity | string, string> = {
    mild: '#10B981',
    moderate: '#F59E0B',
    severe: '#EF4444',
    critical: '#7C2D12',
  };
  return severityMap[severity] || '#6B7280';
}

export function getRoleName(role: string): string {
  const roleMap: Record<UserRole | string, string> = {
    admin: '系统管理员',
    athlete: '运动员',
    referee: '裁判',
    volunteer: '志愿者',
    security: '安保人员',
    medical: '医疗人员',
    audience: '观众',
    doping: '反兴奋剂官员',
  };
  return roleMap[role] || role;
}

export function getRoleIcon(role: string): string {
  const iconMap: Record<UserRole | string, string> = {
    admin: 'Shield',
    athlete: 'User',
    referee: 'Scale',
    volunteer: 'HeartHandshake',
    security: 'ShieldAlert',
    medical: 'Stethoscope',
    audience: 'Users',
    doping: 'FlaskConical',
  };
  return iconMap[role] || 'User';
}
