import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Target,
  Clock,
  Users,
  Play,
  CheckCircle,
  AlertTriangle,
  GripVertical,
  RefreshCw,
  Save,
  Info,
  Sun,
  Sunset,
  Moon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import ProgressBar from '@/components/ProgressBar';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils';
import type { Schedule, Event, Venue, Conflict } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface GenerateConfig {
  selectedEvents: string[];
  selectedVenues: string[];
  startDate: string;
  endDate: string;
  timeSlots: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  transitionTime: number;
  maxEventsPerAthlete: number;
}

interface GeneratedSchedule extends Schedule {
  hasConflict: boolean;
  conflictDetails: Conflict[];
}

const VENUE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-indigo-500',
];

const TIME_SLOT_RANGES = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '14:00', end: '18:00' },
  evening: { start: '19:00', end: '22:00' },
};

export default function ScheduleGenerate() {
  const { events, venues, athletes, addSchedule, updateSchedule, schedules } = useAppStore();
  const { showToast } = useToast();

  const [config, setConfig] = useState<GenerateConfig>({
    selectedEvents: [],
    selectedVenues: [],
    startDate: formatDate(new Date(), 'yyyy-MM-dd'),
    endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    timeSlots: {
      morning: true,
      afternoon: true,
      evening: false,
    },
    transitionTime: 30,
    maxEventsPerAthlete: 3,
  });

  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draggedSchedule, setDraggedSchedule] = useState<GeneratedSchedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const getVenueColor = (venueId: string): string => {
    const index = venues.findIndex((v) => v.id === venueId);
    return VENUE_COLORS[index % VENUE_COLORS.length];
  };

  const toggleEventSelection = (eventId: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(eventId)
        ? prev.selectedEvents.filter((id) => id !== eventId)
        : [...prev.selectedEvents, eventId],
    }));
  };

  const toggleVenueSelection = (venueId: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedVenues: prev.selectedVenues.includes(venueId)
        ? prev.selectedVenues.filter((id) => id !== venueId)
        : [...prev.selectedVenues, venueId],
    }));
  };

  const detectConflicts = useCallback(
    (newSchedules: GeneratedSchedule[]): Conflict[] => {
      const detectedConflicts: Conflict[] = [];

      for (let i = 0; i < newSchedules.length; i++) {
        const s1 = newSchedules[i];
        for (let j = i + 1; j < newSchedules.length; j++) {
          const s2 = newSchedules[j];

          if (s1.date === s2.date && s1.venueId === s2.venueId) {
            const s1Start = parseInt(s1.startTime.replace(':', ''), 10);
            const s1End = parseInt(s1.endTime.replace(':', ''), 10);
            const s2Start = parseInt(s2.startTime.replace(':', ''), 10);
            const s2End = parseInt(s2.endTime.replace(':', ''), 10);

            if (!(s1End <= s2Start || s2End <= s1Start)) {
              detectedConflicts.push({
                type: 'venue',
                description: `场地冲突：${s1.venueName} 在 ${s1.date} ${s1.startTime}-${s1.endTime} 与 ${s2.startTime}-${s2.endTime} 重叠`,
                affectedEntities: [s1.id, s2.id],
                severity: 'error',
              });
            }
          }

          if (s1.date === s2.date) {
            const commonAthletes = s1.athletes.filter((a) => s2.athletes.includes(a));
            if (commonAthletes.length > 0) {
              const s1Start = parseInt(s1.startTime.replace(':', ''), 10);
              const s1End = parseInt(s1.endTime.replace(':', ''), 10);
              const s2Start = parseInt(s2.startTime.replace(':', ''), 10);
              const s2End = parseInt(s2.endTime.replace(':', ''), 10);

              if (!(s1End <= s2Start || s2End <= s1Start)) {
                const athleteNames = commonAthletes
                  .map((id) => athletes.find((a) => a.id === id)?.name)
                  .filter(Boolean)
                  .join('、');
                detectedConflicts.push({
                  type: 'athlete',
                  description: `运动员冲突：${athleteNames} 在 ${s1.date} 同时参加 ${s1.eventName} 和 ${s2.eventName}`,
                  affectedEntities: [s1.id, s2.id, ...commonAthletes],
                  severity: 'error',
                });
              }
            }
          }
        }
      }

      return detectedConflicts;
    },
    [athletes]
  );

  const generateSchedule = useCallback(async () => {
    if (config.selectedEvents.length === 0) {
      showToast('error', '请至少选择一个比赛项目');
      return;
    }
    if (config.selectedVenues.length === 0) {
      showToast('error', '请至少选择一个比赛场地');
      return;
    }
    if (config.startDate > config.endDate) {
      showToast('error', '开始日期不能晚于结束日期');
      return;
    }

    const activeTimeSlots = Object.entries(config.timeSlots)
      .filter(([, active]) => active)
      .map(([key]) => key as keyof typeof TIME_SLOT_RANGES);

    if (activeTimeSlots.length === 0) {
      showToast('error', '请至少选择一个比赛时段');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedSchedules([]);
    setConflicts([]);

    const selectedEventsList = events.filter((e) => config.selectedEvents.includes(e.id));
    const selectedVenuesList = venues.filter((v) => config.selectedVenues.includes(v.id));

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newSchedules: GeneratedSchedule[] = [];
    const athleteEventCount: Record<string, number> = {};

    const totalSchedules = selectedEventsList.length;
    let completed = 0;

    for (const event of selectedEventsList) {
      await new Promise((resolve) => setTimeout(resolve, 200));

      let scheduled = false;
      for (let dayOffset = 0; dayOffset < totalDays && !scheduled; dayOffset++) {
        const date = new Date(start);
        date.setDate(date.getDate() + dayOffset);
        const dateStr = formatDate(date, 'yyyy-MM-dd');

        for (const timeSlot of activeTimeSlots) {
          if (scheduled) break;

          const { start: slotStart, end: slotEnd } = TIME_SLOT_RANGES[timeSlot];
          const venue = selectedVenuesList[newSchedules.length % selectedVenuesList.length];

          const eventAthletes = athletes
            .filter((a) => {
              if (event.gender !== 'mixed' && a.gender !== event.gender) return false;
              if (a.age < event.ageMin || a.age > event.ageMax) return false;
              const currentCount = athleteEventCount[a.id] || 0;
              if (currentCount >= config.maxEventsPerAthlete) return false;
              return true;
            })
            .slice(0, 8);

          if (eventAthletes.length === 0) continue;

          const existingSchedulesOnDate = newSchedules.filter(
            (s) => s.date === dateStr && s.venueId === venue.id
          );

          let startTime = slotStart;
          for (const existing of existingSchedulesOnDate) {
            const existingEnd = parseInt(existing.endTime.replace(':', ''), 10);
            const slotStartNum = parseInt(slotStart.replace(':', ''), 10);
            if (existingEnd + config.transitionTime * 100 > slotStartNum) {
              const [hours, minutes] = existing.endTime.split(':').map(Number);
              const newMinutes = minutes + config.transitionTime;
              const newHours = hours + Math.floor(newMinutes / 60);
              startTime = `${String(Math.floor(newHours)).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`;
            }
          }

          const [startHours, startMinutes] = startTime.split(':').map(Number);
          const endHours = startHours + 2;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;

          const slotEndNum = parseInt(slotEnd.replace(':', ''), 10);
          const endTimeNum = parseInt(endTime.replace(':', ''), 10);
          if (endTimeNum > slotEndNum) continue;

          eventAthletes.forEach((a) => {
            athleteEventCount[a.id] = (athleteEventCount[a.id] || 0) + 1;
          });

          const newSchedule: GeneratedSchedule = {
            id: uuidv4(),
            eventId: event.id,
            eventName: event.name,
            venueId: venue.id,
            venueName: venue.name,
            startTime,
            endTime,
            date: dateStr,
            round: '预赛',
            athletes: eventAthletes.map((a) => a.id),
            status: 'scheduled',
            transitionTime: config.transitionTime,
            hasConflict: false,
            conflictDetails: [],
          };

          newSchedules.push(newSchedule);
          scheduled = true;
        }
      }

      completed++;
      setProgress(Math.round((completed / totalSchedules) * 100));
    }

    const detectedConflicts = detectConflicts(newSchedules);
    const conflictScheduleIds = new Set(
      detectedConflicts.flatMap((c) => c.affectedEntities.filter((id) => newSchedules.some((s) => s.id === id)))
    );

    const schedulesWithConflicts = newSchedules.map((s) => ({
      ...s,
      hasConflict: conflictScheduleIds.has(s.id),
      conflictDetails: detectedConflicts.filter((c) => c.affectedEntities.includes(s.id)),
    }));

    setGeneratedSchedules(schedulesWithConflicts);
    setConflicts(detectedConflicts);
    setIsGenerating(false);

    if (detectedConflicts.length > 0) {
      showToast('warning', `赛程生成完成，但检测到 ${detectedConflicts.length} 个冲突`);
    } else {
      showToast('success', `成功生成 ${newSchedules.length} 场比赛赛程`);
    }
  }, [config, events, venues, athletes, detectConflicts, showToast]);

  const handleDragStart = (e: React.DragEvent | MouseEvent | PointerEvent | TouchEvent, schedule: GeneratedSchedule) => {
    setDraggedSchedule(schedule);
    if ('dataTransfer' in e) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetTime: string) => {
    e.preventDefault();
    if (!draggedSchedule) return;

    const updatedSchedules = generatedSchedules.map((s) => {
      if (s.id === draggedSchedule.id) {
        const [hours, minutes] = targetTime.split(':').map(Number);
        const endHours = hours + 2;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return {
          ...s,
          date: targetDate,
          startTime: targetTime,
          endTime,
        };
      }
      return s;
    });

    const detectedConflicts = detectConflicts(updatedSchedules);
    const conflictScheduleIds = new Set(
      detectedConflicts.flatMap((c) => c.affectedEntities.filter((id) => updatedSchedules.some((s) => s.id === id)))
    );

    const schedulesWithConflicts = updatedSchedules.map((s) => ({
      ...s,
      hasConflict: conflictScheduleIds.has(s.id),
      conflictDetails: detectedConflicts.filter((c) => c.affectedEntities.includes(s.id)),
    }));

    setGeneratedSchedules(schedulesWithConflicts);
    setConflicts(detectedConflicts);
    setDraggedSchedule(null);
    showToast('info', '赛程时间已更新');
  };

  const handlePublish = () => {
    if (generatedSchedules.length === 0) {
      showToast('warning', '没有可发布的赛程');
      return;
    }

    if (conflicts.length > 0) {
      showToast('error', '请先解决所有冲突后再发布');
      return;
    }

    generatedSchedules.forEach((schedule) => {
      const { hasConflict, conflictDetails, ...scheduleData } = schedule;
      addSchedule(scheduleData);
    });

    showToast('success', `成功发布 ${generatedSchedules.length} 场比赛赛程`);
    setGeneratedSchedules([]);
    setConflicts([]);
  };

  const handleRegenerate = () => {
    setGeneratedSchedules([]);
    setConflicts([]);
    generateSchedule();
  };

  const timelineDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(d, 'yyyy-MM-dd'));
    }
    return dates;
  }, [config.startDate, config.endDate]);

  const statistics = useMemo(() => {
    const total = generatedSchedules.length;
    const withConflicts = generatedSchedules.filter((s) => s.hasConflict).length;
    const withoutConflicts = total - withConflicts;
    const venuesUsed = new Set(generatedSchedules.map((s) => s.venueId)).size;
    const eventsCovered = new Set(generatedSchedules.map((s) => s.eventId)).size;
    return { total, withConflicts, withoutConflicts, venuesUsed, eventsCovered };
  }, [generatedSchedules]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="赛事编排"
        description="智能生成比赛赛程，自动检测冲突，支持手动调整"
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={generateSchedule}
              disabled={isGenerating}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                'bg-gradient-to-r from-primary-500 to-primary-600 text-white',
                'hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isGenerating ? '生成中...' : '生成赛程'}
            </button>
            <button
              onClick={handlePublish}
              disabled={generatedSchedules.length === 0 || conflicts.length > 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
                'hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="w-5 h-5" />
              确认发布
            </button>
          </div>
        }
      />

      <div className="flex gap-6 mt-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex-shrink-0 space-y-4"
        >
          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" />
              比赛项目
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.map((event) => (
                <label
                  key={event.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    config.selectedEvents.includes(event.id)
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config.selectedEvents.includes(event.id)}
                    onChange={() => toggleEventSelection(event.id)}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{event.name}</p>
                    <p className="text-xs text-slate-500">
                      {event.category} · {event.gender === 'mixed' ? '混合' : event.gender === 'male' ? '男子' : '女子'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              已选择 {config.selectedEvents.length} / {events.length} 项
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              比赛场地
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {venues.map((venue) => (
                <label
                  key={venue.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    config.selectedVenues.includes(venue.id)
                      ? 'bg-emerald-50 border-2 border-emerald-500'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config.selectedVenues.includes(venue.id)}
                    onChange={() => toggleVenueSelection(venue.id)}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{venue.name}</p>
                    <p className="text-xs text-slate-500">{venue.type} · 容量 {venue.capacity}</p>
                  </div>
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      VENUE_COLORS[venues.findIndex((v) => v.id === venue.id) % VENUE_COLORS.length]
                    )}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              已选择 {config.selectedVenues.length} / {venues.length} 个场地
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-500" />
              日期范围
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">开始日期</label>
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">结束日期</label>
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              比赛时段
            </h3>
            <div className="space-y-2">
              {[
                { key: 'morning', label: '上午', time: '08:00-12:00', icon: Sun, color: 'amber' },
                { key: 'afternoon', label: '下午', time: '14:00-18:00', icon: Sunset, color: 'orange' },
                { key: 'evening', label: '晚上', time: '19:00-22:00', icon: Moon, color: 'indigo' },
              ].map((slot) => (
                <label
                  key={slot.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    config.timeSlots[slot.key as keyof typeof config.timeSlots]
                      ? `bg-${slot.color}-50 border-2 border-${slot.color}-500`
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config.timeSlots[slot.key as keyof typeof config.timeSlots]}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        timeSlots: { ...prev.timeSlots, [slot.key]: e.target.checked },
                      }))
                    }
                    className={`w-4 h-4 text-${slot.color}-500 rounded focus:ring-${slot.color}-500`}
                  />
                  <slot.icon className={`w-5 h-5 text-${slot.color}-500`} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{slot.label}</p>
                    <p className="text-xs text-slate-500">{slot.time}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              其他设置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 flex justify-between">
                  <span>转场时间</span>
                  <span className="font-medium text-primary-600">{config.transitionTime} 分钟</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={config.transitionTime}
                  onChange={(e) => setConfig((prev) => ({ ...prev, transitionTime: parseInt(e.target.value, 10) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>15分钟</span>
                  <span>120分钟</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 flex justify-between">
                  <span>每人最多参赛项数</span>
                  <span className="font-medium text-primary-600">{config.maxEventsPerAthlete} 项</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.maxEventsPerAthlete}
                  onChange={(e) => setConfig((prev) => ({ ...prev, maxEventsPerAthlete: parseInt(e.target.value, 10) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1项</span>
                  <span>10项</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 space-y-4"
        >
          {isGenerating && (
            <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">正在生成赛程...</h3>
                <span className="text-primary-600 font-medium">{progress}%</span>
              </div>
              <ProgressBar value={progress} showLabel={false} />
            </div>
          )}

          {generatedSchedules.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl p-4 shadow-card border border-slate-100"
                >
                  <p className="text-sm text-slate-500">总赛程数</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{statistics.total}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl p-4 shadow-card border border-slate-100"
                >
                  <p className="text-sm text-slate-500">无冲突</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{statistics.withoutConflicts}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl p-4 shadow-card border border-slate-100"
                >
                  <p className="text-sm text-slate-500">有冲突</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{statistics.withConflicts}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white rounded-2xl p-4 shadow-card border border-slate-100"
                >
                  <p className="text-sm text-slate-500">使用场地</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{statistics.venuesUsed}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-4 shadow-card border border-slate-100"
                >
                  <p className="text-sm text-slate-500">覆盖项目</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{statistics.eventsCovered}</p>
                </motion.div>
              </div>

              {conflicts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4"
                >
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    冲突警告 ({conflicts.length} 个)
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {conflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-red-100"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-red-800">{conflict.description}</p>
                          <p className="text-xs text-red-500 mt-1">类型：{conflict.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">赛程时间轴</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <GripVertical className="w-4 h-4" />
                      拖拽调整时间
                    </div>
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      重新生成
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    <div className="flex border-b border-slate-200 mb-4">
                      <div className="w-24 flex-shrink-0" />
                      {timelineDates.map((date) => (
                        <div
                          key={date}
                          className="flex-1 min-w-48 px-4 py-2 text-center border-l border-slate-100"
                        >
                          <p className="font-semibold text-slate-900">{formatDate(date, 'MM月dd日')}</p>
                          <p className="text-xs text-slate-500">{formatDate(date, 'EEEE')}</p>
                        </div>
                      ))}
                    </div>

                    {config.selectedVenues.map((venueId) => {
                      const venue = venues.find((v) => v.id === venueId);
                      if (!venue) return null;
                      const venueColor = getVenueColor(venueId);

                      return (
                        <div key={venueId} className="flex items-start mb-4">
                          <div className="w-24 flex-shrink-0 pr-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', venueColor)} />
                              <span className="text-sm font-medium text-slate-700 truncate">{venue.name}</span>
                            </div>
                          </div>
                          <div className="flex-1 flex">
                            {timelineDates.map((date) => {
                              const daySchedules = generatedSchedules.filter(
                                (s) => s.date === date && s.venueId === venueId
                              );

                              return (
                                <div
                                  key={date}
                                  className="flex-1 min-w-48 px-2 py-2 border-l border-slate-100 relative"
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, date, '08:00')}
                                >
                                  {daySchedules.length === 0 ? (
                                    <div className="h-16" />
                                  ) : (
                                    <div className="space-y-2">
                                      {daySchedules.map((schedule) => (
                                        <motion.div
                                          key={schedule.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, schedule)}
                                          onClick={() => setSelectedSchedule(schedule)}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          className={cn(
                                            'relative p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all group',
                                            venueColor,
                                            schedule.hasConflict && 'ring-2 ring-red-500 ring-offset-2'
                                          )}
                                        >
                                          <div className="flex items-start gap-2">
                                            <GripVertical className="w-4 h-4 text-white/60 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold text-white truncate">
                                                {schedule.eventName}
                                              </p>
                                              <p className="text-xs text-white/80">
                                                {schedule.startTime} - {schedule.endTime}
                                              </p>
                                              <p className="text-xs text-white/70 mt-1">
                                                {schedule.athletes.length} 名运动员
                                              </p>
                                            </div>
                                          </div>
                                          {schedule.hasConflict && (
                                            <div className="absolute -top-1 -right-1">
                                              <AlertTriangle className="w-4 h-4 text-red-500 bg-white rounded-full" />
                                            </div>
                                          )}

                                          <AnimatePresence>
                                            {schedule.hasConflict && (
                                              <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute left-0 right-0 top-full mt-2 p-3 bg-red-50 border border-red-200 rounded-xl shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <p className="text-xs text-red-700 font-medium mb-1">冲突详情：</p>
                                                {schedule.conflictDetails.map((c, i) => (
                                                  <p key={i} className="text-xs text-red-600">
                                                    {c.description}
                                                  </p>
                                                ))}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {generatedSchedules.length === 0 && !isGenerating && (
            <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-slate-100">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                <CalendarDays className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">暂无赛程安排</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                请在左侧配置比赛项目、场地、日期等参数，然后点击"生成赛程"按钮开始智能编排
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSchedule(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">赛程详情</h3>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500">比赛项目</label>
                    <p className="font-semibold text-slate-900">{selectedSchedule.eventName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">比赛场地</label>
                    <p className="font-medium text-slate-900">{selectedSchedule.venueName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">日期</label>
                      <p className="font-medium text-slate-900">{selectedSchedule.date}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">时间</label>
                      <p className="font-medium text-slate-900">
                        {selectedSchedule.startTime} - {selectedSchedule.endTime}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">轮次</label>
                    <p className="font-medium text-slate-900">{selectedSchedule.round}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">参赛运动员 ({selectedSchedule.athletes.length}人)</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedSchedule.athletes.map((athleteId) => {
                        const athlete = athletes.find((a) => a.id === athleteId);
                        return athlete ? (
                          <span
                            key={athleteId}
                            className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700"
                          >
                            {athlete.name} ({athlete.country})
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  {selectedSchedule.hasConflict && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        存在冲突
                      </h4>
                      {selectedSchedule.conflictDetails.map((c, i) => (
                        <p key={i} className="text-sm text-red-700">
                          {c.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
