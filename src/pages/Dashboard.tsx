import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as LucideIcons from 'lucide-react';
import StatCard from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { formatDate, getMedalColor, getRoleName } from '@/utils';
import { cn } from '@/lib/utils';
import type { UserRole, ScheduleStatus, MedalStanding } from '@/types';

function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

function AnimatedNumber({ value, suffix = '' }: AnimatedNumberProps) {
  const count = useCountUp(value);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const getStatusLabel = (status: ScheduleStatus): { text: string; className: string } => {
  const statusMap: Record<ScheduleStatus, { text: string; className: string }> = {
    scheduled: { text: '未开始', className: 'bg-blue-100 text-blue-700' },
    ongoing: { text: '进行中', className: 'bg-green-100 text-green-700 animate-pulse' },
    completed: { text: '已完成', className: 'bg-slate-100 text-slate-600' },
    cancelled: { text: '已取消', className: 'bg-red-100 text-red-700' },
  };
  return statusMap[status] || statusMap.scheduled;
};

const getQuickActions = (role: UserRole): { icon: keyof typeof LucideIcons; label: string; path: string; color: string }[] => {
  const actions: Record<UserRole, { icon: keyof typeof LucideIcons; label: string; path: string; color: string }[]> = {
    admin: [
      { icon: 'Users', label: '运动员管理', path: '/athlete/list', color: 'from-blue-500 to-blue-600' },
      { icon: 'CalendarDays', label: '赛事编排', path: '/schedule/generate', color: 'from-purple-500 to-purple-600' },
      { icon: 'Trophy', label: '成绩录入', path: '/result/entry', color: 'from-amber-500 to-amber-600' },
      { icon: 'FlaskConical', label: '兴奋剂检测', path: '/doping/test', color: 'from-orange-500 to-orange-600' },
      { icon: 'ShieldAlert', label: '安保热力图', path: '/security/heatmap', color: 'from-red-500 to-red-600' },
      { icon: 'Stethoscope', label: '医疗调度', path: '/medical/dispatch', color: 'from-rose-500 to-rose-600' },
      { icon: 'Ticket', label: '票务订单', path: '/ticket/order', color: 'from-indigo-500 to-indigo-600' },
      { icon: 'HeartHandshake', label: '志愿者管理', path: '/volunteer/manage', color: 'from-emerald-500 to-emerald-600' },
    ],
    athlete: [
      { icon: 'CalendarCheck', label: '赛程日历', path: '/schedule/calendar', color: 'from-blue-500 to-blue-600' },
      { icon: 'Medal', label: '成绩排名', path: '/result/ranking', color: 'from-amber-500 to-amber-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-emerald-500 to-emerald-600' },
      { icon: 'Trophy', label: '奖牌榜', path: '/result/medal', color: 'from-yellow-500 to-yellow-600' },
    ],
    referee: [
      { icon: 'ClipboardList', label: '成绩录入', path: '/result/entry', color: 'from-blue-500 to-blue-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-purple-500 to-purple-600' },
      { icon: 'Trophy', label: '成绩排名', path: '/result/ranking', color: 'from-amber-500 to-amber-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-emerald-500 to-emerald-600' },
    ],
    volunteer: [
      { icon: 'MapPin', label: '岗位分配', path: '/volunteer/manage', color: 'from-blue-500 to-blue-600' },
      { icon: 'Clock', label: '签到打卡', path: '/volunteer/checkin', color: 'from-emerald-500 to-emerald-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-amber-500 to-amber-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-rose-500 to-rose-600' },
    ],
    security: [
      { icon: 'Map', label: '巡逻路线', path: '/security/patrol', color: 'from-blue-500 to-blue-600' },
      { icon: 'ThermometerSun', label: '热力图监控', path: '/security/heatmap', color: 'from-red-500 to-red-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-emerald-500 to-emerald-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-purple-500 to-purple-600' },
    ],
    medical: [
      { icon: 'Stethoscope', label: '医疗调度', path: '/medical/dispatch', color: 'from-red-500 to-red-600' },
      { icon: 'Activity', label: '伤病上报', path: '/medical/report', color: 'from-blue-500 to-blue-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-emerald-500 to-emerald-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-rose-500 to-rose-600' },
    ],
    audience: [
      { icon: 'Ticket', label: '购买门票', path: '/ticket/buy', color: 'from-amber-500 to-amber-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-blue-500 to-blue-600' },
      { icon: 'Trophy', label: '奖牌榜', path: '/result/medal', color: 'from-yellow-500 to-yellow-600' },
      { icon: 'ShoppingBag', label: '我的订单', path: '/ticket/order', color: 'from-emerald-500 to-emerald-600' },
    ],
    doping: [
      { icon: 'FlaskConical', label: '兴奋剂抽检', path: '/doping/test', color: 'from-blue-500 to-blue-600' },
      { icon: 'FileText', label: '检测结果', path: '/doping/result', color: 'from-purple-500 to-purple-600' },
      { icon: 'CalendarDays', label: '赛程日历', path: '/schedule/calendar', color: 'from-orange-500 to-orange-600' },
      { icon: 'UserCircle', label: '个人中心', path: '/profile', color: 'from-emerald-500 to-emerald-600' },
    ],
  };

  return actions[role] || actions.admin;
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    athletes,
    events,
    schedules,
    results,
    medalStanding,
    volunteers,
    securityPersonnel,
    notifications,
    medicalRecords,
    venues,
  } = useAppStore();

  const today = formatDate(new Date(), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    const totalGold = medalStanding.reduce((sum, m) => sum + m.gold, 0);
    const activeVolunteers = volunteers.filter(v => v.status === 'active').length;
    const onDutySecurity = securityPersonnel.filter(s => s.status === 'patrolling' || s.status === 'emergency').length;
    const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);
    const realtimeAudience = Math.floor(totalCapacity * 0.72);
    const todaySchedules = schedules.filter(s => s.date === today);

    return [
      {
        icon: <LucideIcons.Users className="w-6 h-6" />,
        value: athletes.length,
        label: '运动员总数',
        gradient: 'primary' as const,
        trend: { value: 12, isPositive: true },
      },
      {
        icon: <LucideIcons.Target className="w-6 h-6" />,
        value: events.length,
        label: '比赛项目数',
        gradient: 'tech' as const,
        trend: { value: 5, isPositive: true },
      },
      {
        icon: <LucideIcons.CalendarDays className="w-6 h-6" />,
        value: todaySchedules.length,
        label: '今日赛程数',
        gradient: 'orange' as const,
        trend: { value: 3, isPositive: true },
      },
      {
        icon: <LucideIcons.Medal className="w-6 h-6" />,
        value: totalGold,
        label: '已产生金牌数',
        gradient: 'gold' as const,
        trend: { value: 8, isPositive: true },
      },
      {
        icon: <LucideIcons.HeartHandshake className="w-6 h-6" />,
        value: activeVolunteers,
        label: '志愿者人数',
        gradient: 'success' as const,
        trend: { value: 15, isPositive: true },
      },
      {
        icon: <LucideIcons.Shield className="w-6 h-6" />,
        value: onDutySecurity,
        label: '安保在岗人数',
        gradient: 'danger' as const,
        trend: { value: 2, isPositive: true },
      },
      {
        icon: <LucideIcons.Eye className="w-6 h-6" />,
        value: realtimeAudience,
        label: '实时观众人数',
        gradient: 'primary' as const,
        trend: { value: 5, isPositive: true },
      },
      {
        icon: <LucideIcons.Stethoscope className="w-6 h-6" />,
        value: medicalRecords.length,
        label: '医疗处理次数',
        gradient: 'tech' as const,
        trend: { value: 3, isPositive: false },
      },
    ];
  }, [athletes, events, schedules, medalStanding, volunteers, securityPersonnel, medicalRecords, venues, today]);

  const scheduleTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date, 'yyyy-MM-dd');
      const daySchedules = schedules.filter(s => s.date === dateStr);
      const completed = daySchedules.filter(s => s.status === 'completed').length;
      const ongoing = daySchedules.filter(s => s.status === 'ongoing').length;
      const scheduled = daySchedules.filter(s => s.status === 'scheduled').length;
      data.push({
        date: formatDate(date, 'MM/dd'),
        已完成: completed,
        进行中: ongoing,
        未开始: scheduled,
      });
    }
    return data;
  }, [schedules]);

  const medalDistributionData = useMemo(() => {
    const eventMedals: Record<string, { name: string; value: number }> = {};
    results.filter(r => r.medal).forEach(r => {
      const eventName = events.find(e => e.id === r.scheduleId)?.category || '其他';
      if (!eventMedals[eventName]) {
        eventMedals[eventName] = { name: eventName, value: 0 };
      }
      eventMedals[eventName].value++;
    });
    return Object.values(eventMedals);
  }, [results, events]);

  const todaySchedules = useMemo(() => {
    return schedules
      .filter(s => s.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 6);
  }, [schedules, today]);

  const topMedalStandings = useMemo(() => {
    return medalStanding.slice(0, 5);
  }, [medalStanding]);

  const quickActions = useMemo(() => {
    return currentUser ? getQuickActions(currentUser.role) : getQuickActions('admin');
  }, [currentUser]);

  const unreadNotifications = useMemo(() => {
    return notifications
      .filter(n => !n.isRead)
      .slice(0, 3);
  }, [notifications]);

  const getRankStyle = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, typeof LucideIcons.Info> = {
      system: LucideIcons.Bell,
      schedule: LucideIcons.Calendar,
      result: LucideIcons.Trophy,
      medical: LucideIcons.HeartPulse,
      security: LucideIcons.ShieldAlert,
      ticket: LucideIcons.Ticket,
      doping: LucideIcons.FlaskConical,
    };
    const Icon = iconMap[type] || LucideIcons.Info;
    return <Icon className="w-5 h-5" />;
  };

  const getNotificationColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      system: 'bg-blue-100 text-blue-600',
      schedule: 'bg-purple-100 text-purple-600',
      result: 'bg-amber-100 text-amber-600',
      medical: 'bg-red-100 text-red-600',
      security: 'bg-orange-100 text-orange-600',
      ticket: 'bg-green-100 text-green-600',
      doping: 'bg-slate-100 text-slate-600',
    };
    return colorMap[type] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="数据总览"
        description={`欢迎回来，${currentUser ? currentUser.name : '管理员'}！今天是 ${formatDate(new Date(), 'yyyy年MM月dd日 EEEE')}`}
        icon={LucideIcons.LayoutDashboard}
        actions={
          <button
            onClick={() => navigate('/messages')}
            className="relative p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <LucideIcons.Bell className="w-5 h-5 text-slate-600" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        }
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              value={<AnimatedNumber value={stat.value} />}
              label={stat.label}
              trend={stat.trend}
              gradient={stat.gradient}
              onClick={() => console.log(`Clicked ${stat.label}`)}
            />
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">近7日赛程趋势</h3>
                <p className="text-sm text-slate-500 mt-0.5">每日比赛场次统计</p>
              </div>
              <LucideIcons.TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scheduleTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="已完成" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="进行中" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="未开始" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">各项目奖牌分布</h3>
                <p className="text-sm text-slate-500 mt-0.5">按项目类别统计</p>
              </div>
              <LucideIcons.PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={medalDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {medalDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">今日赛程</h3>
                <p className="text-sm text-slate-500 mt-0.5">共 {todaySchedules.length} 场比赛</p>
              </div>
              <button
                onClick={() => navigate('/schedule/calendar')}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                查看全部
                <LucideIcons.ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <LucideIcons.CalendarX className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>今日暂无比赛安排</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((schedule) => {
                  const status = getStatusLabel(schedule.status);
                  return (
                    <motion.div
                      key={schedule.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/schedule/calendar')}
                    >
                      <div className="text-center min-w-16">
                        <p className="text-lg font-bold text-slate-900">{schedule.startTime}</p>
                        <p className="text-xs text-slate-500">{schedule.endTime}</p>
                      </div>
                      <div className="w-1 h-12 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{schedule.eventName}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <LucideIcons.MapPin className="w-3.5 h-3.5" />
                          {schedule.venueName}
                        </p>
                      </div>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                        status.className
                      )}>
                        {status.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">奖牌榜</h3>
                <p className="text-sm text-slate-500 mt-0.5">前5名国家/地区</p>
              </div>
              <button
                onClick={() => navigate('/result/medal')}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                完整榜单
                <LucideIcons.ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {topMedalStandings.map((standing, index) => (
                <motion.div
                  key={standing.countryCode}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    index < 3 ? getRankStyle(standing.rank) : 'bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                    index < 3 ? 'bg-white/20' : getRankStyle(standing.rank)
                  )}>
                    {standing.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getFlagEmoji(standing.countryCode)}</span>
                      <span className={cn(
                        'font-semibold truncate',
                        index < 3 ? 'text-white' : 'text-slate-900'
                      )}>
                        {standing.country}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn(
                      'font-bold min-w-6 text-right',
                      index < 3 ? 'text-white' : ''
                    )} style={index >= 3 ? { color: getMedalColor('gold') } : {}}>
                      {standing.gold}
                    </span>
                    <span className={cn(
                      'font-bold min-w-6 text-right',
                      index < 3 ? 'text-white/90' : ''
                    )} style={index >= 3 ? { color: getMedalColor('silver') } : {}}>
                      {standing.silver}
                    </span>
                    <span className={cn(
                      'font-bold min-w-6 text-right',
                      index < 3 ? 'text-white/80' : ''
                    )} style={index >= 3 ? { color: getMedalColor('bronze') } : {}}>
                      {standing.bronze}
                    </span>
                    <span className={cn(
                      'font-bold min-w-8 text-right',
                      index < 3 ? 'text-white' : 'text-slate-900'
                    )}>
                      {standing.total}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('gold') }} />
                金
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('silver') }} />
                银
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('bronze') }} />
                铜
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                总计
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">快捷操作</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  当前角色：{currentUser ? getRoleName(currentUser.role) : '系统管理员'}
                </p>
              </div>
              <LucideIcons.Grid3X3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = LucideIcons[action.icon] as typeof LucideIcons.LayoutDashboard;
                return (
                  <motion.button
                    key={action.label}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(action.path)}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                  >
                    <div className={cn(
                      'p-3.5 rounded-xl bg-gradient-to-br text-white shadow-lg shadow-blue-500/20',
                      action.color
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                      {action.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">最近消息</h3>
                <p className="text-sm text-slate-500 mt-0.5">{unreadNotifications.length} 条未读</p>
              </div>
              <button
                onClick={() => navigate('/messages')}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                全部
                <LucideIcons.ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {unreadNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <LucideIcons.CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p>暂无未读消息</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      useAppStore.getState().markNotificationAsRead(notification.id);
                      navigate('/notifications');
                    }}
                    className="flex gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div className={cn(
                      'p-2.5 rounded-xl h-fit',
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDate(notification.createdAt, 'MM-dd HH:mm')}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
