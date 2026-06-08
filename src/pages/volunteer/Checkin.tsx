import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatDate, formatTime, exportToPDF } from '@/utils';
import { cn } from '@/lib/utils';
import type { CheckIn, Volunteer } from '@/types';

const stations = [
  { id: 'station-entrance', name: '场馆入口', location: 'A馆1号门', time: '08:00-12:00', duty: '负责观众引导、入场检查' },
  { id: 'station-audience', name: '观众区', location: 'B馆观众席', time: '09:00-18:00', duty: '维护秩序、提供咨询服务' },
  { id: 'station-media', name: '媒体区', location: 'C馆媒体中心', time: '10:00-22:00', duty: '协助媒体工作、翻译服务' },
  { id: 'station-athlete', name: '运动员区', location: 'D馆运动员村', time: '06:00-20:00', duty: '运动员引导、后勤服务' },
  { id: 'station-vip', name: 'VIP区', location: 'E馆贵宾厅', time: '12:00-20:00', duty: '贵宾接待、礼仪服务' },
  { id: 'station-medical', name: '医疗站', location: 'F馆医疗中心', time: '24小时', duty: '医疗协助、应急处理' },
  { id: 'station-tech', name: '技术支持', location: 'G馆技术中心', time: '08:00-22:00', duty: '设备维护、技术支持' },
];

const skillLabels: Record<string, string> = {
  translation: '翻译',
  guidance: '引导',
  medical: '医疗',
  technical: '技术',
  etiquette: '礼仪',
  security: '安保协助',
  photography: '摄影',
  logistics: '后勤',
};

