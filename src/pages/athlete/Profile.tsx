import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { cn, formatDate, getMedalColor } from '@/utils';
import type { Athlete, HistoricalRecord, Result, Schedule, Notification } from '@/types';

const editProfileSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().min(1, '请输入电话号码'),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

export default function AthleteProfile() {
  const { currentUser, athletes, results, schedules, notifications, events, updateAthlete } =
    useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'records' | 'schedule' | 'results' | 'notifications'>('info');
  const [editModal, setEditModal] = useState(false);

  const athlete = useMemo(() => {
    if (!currentUser) return null;
    return athletes.find((a) => a.id === currentUser.id) || null;
  }, [currentUser, athletes]);

  const athleteResults = useMemo(() => {
    if (!athlete) return [];
    return results.filter((r) => r.athleteId === athlete.id || r.athleteId === athlete.athleteId);
  }, [athlete, results]);

  const athleteSchedules = useMemo(() => {
    if (!athlete) return [];
    return schedules.filter(
      (s) => s.athletes.includes(athlete.id) || s.athletes.includes(athlete.athleteId)
    );
  }, [athlete, schedules]);

  const athleteNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => n.recipientId === currentUser.id || n.recipientId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [currentUser, notifications]);

  const stats = useMemo(() => {
    const goldCount = athleteResults.filter((r) => r.medal === 'gold').length;
    const silverCount = athleteResults.filter((r) => r.medal === 'silver').length;
    const bronzeCount = athleteResults.filter((r) => r.medal === 'bronze').length;
    const upcomingSchedule = athleteSchedules.filter((s) => s.status === 'scheduled').length;
    const recordCount = athlete?.historicalRecords.filter((r) => r.isRecord).length || 0;

    return [
      {
        icon: <LucideIcons.Target className="w-6 h-6" />,
        value: athlete?.events.length || 0,
        label: '参赛项目',
        gradient: 'primary' as const,
      },
      {
        icon: <LucideIcons.Medal className="w-6 h-6" />,
        value: goldCount + silverCount + bronzeCount,
        label: '获得奖牌',
        gradient: 'gold' as const,
      },
      {
        icon: <LucideIcons.CalendarCheck className="w-6 h-6" />,
        value: upcomingSchedule,
        label: '待比赛程',
        gradient: 'tech' as const,
      },
      {
        icon: <LucideIcons.Award className="w-6 h-6" />,
        value: recordCount,
        label: '破纪录次数',
        gradient: 'orange' as const,
      },
    ];
  }, [athlete, athleteResults, athleteSchedules]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: athlete?.name || '',
      email: athlete?.email || '',
      phone: athlete?.phone || '',
    },
  });

  const handleOpenEditModal = () => {
    if (athlete) {
      reset({
        name: athlete.name,
        email: athlete.email,
        phone: athlete.phone,
      });
      setEditModal(true);
    }
  };

  const onSubmitEdit = (data: EditProfileValues) => {
    if (athlete) {
      updateAthlete(athlete.id, data);
      showToast('success', '个人信息已更新');
      setEditModal(false);
    }
  };

  const getScheduleStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      scheduled: { text: '未开始', className: 'bg-blue-100 text-blue-700' },
      ongoing: { text: '进行中', className: 'bg-green-100 text-green-700 animate-pulse' },
      completed: { text: '已完成', className: 'bg-gray-100 text-gray-600' },
      cancelled: { text: '已取消', className: 'bg-red-100 text-red-700' },
    };
    const config = statusMap[status] || statusMap.scheduled;
    return (
      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
        {config.text}
      </span>
    );
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, typeof LucideIcons.Info> = {
      registration: LucideIcons.UserCheck,
      schedule: LucideIcons.Calendar,
      result: LucideIcons.Trophy,
      medical: LucideIcons.HeartPulse,
      security: LucideIcons.ShieldAlert,
      ticket: LucideIcons.Ticket,
      doping: LucideIcons.FlaskConical,
      system: LucideIcons.Bell,
    };
    return iconMap[type] || LucideIcons.Info;
  };

  const getNotificationColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      registration: 'bg-green-100 text-green-600',
      schedule: 'bg-purple-100 text-purple-600',
      result: 'bg-amber-100 text-amber-600',
      medical: 'bg-red-100 text-red-600',
      security: 'bg-orange-100 text-orange-600',
      ticket: 'bg-blue-100 text-blue-600',
      doping: 'bg-slate-100 text-slate-600',
      system: 'bg-slate-100 text-slate-600',
    };
    return colorMap[type] || 'bg-slate-100 text-slate-600';
  };

  const historicalColumns = [
    { key: 'eventName', header: '项目', sortable: true },
    { key: 'result', header: '成绩', sortable: true },
    { key: 'date', header: '日期', sortable: true },
    { key: 'competition', header: '赛事', sortable: true },
    {
      key: 'isRecord',
      header: '破纪录',
      align: 'center' as const,
      render: (value: unknown) =>
        value ? (
          <LucideIcons.Award className="w-5 h-5 text-amber-500 mx-auto" />
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
  ];

  const scheduleColumns = [
    { key: 'eventName', header: '项目', sortable: true },
    { key: 'venueName', header: '场馆', sortable: true },
    { key: 'date', header: '日期', sortable: true },
    {
      key: 'time',
      header: '时间',
      render: (_: unknown, row: Schedule) => `${row.startTime} - ${row.endTime}`,
    },
    { key: 'round', header: '轮次' },
    {
      key: 'status',
      header: '状态',
      render: (value: unknown) => getScheduleStatusBadge(value as string),
    },
  ];

  const resultColumns = [
    { key: 'eventName', header: '项目', sortable: true },
    {
      key: 'result',
      header: '成绩',
      render: (value: unknown) => <span className="font-mono">{value as string}</span>,
    },
    {
      key: 'rank',
      header: '排名',
      align: 'center' as const,
      render: (value: unknown) => {
        const rank = value as number;
        let bgClass = 'bg-gray-100 text-gray-600';
        if (rank === 1) bgClass = 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
        else if (rank === 2) bgClass = 'bg-gradient-to-r from-slate-300 to-slate-400 text-white';
        else if (rank === 3) bgClass = 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
        return (
          <span
            className={cn(
              'inline-flex w-8 h-8 items-center justify-center rounded-full font-bold text-sm',
              bgClass
            )}
          >
            {rank}
          </span>
        );
      },
    },
    {
      key: 'medal',
      header: '奖牌',
      align: 'center' as const,
      render: (value: unknown) => {
        const medal = value as string;
        if (!medal) return <span className="text-gray-300">-</span>;
        return (
          <span
            className="inline-flex w-8 h-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${getMedalColor(medal)}20`, color: getMedalColor(medal) }}
          >
            <LucideIcons.Medal className="w-4 h-4" />
          </span>
        );
      },
    },
    {
      key: 'isRecord',
      header: '破纪录',
      align: 'center' as const,
      render: (value: unknown) =>
        value ? (
          <LucideIcons.Award className="w-5 h-5 text-amber-500 mx-auto" />
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    { key: 'createdAt', header: '日期', sortable: true },
  ];

  const tabs = [
    { id: 'info', name: '个人信息', icon: LucideIcons.User },
    { id: 'records', name: '历史成绩', icon: LucideIcons.Trophy },
    { id: 'schedule', name: '参赛赛程', icon: LucideIcons.CalendarDays },
    { id: 'results', name: '比赛成绩', icon: LucideIcons.Medal },
    { id: 'notifications', name: '消息通知', icon: LucideIcons.Bell },
  ];

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LucideIcons.UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">未找到运动员信息</p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="个人中心"
        description="查看和管理您的个人信息、比赛成绩和通知"
        icon={LucideIcons.UserCircle}
        actions={
          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            <LucideIcons.Edit3 className="w-4 h-4" />
            编辑信息
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
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              gradient={stat.gradient}
            />
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2',
                      isActive
                        ? 'text-primary-600 border-primary-500 bg-primary-50/50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                    {tab.id === 'notifications' && athleteNotifications.filter((n) => !n.isRead).length > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {athleteNotifications.filter((n) => !n.isRead).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-shrink-0 text-center">
                    <div className="relative inline-block">
                      <img
                        src={athlete.avatar}
                        alt={athlete.name}
                        className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                      />
                      <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-gradient-to-r from-primary-500 to-purple-600 text-white text-xs font-bold rounded-full">
                        {athlete.countryCode}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mt-4">{athlete.name}</h2>
                    <p className="text-gray-500 mt-1">
                      {athlete.gender === 'male' ? '男' : '女'} · {athlete.age}岁
                    </p>
                    <p className="text-sm text-gray-400 font-mono mt-1">{athlete.athleteId}</p>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">国籍</p>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="text-xl">{getFlagEmoji(athlete.countryCode)}</span>
                          {athlete.country}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">出生日期</p>
                        <p className="font-medium text-gray-900">{athlete.birthDate}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">邮箱</p>
                        <p className="font-medium text-gray-900">{athlete.email}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">电话</p>
                        <p className="font-medium text-gray-900">{athlete.phone}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <LucideIcons.Target className="w-4 h-4 text-blue-500" />
                        参赛项目
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {athlete.events.length === 0 ? (
                          <span className="text-gray-400 text-sm">暂无参赛项目</span>
                        ) : (
                          athlete.events.map((eventId) => {
                            const event = events.find((e) => e.id === eventId);
                            return (
                              <span
                                key={eventId}
                                className="inline-flex items-center px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                              >
                                {event?.name || eventId}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <LucideIcons.FileCheck className="w-4 h-4 text-green-500" />
                        审核状态
                      </h4>
                      {athlete.status === 'pending' && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                          <LucideIcons.Clock className="w-5 h-5" />
                          <span className="font-medium">审核中 - 请等待管理员审核您的注册申请</span>
                        </div>
                      )}
                      {athlete.status === 'approved' && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700">
                          <LucideIcons.CheckCircle className="w-5 h-5" />
                          <span className="font-medium">已通过 - 您的注册申请已通过审核</span>
                        </div>
                      )}
                      {athlete.status === 'rejected' && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                          <LucideIcons.XCircle className="w-5 h-5" />
                          <span className="font-medium">已拒绝 - 您的注册申请未通过审核</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'records' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">历史比赛成绩</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      共 {athlete.historicalRecords.length} 条历史成绩记录
                    </p>
                  </div>
                </div>
                <DataTable
                  columns={historicalColumns}
                  data={athlete.historicalRecords as HistoricalRecord[]}
                  pageSize={5}
                  rowKey="id"
                />
              </motion.div>
            )}

            {activeTab === 'schedule' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">参赛赛程</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      共 {athleteSchedules.length} 场比赛安排
                    </p>
                  </div>
                </div>
                <DataTable
                  columns={scheduleColumns}
                  data={athleteSchedules}
                  pageSize={5}
                  rowKey="id"
                />
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">比赛成绩</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      本次运动会的比赛成绩，共 {athleteResults.length} 条记录
                    </p>
                  </div>
                  {athleteResults.length > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('gold') }} />
                        <span className="text-gray-600">
                          金牌 {athleteResults.filter((r) => r.medal === 'gold').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('silver') }} />
                        <span className="text-gray-600">
                          银牌 {athleteResults.filter((r) => r.medal === 'silver').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('bronze') }} />
                        <span className="text-gray-600">
                          铜牌 {athleteResults.filter((r) => r.medal === 'bronze').length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <DataTable
                  columns={resultColumns}
                  data={athleteResults as Result[]}
                  pageSize={5}
                  rowKey="id"
                />
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">消息通知</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {athleteNotifications.filter((n) => !n.isRead).length} 条未读消息
                    </p>
                  </div>
                </div>

                {athleteNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <LucideIcons.BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无消息通知</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {athleteNotifications.map((notification) => {
                      const NotificationIcon = getNotificationIcon(notification.type);
                      return (
                        <motion.div
                          key={notification.id}
                          whileHover={{ x: 4 }}
                          className={cn(
                            'flex gap-4 p-4 rounded-xl transition-colors cursor-pointer',
                            notification.isRead ? 'bg-gray-50' : 'bg-primary-50 border border-primary-100'
                          )}
                        >
                          <div
                            className={cn(
                              'p-2.5 rounded-xl h-fit',
                              getNotificationColor(notification.type)
                            )}
                          >
                            <NotificationIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={cn(
                                'font-medium truncate',
                                notification.isRead ? 'text-gray-700' : 'text-gray-900'
                              )}>
                                {notification.title}
                              </h4>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatDate(notification.createdAt, 'MM-dd HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{notification.content}</p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="编辑个人信息"
        className="max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              {...register('name')}
              className={cn(
                'w-full px-4 py-3 rounded-xl border transition-colors',
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
              )}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              {...register('email')}
              className={cn(
                'w-full px-4 py-3 rounded-xl border transition-colors',
                errors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
              )}
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">电话</label>
            <input
              type="tel"
              {...register('phone')}
              className={cn(
                'w-full px-4 py-3 rounded-xl border transition-colors',
                errors.phone
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
              )}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <LucideIcons.Info className="w-3.5 h-3.5" />
              运动员ID、国籍、性别等信息不可修改，如有需要请联系管理员
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              保存修改
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
