import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  List,
  MapPin,
  Target,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Users,
  Trophy,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  XCircle,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils';
import type { Schedule, ScheduleStatus } from '@/types';

type ViewType = 'calendar' | 'list' | 'venue' | 'event';

interface FilterState {
  startDate: string;
  endDate: string;
  venueIds: string[];
  eventIds: string[];
  status: ScheduleStatus | 'all';
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

const getStatusConfig = (status: ScheduleStatus) => {
  const config: Record<ScheduleStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    scheduled: {
      label: '未开始',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock,
    },
    ongoing: {
      label: '进行中',
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: PlayCircle,
    },
    completed: {
      label: '已完成',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: CheckCircle2,
    },
    cancelled: {
      label: '已取消',
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
    },
  };
  return config[status];
};

export default function ScheduleCalendar() {
  const { schedules, events, venues, athletes, results } = useAppStore();

  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    venueIds: [],
    eventIds: [],
    status: 'all',
  });

  const getVenueColor = (venueId: string): string => {
    const index = venues.findIndex((v) => v.id === venueId);
    return VENUE_COLORS[index % VENUE_COLORS.length];
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (filters.startDate && schedule.date < filters.startDate) return false;
      if (filters.endDate && schedule.date > filters.endDate) return false;
      if (filters.venueIds.length > 0 && !filters.venueIds.includes(schedule.venueId)) return false;
      if (filters.eventIds.length > 0 && !filters.eventIds.includes(schedule.eventId)) return false;
      if (filters.status !== 'all' && schedule.status !== filters.status) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          schedule.eventName.toLowerCase().includes(query) ||
          schedule.venueName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [schedules, filters, searchQuery]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  const getSchedulesForDate = useCallback(
    (date: Date | null): Schedule[] => {
      if (!date) return [];
      const dateStr = formatDate(date, 'yyyy-MM-dd');
      return filteredSchedules.filter((s) => s.date === dateStr);
    },
    [filteredSchedules]
  );

  const schedulesByVenue = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    filteredSchedules.forEach((schedule) => {
      if (!grouped[schedule.venueId]) {
        grouped[schedule.venueId] = [];
      }
      grouped[schedule.venueId].push(schedule);
    });
    return grouped;
  }, [filteredSchedules]);

  const schedulesByEvent = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    filteredSchedules.forEach((schedule) => {
      if (!grouped[schedule.eventId]) {
        grouped[schedule.eventId] = [];
      }
      grouped[schedule.eventId].push(schedule);
    });
    return grouped;
  }, [filteredSchedules]);

  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    filteredSchedules
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .forEach((schedule) => {
        if (!grouped[schedule.date]) {
          grouped[schedule.date] = [];
        }
        grouped[schedule.date].push(schedule);
      });
    return grouped;
  }, [filteredSchedules]);

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const toggleVenueFilter = (venueId: string) => {
    setFilters((prev) => ({
      ...prev,
      venueIds: prev.venueIds.includes(venueId)
        ? prev.venueIds.filter((id) => id !== venueId)
        : [...prev.venueIds, venueId],
    }));
  };

  const toggleEventFilter = (eventId: string) => {
    setFilters((prev) => ({
      ...prev,
      eventIds: prev.eventIds.includes(eventId)
        ? prev.eventIds.filter((id) => id !== eventId)
        : [...prev.eventIds, eventId],
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      venueIds: [],
      eventIds: [],
      status: 'all',
    });
    setSearchQuery('');
  };

  const hasScheduleResults = (scheduleId: string): boolean => {
    return results.some((r) => r.scheduleId === scheduleId);
  };

  const viewTabs = [
    { id: 'calendar' as ViewType, label: '日历视图', icon: CalendarDays },
    { id: 'list' as ViewType, label: '列表视图', icon: List },
    { id: 'venue' as ViewType, label: '场地视图', icon: MapPin },
    { id: 'event' as ViewType, label: '项目视图', icon: Target },
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const renderCalendarView = () => (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {formatDate(currentMonth, 'yyyy年MM月')}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              今天
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-600">未开始</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-slate-600">进行中</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-slate-600">已完成</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((day) => (
          <div key={day} className="py-3 text-center text-sm font-medium text-slate-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const daySchedules = getSchedulesForDate(date);
          const isToday = date && formatDate(date, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd');
          const isCurrentMonth = date && date.getMonth() === currentMonth.getMonth();

          return (
            <div
              key={index}
              className={cn(
                'min-h-28 border-b border-r border-slate-100 p-2',
                !date && 'bg-slate-50',
                isCurrentMonth === false && 'bg-slate-50/50'
              )}
            >
              {date && (
                <>
                  <div
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-2',
                      isToday && 'bg-primary-500 text-white font-medium',
                      !isToday && isCurrentMonth && 'text-slate-900',
                      !isToday && !isCurrentMonth && 'text-slate-400'
                    )}
                  >
                    {date.getDate()}
                  </div>
                  {daySchedules.length > 0 && (
                    <div className="space-y-1">
                      {daySchedules.length <= 3 ? (
                        daySchedules.map((schedule) => {
                          const statusConfig = getStatusConfig(schedule.status);
                          return (
                            <motion.div
                              key={schedule.id}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => setSelectedSchedule(schedule)}
                              className={cn(
                                'text-xs p-1.5 rounded-lg cursor-pointer truncate transition-all',
                                getVenueColor(schedule.venueId) + ' text-white',
                                schedule.status === 'ongoing' && 'animate-pulse',
                                schedule.status === 'completed' && 'opacity-60'
                              )}
                            >
                              <span className="font-medium">{schedule.startTime}</span> {schedule.eventName}
                            </motion.div>
                          );
                        })
                      ) : (
                        <>
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <motion.div
                              key={schedule.id}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => setSelectedSchedule(schedule)}
                              className={cn(
                                'text-xs p-1.5 rounded-lg cursor-pointer truncate transition-all',
                                getVenueColor(schedule.venueId) + ' text-white',
                                schedule.status === 'ongoing' && 'animate-pulse',
                                schedule.status === 'completed' && 'opacity-60'
                              )}
                            >
                              <span className="font-medium">{schedule.startTime}</span> {schedule.eventName}
                            </motion.div>
                          ))}
                          <div
                            onClick={() => {
                              const dateStr = formatDate(date, 'yyyy-MM-dd');
                              const dayScheds = filteredSchedules.filter((s) => s.date === dateStr);
                              if (dayScheds.length > 0) {
                                setSelectedSchedule(dayScheds[0]);
                              }
                            }}
                            className="text-xs p-1.5 text-center text-slate-500 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors"
                          >
                            +{daySchedules.length - 2} 场更多
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {Object.keys(schedulesByDate).length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-card border border-slate-100">
          <CalendarDays className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无赛程</h3>
          <p className="text-slate-500">没有符合筛选条件的比赛赛程</p>
        </div>
      ) : (
        Object.entries(schedulesByDate).map(([date, dateSchedules]) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {formatDate(date, 'yyyy年MM月dd日 EEEE')}
              </h3>
              <p className="text-sm text-slate-500">共 {dateSchedules.length} 场比赛</p>
            </div>
            <div className="divide-y divide-slate-100">
              {dateSchedules.map((schedule) => {
                const statusConfig = getStatusConfig(schedule.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.div
                    key={schedule.id}
                    whileHover={{ x: 4 }}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer transition-all',
                      schedule.status === 'completed' && 'opacity-70'
                    )}
                  >
                    <div className="text-center min-w-20">
                      <p className="text-lg font-bold text-slate-900">{schedule.startTime}</p>
                      <p className="text-xs text-slate-500">{schedule.endTime}</p>
                    </div>
                    <div
                      className={cn(
                        'w-1 h-12 rounded-full',
                        getVenueColor(schedule.venueId),
                        schedule.status === 'ongoing' && 'animate-pulse'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{schedule.eventName}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {schedule.venueName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                        statusConfig.className,
                        schedule.status === 'ongoing' && 'animate-pulse'
                      )}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                    {schedule.status === 'completed' && hasScheduleResults(schedule.id) && (
                      <div className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                        <Trophy className="w-4 h-4" />
                        查看成绩
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  const renderVenueView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Object.keys(schedulesByVenue).length === 0 ? (
        <div className="lg:col-span-2 bg-white rounded-2xl p-16 text-center shadow-card border border-slate-100">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无赛程</h3>
          <p className="text-slate-500">没有符合筛选条件的比赛赛程</p>
        </div>
      ) : (
        Object.entries(schedulesByVenue).map(([venueId, venueSchedules]) => {
          const venue = venues.find((v) => v.id === venueId);
          if (!venue) return null;
          const venueColor = getVenueColor(venueId);

          return (
            <motion.div
              key={venueId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden"
            >
              <div className={cn('px-5 py-4 text-white', venueColor)}>
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-semibold">{venue.name}</h3>
                    <p className="text-sm text-white/80">{venue.type} · 共 {venueSchedules.length} 场</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {venueSchedules
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                  .map((schedule) => {
                    const statusConfig = getStatusConfig(schedule.status);
                    return (
                      <motion.div
                        key={schedule.id}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedSchedule(schedule)}
                        className={cn(
                          'flex items-center gap-4 p-4 cursor-pointer transition-all',
                          schedule.status === 'completed' && 'opacity-70'
                        )}
                      >
                        <div className="text-center min-w-20">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(schedule.date, 'MM/dd')}
                          </p>
                          <p className="text-xs text-slate-500">{schedule.startTime}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{schedule.eventName}</p>
                          <p className="text-xs text-slate-500">{schedule.round}</p>
                        </div>
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            statusConfig.className
                          )}
                        >
                          {statusConfig.label}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderEventView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Object.keys(schedulesByEvent).length === 0 ? (
        <div className="lg:col-span-2 bg-white rounded-2xl p-16 text-center shadow-card border border-slate-100">
          <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无赛程</h3>
          <p className="text-slate-500">没有符合筛选条件的比赛赛程</p>
        </div>
      ) : (
        Object.entries(schedulesByEvent).map(([eventId, eventSchedules]) => {
          const event = events.find((e) => e.id === eventId);
          if (!event) return null;

          return (
            <motion.div
              key={eventId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden"
            >
              <div className="px-5 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <p className="text-sm text-white/80">
                      {event.category} · {event.gender === 'mixed' ? '混合' : event.gender === 'male' ? '男子' : '女子'} · 共{' '}
                      {eventSchedules.length} 场
                    </p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {eventSchedules
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                  .map((schedule) => {
                    const statusConfig = getStatusConfig(schedule.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <motion.div
                        key={schedule.id}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedSchedule(schedule)}
                        className={cn(
                          'flex items-center gap-4 p-4 cursor-pointer transition-all',
                          schedule.status === 'completed' && 'opacity-70'
                        )}
                      >
                        <div className="text-center min-w-20">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(schedule.date, 'MM/dd')}
                          </p>
                          <p className="text-xs text-slate-500">{schedule.startTime}</p>
                        </div>
                        <div
                          className={cn(
                            'w-1 h-10 rounded-full',
                            getVenueColor(schedule.venueId),
                            schedule.status === 'ongoing' && 'animate-pulse'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{schedule.venueName}</p>
                          <p className="text-xs text-slate-500">{schedule.round}</p>
                        </div>
                        <span
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                            statusConfig.className,
                            schedule.status === 'ongoing' && 'animate-pulse'
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="赛程日历"
        description="查看和管理所有比赛赛程安排"
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索比赛..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 w-64 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all',
                showFilters
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
              )}
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-2 shadow-card border border-slate-100 inline-flex gap-1">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  currentView === tab.id
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">筛选条件</h3>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    重置
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">开始日期</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">结束日期</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">比赛状态</label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, status: e.target.value as ScheduleStatus | 'all' }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="all">全部状态</option>
                      <option value="scheduled">未开始</option>
                      <option value="ongoing">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm text-slate-600 mb-2 block">比赛场地</label>
                  <div className="flex flex-wrap gap-2">
                    {venues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => toggleVenueFilter(venue.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          filters.venueIds.includes(venue.id)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                      >
                        {venue.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm text-slate-600 mb-2 block">比赛项目</label>
                  <div className="flex flex-wrap gap-2">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => toggleEventFilter(event.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          filters.eventIds.includes(event.id)
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                      >
                        {event.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              当前显示 <span className="font-semibold">{filteredSchedules.length}</span> 场比赛，
              共 <span className="font-semibold">{schedules.length}</span> 场赛程
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'calendar' && renderCalendarView()}
            {currentView === 'list' && renderListView()}
            {currentView === 'venue' && renderVenueView()}
            {currentView === 'event' && renderEventView()}
          </motion.div>
        </AnimatePresence>
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
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  'p-5 text-white',
                  getVenueColor(selectedSchedule.venueId),
                  selectedSchedule.status === 'completed' && 'opacity-90'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedSchedule.eventName}</h3>
                    <p className="text-sm text-white/80 mt-1">{selectedSchedule.round}</p>
                  </div>
                  <button
                    onClick={() => setSelectedSchedule(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(85vh-88px)]">
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">比赛场地</p>
                      <p className="font-medium text-slate-900">{selectedSchedule.venueName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <CalendarDays className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-500">比赛日期</p>
                        <p className="font-medium text-slate-900">
                          {formatDate(selectedSchedule.date, 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <Clock className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-500">比赛时间</p>
                        <p className="font-medium text-slate-900">
                          {selectedSchedule.startTime} - {selectedSchedule.endTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    {(() => {
                      const statusConfig = getStatusConfig(selectedSchedule.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <>
                          <StatusIcon
                            className={cn(
                              'w-5 h-5',
                              selectedSchedule.status === 'ongoing' && 'animate-pulse'
                            )}
                          />
                          <div>
                            <p className="text-sm text-slate-500">比赛状态</p>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                                statusConfig.className,
                                selectedSchedule.status === 'ongoing' && 'animate-pulse'
                              )}
                            >
                              {statusConfig.label}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-slate-500" />
                      <p className="text-sm text-slate-500">
                        参赛运动员 ({selectedSchedule.athletes.length}人)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSchedule.athletes.length > 0 ? (
                        selectedSchedule.athletes.map((athleteId) => {
                          const athlete = athletes.find((a) => a.id === athleteId);
                          return athlete ? (
                            <div
                              key={athleteId}
                              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200"
                            >
                              <img
                                src={athlete.avatar}
                                alt={athlete.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{athlete.name}</p>
                                <p className="text-xs text-slate-500">{athlete.country}</p>
                              </div>
                            </div>
                          ) : null;
                        })
                      ) : (
                        <p className="text-sm text-slate-400">暂无参赛运动员信息</p>
                      )}
                    </div>
                  </div>

                  {selectedSchedule.status === 'completed' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-amber-600" />
                          <div>
                            <p className="font-medium text-amber-900">比赛成绩</p>
                            <p className="text-sm text-amber-700">
                              {hasScheduleResults(selectedSchedule.id)
                                ? '成绩已录入，点击查看详情'
                                : '成绩待录入'}
                            </p>
                          </div>
                        </div>
                        {hasScheduleResults(selectedSchedule.id) && (
                          <button className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
                            查看成绩
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">转场时间</p>
                        <p className="text-sm text-blue-700">
                          比赛结束后预留 {selectedSchedule.transitionTime} 分钟转场时间
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