export default function VolunteerCheckin() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [activeCheckIn, setActiveCheckIn] = useState<CheckIn | null>(null);
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { currentUser, volunteers, checkIn, checkOut, getServiceHours } = useAppStore();
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      const volunteer = volunteers.find((v) => v.id === currentUser.id || v.username === currentUser.username);
      if (volunteer) {
        setCurrentVolunteer(volunteer);
        const active = volunteer.checkIns.find((c) => !c.checkOutTime);
        setActiveCheckIn(active || null);

        if (active) {
          const checkInTime = new Date(active.checkInTime).getTime();
          const now = Date.now();
          setElapsedTime(Math.floor((now - checkInTime) / 1000));
        }
      }
    }
  }, [currentUser, volunteers]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (activeCheckIn) {
      timer = setInterval(() => {
        const checkInTime = new Date(activeCheckIn.checkInTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - checkInTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCheckIn]);

  const totalHours = useMemo(() => {
    if (!currentVolunteer) return 0;
    return getServiceHours(currentVolunteer.id);
  }, [currentVolunteer, getServiceHours]);

  const todayStation = useMemo(() => {
    if (!currentVolunteer?.assignedStation) return null;
    return stations.find((s) => s.id === currentVolunteer.assignedStation);
  }, [currentVolunteer]);

  const sortedCheckIns = useMemo(() => {
    if (!currentVolunteer) return [];
    return [...currentVolunteer.checkIns].sort(
      (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    );
  }, [currentVolunteer]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [calendarMonth]);

  const checkedInDates = useMemo(() => {
    if (!currentVolunteer) return new Set<string>();
    return new Set(
      currentVolunteer.checkIns
        .filter((c) => c.checkOutTime)
        .map((c) => formatDate(c.checkInTime, 'yyyy-MM-dd'))
    );
  }, [currentVolunteer]);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCheckIn = () => {
    if (!currentVolunteer?.assignedStation) {
      showToast('error', '您还没有分配岗位，请联系管理员');
      return;
    }

    const newCheckIn = checkIn(currentVolunteer.id, currentVolunteer.assignedStation);
    setActiveCheckIn(newCheckIn);
    setElapsedTime(0);
    showToast('success', '签到成功，祝您服务愉快！');
  };

  const handleCheckOut = () => {
    setShowRatingModal(true);
  };

  const confirmCheckOut = () => {
    if (!activeCheckIn) return;

    checkOut(activeCheckIn.id, rating || undefined);
    setActiveCheckIn(null);
    setElapsedTime(0);
    setShowRatingModal(false);
    setRating(0);
    showToast('success', '签退成功，感谢您的服务！');
  };

  const handleDownloadProof = () => {
    try {
      exportToPDF('volunteer-service-proof', `服务证明_${currentVolunteer?.name || ''}`);
      showToast('success', '服务证明已下载');
    } catch {
      showToast('error', '下载失败，请重试');
    }
  };

  const getStationName = (id: string) => {
    return stations.find((s) => s.id === id)?.name || '未知岗位';
  };

  const isTodayCheckedIn = (day: number | null) => {
    if (!day) return false;
    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return checkedInDates.has(dateStr);
  };

  const QRCode = () => (
    <div className="flex flex-col items-center">
      <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-lg border border-gray-200">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-0.5">
          {Array.from({ length: 64 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isCorner = (row < 2 || row >= 6) && (col < 2 || col >= 6);
            const isTimingPattern = (row === 2 || row === 5) && col >= 2 && col <= 5;
            const isRandom = (i + row + col) % 3 === 0;

            return (
              <div
                key={i}
                className={cn(
                  'rounded-sm',
                  (isCorner || isTimingPattern || isRandom)
                    ? 'bg-gray-900'
                    : 'bg-white'
                )}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-500">扫码完成签到</p>
      <p className="text-xs text-gray-400 mt-1">
        {currentVolunteer?.id || 'VOL-001'}
      </p>
    </div>
  );

  const StarRating = () => (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className="p-1 transition-transform hover:scale-110"
        >
          <LucideIcons.Star
            className={cn(
              'w-10 h-10 transition-colors',
              star <= rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="志愿者签到"
        description="签到签退、服务计时、服务记录查询"
        icon={LucideIcons.QrCode}
        showBackButton
        actions={
          <button
            onClick={() => setShowProofModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LucideIcons.Download className="w-4 h-4" />
            服务证明
          </button>
        }
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {todayStation && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <LucideIcons.Calendar className="w-5 h-5 opacity-80" />
                  <span className="opacity-80">今日岗位</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                    {formatDate(currentTime, 'MM月dd日')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-3">{todayStation.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm opacity-90">
                  <div className="flex items-center gap-2">
                    <LucideIcons.MapPin className="w-4 h-4" />
                    {todayStation.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <LucideIcons.Clock className="w-4 h-4" />
                    {todayStation.time}
                  </div>
                </div>
                <p className="mt-3 text-sm opacity-80">
                  <LucideIcons.Info className="w-4 h-4 inline mr-1" />
                  {todayStation.duty}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold mb-1">
                  {formatTime(currentTime)}
                </div>
                <p className="text-sm opacity-80">
                  {formatDate(currentTime, 'EEEE')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {activeCheckIn ? '服务进行中' : '扫码签到'}
              </h3>

              {!activeCheckIn ? (
                <div className="space-y-6">
                  <QRCode />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckIn}
                    disabled={!currentVolunteer?.assignedStation}
                    className={cn(
                      'w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg',
                      currentVolunteer?.assignedStation
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30'
                        : 'bg-gray-300 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <LucideIcons.ArrowRightCircle className="w-6 h-6" />
                      一键签到
                    </div>
                  </motion.button>
                  {!currentVolunteer?.assignedStation && (
                    <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                      <LucideIcons.AlertTriangle className="w-4 h-4" />
                      您还没有分配岗位
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto relative">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                          fill="none"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={351.86}
                          strokeDashoffset={351.86 - (351.86 * (elapsedTime % 3600)) / 3600}
                          initial={false}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#A855F7" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-mono font-bold text-gray-900">
                          {formatElapsedTime(elapsedTime)}
                        </span>
                        <span className="text-xs text-gray-500">服务时长</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">签到时间</p>
                      <p className="font-mono font-bold text-gray-900">
                        {formatTime(activeCheckIn.checkInTime)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">服务岗位</p>
                      <p className="font-bold text-primary-600">
                        {getStationName(activeCheckIn.stationId)}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckOut}
                    className="w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/30"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <LucideIcons.LogOut className="w-6 h-6" />
                      一键签退
                    </div>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">服务统计</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl p-4 text-white">
                <LucideIcons.Clock className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-sm opacity-80">总服务时长（小时）</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                <LucideIcons.CalendarCheck className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{currentVolunteer?.checkIns.length || 0}</p>
                <p className="text-sm opacity-80">累计服务次数</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">签到日历</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <LucideIcons.ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-24 text-center">
                    {formatDate(calendarMonth, 'yyyy年MM月')}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <LucideIcons.ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      'aspect-square flex items-center justify-center text-sm rounded-lg',
                      day ? (
                        isTodayCheckedIn(day)
                          ? 'bg-green-500 text-white font-medium'
                          : 'hover:bg-gray-100 cursor-default'
                      ) : ''
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">已签到</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                <span className="text-sm text-gray-600">未签到</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">历史签到记录</h3>
              <span className="text-sm text-gray-500">共 {sortedCheckIns.length} 条记录</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">岗位</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">签到时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">签退时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">服务时长</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">评价</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {sortedCheckIns.slice(0, 10).map((checkIn) => (
                  <tr key={checkIn.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="text-gray-900">{formatDate(checkIn.checkInTime, 'yyyy-MM-dd')}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-600">{getStationName(checkIn.stationId)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-600 font-mono">{formatTime(checkIn.checkInTime)}</span>
                    </td>
                    <td className="px-4 py-4">
                      {checkIn.checkOutTime ? (
                        <span className="text-gray-600 font-mono">{formatTime(checkIn.checkOutTime)}</span>
                      ) : (
                        <span className="text-amber-600">服务中</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {checkIn.duration ? (
                        <span className="font-medium text-primary-600">{checkIn.duration} 小时</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {checkIn.rating ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <LucideIcons.Star
                              key={i}
                              className={cn(
                                'w-4 h-4',
                                i < checkIn.rating!
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {checkIn.checkOutTime ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          已完成
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          服务中
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedCheckIns.length === 0 && (
            <div className="text-center py-12">
              <LucideIcons.ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无签到记录</p>
            </div>
          )}
        </motion.div>
      </div>

      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        className="max-w-md"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LucideIcons.MessageSquareHeart className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">完成服务</h3>
          <p className="text-gray-500 mb-6">请对您今天的服务体验进行评价（可选）</p>

          <div className="mb-6">
            <StarRating />
            {rating > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {rating === 1 && '很不满意'}
                {rating === 2 && '不满意'}
                {rating === 3 && '一般'}
                {rating === 4 && '满意'}
                {rating === 5 && '非常满意'}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setRating(0);
                confirmCheckOut();
              }}
              className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              跳过评价
            </button>
            <button
              onClick={confirmCheckOut}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-700 transition-all"
            >
              确认签退
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        className="max-w-2xl"
      >
        {currentVolunteer && (
          <div className="p-6">
            <div id="volunteer-service-proof" className="bg-white p-8 rounded-xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LucideIcons.Award className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">志愿服务证明</h1>
                <p className="text-gray-500 mt-1">Volunteer Service Certificate</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">姓名</span>
                  <span className="font-medium text-gray-900">{currentVolunteer.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">邮箱</span>
                  <span className="font-medium text-gray-900">{currentVolunteer.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">服务岗位</span>
                  <span className="font-medium text-gray-900">
                    {getStationName(currentVolunteer.assignedStation!)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">技能特长</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {currentVolunteer.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                      >
                        {skillLabels[skill] || skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">总服务时长</span>
                  <span className="font-bold text-primary-600 text-lg">
                    {totalHours.toFixed(1)} 小时
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">服务次数</span>
                  <span className="font-medium text-gray-900">
                    {currentVolunteer.checkIns.filter((c) => c.checkOutTime).length} 次
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">认证日期</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(new Date(), 'yyyy年MM月dd日')}
                  </span>
                </div>
              </div>

              <div className="text-center text-gray-500 text-sm">
                <p>此证明由大型综合性运动会智慧管理系统自动生成</p>
                <p className="mt-1">本证明具有同等法律效力</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProofModal(false)}
                className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleDownloadProof}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-700 transition-all"
              >
                <LucideIcons.Download className="w-4 h-4" />
                下载PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
