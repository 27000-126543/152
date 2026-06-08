import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatTime, exportToPDF } from '@/utils';
import type { Notification, NotificationType } from '@/types';

const {
  Bell,
  User,
  Calendar,
  Trophy,
  AlertTriangle,
  Ticket,
  HeartPulse,
  Settings,
  CheckCheck,
  Trash2,
  Download,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Clock,
  Search,
  Filter,
  Check,
  CheckCircle,
  Square,
  CheckSquare,
  FileText,
  Award,
  QrCode,
  Stethoscope,
  FileCheck,
  FlaskConical,
  MapPin,
  Users,
  Mail,
  Smartphone,
  Moon,
  Sun,
  ExternalLink,
} = LucideIcons;

const typeFilters: { key: NotificationType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'registration', label: '注册通知' },
  { key: 'schedule', label: '赛程通知' },
  { key: 'result', label: '成绩通知' },
  { key: 'doping', label: '检测通知' },
  { key: 'ticket', label: '票务通知' },
  { key: 'medical', label: '医疗通知' },
  { key: 'system', label: '系统通知' },
];

const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' },
];

const getTypeConfig = (type: NotificationType) => {
  const config: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string; borderColor: string }> = {
    registration: { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    schedule: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    result: { icon: Trophy, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    doping: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    ticket: { icon: Ticket, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    medical: { icon: HeartPulse, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
    system: { icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  };
  return config[type] || config.system;
};

const getCertificateConfig = (notification: Notification) => {
  const certMap: Partial<Record<NotificationType, { title: string; icon: typeof FileText; canDownload: boolean }>> = {
    registration: { title: '参赛证', icon: Award, canDownload: true },
    schedule: { title: '赛程表', icon: Calendar, canDownload: true },
    result: { title: '成绩单', icon: FileCheck, canDownload: true },
    doping: { title: '检测报告', icon: FlaskConical, canDownload: true },
    ticket: { title: '门票', icon: QrCode, canDownload: true },
    medical: { title: '医疗凭证', icon: Stethoscope, canDownload: true },
  };
  return certMap[notification.type] || { title: '凭证', icon: FileText, canDownload: false };
};

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    schedules,
    results,
    ticketOrders,
    medicalRecords,
    dopingTests,
    athletes,
  } = useAppStore();
  const { showToast } = useToast();

  const [activeType, setActiveType] = useState<NotificationType | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showCertificate, setShowCertificate] = useState<Notification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<Record<NotificationType, boolean>>({
    registration: true,
    schedule: true,
    result: true,
    doping: true,
    ticket: true,
    medical: true,
    system: true,
  });
  const [emailNotification, setEmailNotification] = useState(true);
  const [pushNotification, setPushNotification] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState({
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  });
  const [newMessage, setNewMessage] = useState<Notification | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [downloadingNotification, setDownloadingNotification] = useState<Notification | null>(null);
  const processedNotificationIdRef = useRef<string | null>(null);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(
      (n) => n.recipientId === currentUser.id || n.recipientId === 'all'
    );
  }, [notifications, currentUser]);

  const filteredNotifications = useMemo(() => {
    return userNotifications.filter((n) => {
      const matchesType = activeType === 'all' || n.type === activeType;
      const matchesStatus =
        activeStatus === 'all' ||
        (activeStatus === 'unread' && !n.isRead) ||
        (activeStatus === 'read' && n.isRead);
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [userNotifications, activeType, activeStatus, searchQuery]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    typeFilters.forEach((tab) => {
      if (tab.key === 'all') return;
      counts[tab.key] = userNotifications.filter((n) => !n.isRead && n.type === tab.key).length;
      counts.all += counts[tab.key];
    });
    return counts;
  }, [userNotifications]);

  const isUrgent = (notification: Notification) => {
    return notification.type === 'doping' || notification.type === 'medical';
  };

  const getNavigatePath = (notification: Notification): string | null => {
    switch (notification.type) {
      case 'registration':
        return '/athlete/list';
      case 'schedule':
        return '/schedule/calendar';
      case 'result':
        return '/result/ranking';
      case 'doping':
        return '/doping/result';
      case 'ticket':
        return '/ticket/order';
      case 'medical':
        return '/medical/dispatch';
      default:
        return null;
    }
  };

  const handleNavigateToDetail = (notification: Notification) => {
    const path = getNavigatePath(notification);
    if (path) {
      navigate(path);
    } else {
      showToast('info', '暂无相关页面');
    }
  };

  const getRelatedEntity = (notification: Notification) => {
    if (!notification.relatedEntityId || !notification.relatedEntityType) return null;

    switch (notification.relatedEntityType) {
      case 'schedule':
        return schedules.find((s) => s.id === notification.relatedEntityId) ?? null;
      case 'result':
        return results.find((r) => r.id === notification.relatedEntityId) ?? null;
      case 'ticketOrder':
        return ticketOrders.find((t) => t.id === notification.relatedEntityId) ?? null;
      case 'medicalRecord':
        return medicalRecords.find((m) => m.id === notification.relatedEntityId) ?? null;
      case 'dopingTest':
        return dopingTests.find((d) => d.id === notification.relatedEntityId) ?? null;
      case 'athlete':
        return athletes.find((a) => a.id === notification.relatedEntityId) ?? null;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (
        !latest.isRead &&
        (latest.recipientId === currentUser?.id || latest.recipientId === 'all')
      ) {
        setNewMessage(latest);
        if (soundEnabled && notificationSettings[latest.type]) {
          const audio = new Audio(
            'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQcAQNHWpXYRAPv/+/sA'
          );
          audio.play().catch(() => {});
        }
        const timer = setTimeout(() => setNewMessage(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications.length, currentUser, soundEnabled, notificationSettings]);

  useEffect(() => {
    const state = location.state as { notificationId?: string } | null;
    if (state?.notificationId && state.notificationId !== processedNotificationIdRef.current) {
      const notification = notifications.find(n => n.id === state.notificationId);
      if (notification) {
        processedNotificationIdRef.current = state.notificationId;
        setExpandedId(state.notificationId);
        if (!notification.isRead) {
          markNotificationAsRead(state.notificationId);
        }
        setTimeout(() => {
          const element = messageRefs.current[state.notificationId!];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [location.state]);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    showToast('success', '消息已标记为已读');
  };

  const handleMarkAsUnread = (id: string) => {
    useAppStore.getState().updateNotification(id, { isRead: false });
    showToast('success', '消息已标记为未读');
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
    setSelectedIds(new Set());
    showToast('success', '所有消息已标记为已读');
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
    showToast('success', '消息已删除');
  };

  const handleBatchDelete = () => {
    selectedIds.forEach((id) => deleteNotification(id));
    setSelectedIds(new Set());
    showToast('success', `已删除 ${selectedIds.size} 条消息`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleBatchMarkRead = () => {
    selectedIds.forEach((id) => markNotificationAsRead(id));
    setSelectedIds(new Set());
    showToast('success', `已标记 ${selectedIds.size} 条消息为已读`);
  };

  const handleExpand = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setExpandedId(expandedId === notification.id ? null : notification.id);
  };

  const handleDownloadCertificate = async (notification: Notification) => {
    const certId = `certificate-${notification.id}`;
    try {
      setDownloadingNotification(notification);
      showToast('info', '正在生成凭证，请稍候...');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let element = document.getElementById(certId);
      let attempts = 0;
      while (!element && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        element = document.getElementById(certId);
        attempts++;
      }
      
      if (!element) {
        throw new Error('凭证内容渲染失败');
      }
      
      await exportToPDF(certId, `${getCertificateConfig(notification).title}-${notification.id}`);
      showToast('success', '凭证下载成功');
    } catch (error) {
      console.error('导出失败:', error);
      showToast('error', '凭证下载失败，请重试');
    } finally {
      setTimeout(() => setDownloadingNotification(null), 500);
    }
  };

  const renderCertificate = (notification: Notification) => {
    const certConfig = getCertificateConfig(notification);
    const CertIcon = certConfig.icon;
    const relatedEntity = getRelatedEntity(notification);

    const renderEntityInfo = () => {
      if (!relatedEntity) return null;
      
      const info: string[] = [];
      if ('eventName' in relatedEntity) info.push(`赛事：${relatedEntity.eventName as string}`);
      if ('venueName' in relatedEntity) info.push(`场馆：${relatedEntity.venueName as string}`);
      if ('date' in relatedEntity) info.push(`日期：${formatDate(relatedEntity.date as string, 'yyyy年MM月dd日')}`);
      if ('startTime' in relatedEntity) info.push(`时间：${relatedEntity.startTime as string}`);
      if ('athleteName' in relatedEntity) info.push(`运动员：${relatedEntity.athleteName as string}`);
      if ('result' in relatedEntity && !('sampleType' in relatedEntity)) info.push(`成绩：${relatedEntity.result as string}`);
      if ('rank' in relatedEntity) info.push(`名次：第${relatedEntity.rank as number}名`);
      if ('seatInfo' in relatedEntity) info.push(`座位：${relatedEntity.seatInfo as string}`);

      if (info.length === 0) return null;

      return (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium text-slate-900 mb-2">相关信息</p>
          <div className="space-y-1 text-sm text-slate-600">
            {info.map((item, i) => (
              <p key={i}>{item}</p>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div id={`certificate-${notification.id}`} className="bg-white p-8 max-w-2xl mx-auto">
        <div className="border-4 border-double border-amber-400 p-8 rounded-lg bg-gradient-to-br from-amber-50 to-white">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white mb-4">
              <CertIcon className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{certConfig.title}</h2>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-6" />
            <p className="text-lg text-slate-700 mb-6">{notification.title}</p>
            <div className="bg-white p-6 rounded-lg border border-slate-200 mb-6 text-left">
              <p className="text-slate-600 mb-4 whitespace-pre-wrap">{notification.content}</p>
              {renderEntityInfo()}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">编号：</span>
                  <span className="text-slate-900 font-medium">{notification.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">日期：</span>
                  <span className="text-slate-900 font-medium">{formatDate(notification.createdAt, 'yyyy年MM月dd日')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-left">
                <p className="text-sm text-slate-500">签发机构</p>
                <p className="font-semibold text-slate-900">运动会组委会</p>
              </div>
              <div className="text-right">
                <div className="w-24 h-24 border-2 border-red-500 rounded-full flex items-center justify-center opacity-60">
                  <span className="text-red-600 font-bold text-xs transform -rotate-12">专用章</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRelatedEntityInfo = (notification: Notification) => {
    const entity = getRelatedEntity(notification);
    if (!entity) return null;

    const infoItems: { icon: typeof FileText; label: string; value: string | number; color?: string }[] = [];

    if ('eventName' in entity) {
      infoItems.push({ icon: Trophy, label: '赛事', value: entity.eventName as string, color: 'text-amber-500' });
    }
    if ('venueName' in entity) {
      infoItems.push({ icon: MapPin, label: '场馆', value: entity.venueName as string, color: 'text-blue-500' });
    }
    if ('date' in entity) {
      infoItems.push({ icon: Calendar, label: '日期', value: formatDate(entity.date as string, 'yyyy-MM-dd'), color: 'text-purple-500' });
    }
    if ('startTime' in entity) {
      infoItems.push({ icon: Clock, label: '时间', value: entity.startTime as string, color: 'text-emerald-500' });
    }
    if ('athleteName' in entity) {
      infoItems.push({ icon: Users, label: '运动员', value: entity.athleteName as string, color: 'text-pink-500' });
    }
    if ('result' in entity && !('sampleType' in entity)) {
      infoItems.push({ icon: Award, label: '成绩', value: entity.result as string, color: 'text-amber-500' });
    }
    if ('rank' in entity) {
      infoItems.push({ icon: Trophy, label: '名次', value: `第${entity.rank as number}名`, color: 'text-yellow-500' });
    }
    if ('seatInfo' in entity) {
      infoItems.push({ icon: Ticket, label: '座位', value: entity.seatInfo as string, color: 'text-emerald-500' });
    }
    if ('price' in entity) {
      infoItems.push({ icon: FileText, label: '金额', value: `¥${entity.price as number}`, color: 'text-blue-500' });
    }
    if ('patientName' in entity) {
      infoItems.push({ icon: User, label: '患者', value: entity.patientName as string, color: 'text-blue-500' });
    }
    if ('injuryType' in entity) {
      infoItems.push({ icon: Stethoscope, label: '伤情', value: entity.injuryType as string, color: 'text-red-500' });
    }
    if ('sampleType' in entity) {
      infoItems.push({ icon: FlaskConical, label: '样本类型', value: (entity.sampleType as string) === 'blood' ? '血液' : '尿液', color: 'text-purple-500' });
    }
    if ('result' in entity && 'sampleType' in entity) {
      const result = entity.result as string;
      const resultText = result === 'negative' ? '阴性' : result === 'positive' ? '阳性' : result === 'abnormal' ? '异常' : '待检测';
      const resultColor = result === 'negative' ? 'text-emerald-600' : result === 'positive' ? 'text-red-600' : 'text-amber-600';
      infoItems.push({ icon: CheckCircle, label: '检测结果', value: resultText, color: resultColor });
    }

    if (infoItems.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          相关信息
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {infoItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${item.color || 'text-slate-500'} flex-shrink-0`} />
                <span className="text-slate-500">{item.label}：</span>
                <span className={item.color || 'text-slate-900'}>{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {newMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 right-4 z-50 max-w-md w-full sm:w-auto"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getTypeConfig(newMessage.type).bgColor} ${getTypeConfig(newMessage.type).color}`}>
                {(() => {
                  const Icon = getTypeConfig(newMessage.type).icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{newMessage.title}</p>
                <p className="text-sm text-slate-500 truncate">{newMessage.content}</p>
              </div>
              <button
                onClick={() => setNewMessage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="消息中心"
        description="查看和管理您的所有通知消息"
        icon={Bell}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              title={soundEnabled ? '关闭声音' : '开启声音'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-slate-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              title="通知设置"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-2 sticky top-4">
            {typeFilters.map((tab) => {
              const Icon = tab.key !== 'all' ? getTypeConfig(tab.key as NotificationType).icon : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveType(tab.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 last:mb-0 ${
                    activeType === tab.key
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {tab.label}
                  </span>
                  {unreadCounts[tab.key] > 0 && (
                    <span
                      className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                        activeType === tab.key ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {unreadCounts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索消息标题或内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {statusFilters.map((status) => (
                    <button
                      key={status.key}
                      onClick={() => setActiveStatus(status.key as typeof activeStatus)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeStatus === status.key
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={handleSelectAll}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span className="text-sm text-slate-600">全选</span>
              </label>
              {selectedIds.size > 0 && (
                <span className="text-sm text-slate-500">已选 {selectedIds.size} 条</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleBatchMarkRead}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                    标记已读
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                全部已读
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-16 h-16 text-slate-300" />}
                title="暂无消息"
                description={`您当前没有${
                  activeType === 'all' ? '' : typeFilters.find((t) => t.key === activeType)?.label
                }${activeStatus === 'unread' ? '未读' : activeStatus === 'read' ? '已读' : ''}${
                  searchQuery ? `包含"${searchQuery}"的` : ''
                }消息`}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification, index) => {
                  const typeConfig = getTypeConfig(notification.type);
                  const Icon = typeConfig.icon;
                  const isExpanded = expandedId === notification.id;
                  const isSelected = selectedIds.has(notification.id);
                  const certConfig = getCertificateConfig(notification);
                  const urgent = isUrgent(notification);
                  const isHovered = hoveredId === notification.id;

                  return (
                    <motion.div
                      key={notification.id}
                      ref={(el) => { messageRefs.current[notification.id] = el; }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.03 }}
                      layout
                    >
                      <div
                        className={`bg-white rounded-2xl shadow-card border transition-all overflow-hidden ${
                          urgent
                            ? 'border-red-300 bg-red-50/30'
                            : notification.isRead
                            ? 'border-slate-100'
                            : 'border-blue-200 bg-blue-50/30'
                        } ${isSelected && 'ring-2 ring-blue-500 ring-offset-2'}`}
                        onMouseEnter={() => setHoveredId(notification.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div
                          className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                          onClick={() => handleExpand(notification)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(notification.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />

                          <div
                            className={`p-3 rounded-xl flex-shrink-0 relative ${
                              urgent ? 'bg-red-100 text-red-600' : `${typeConfig.bgColor} ${typeConfig.color}`
                            }`}
                          >
                            <Icon className="w-6 h-6" />
                            {urgent && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                {!notification.isRead && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                                )}
                                {urgent && (
                                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                    紧急
                                  </span>
                                )}
                                <h4
                                  className={`font-semibold ${
                                    notification.isRead ? 'text-slate-700' : 'text-slate-900'
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-slate-400">
                                  {formatDate(notification.createdAt, 'MM-dd HH:mm')}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>
                            <p
                              className={`mt-1 text-sm line-clamp-2 ${
                                notification.isRead ? 'text-slate-500' : 'text-slate-600'
                              }`}
                            >
                              {notification.content}
                            </p>

                            <AnimatePresence>
                              {isHovered && !isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="mt-3 flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() =>
                                      notification.isRead
                                        ? handleMarkAsUnread(notification.id)
                                        : handleMarkAsRead(notification.id)
                                    }
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {notification.isRead ? '标记未读' : '标记已读'}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(notification.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    删除
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div className="flex-1">
                                    <p className="text-slate-700 whitespace-pre-wrap mb-2">
                                      {notification.content}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {formatDate(notification.createdAt, 'yyyy年MM月dd日 HH:mm:ss')}
                                    </p>
                                  </div>
                                </div>

                                {renderRelatedEntityInfo(notification)}

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigateToDetail(notification);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    查看详情
                                  </button>
                                  {certConfig.canDownload && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowCertificate(notification);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
                                      >
                                        <Eye className="w-4 h-4" />
                                        预览{certConfig.title}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadCertificate(notification);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                                      >
                                        <Download className="w-4 h-4" />
                                        下载PDF
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      notification.isRead
                                        ? handleMarkAsUnread(notification.id)
                                        : handleMarkAsRead(notification.id);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
                                  >
                                    {notification.isRead ? (
                                      <>
                                        <Eye className="w-4 h-4" />
                                        标记未读
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4" />
                                        标记已读
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(notification.id);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors ml-auto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    删除
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="通知设置"
        className="max-w-xl"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              推送通知
            </h4>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-700">接收推送通知</span>
              <button
                onClick={() => setPushNotification(!pushNotification)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  pushNotification ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  animate={{ x: pushNotification ? 24 : 2 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-500" />
              邮件通知
            </h4>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-700">接收邮件通知</span>
              <button
                onClick={() => setEmailNotification(!emailNotification)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  emailNotification ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  animate={{ x: emailNotification ? 24 : 2 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              消息类型
            </h4>
            <div className="space-y-2">
              {(Object.keys(notificationSettings) as NotificationType[]).map((type) => {
                const Icon = getTypeConfig(type).icon;
                const colors = getTypeConfig(type);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colors.bgColor} ${colors.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-slate-700">
                        {typeFilters.find((t) => t.key === type)?.label}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setNotificationSettings((prev) => ({ ...prev, [type]: !prev[type] }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationSettings[type] ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    >
                      <motion.div
                        animate={{ x: notificationSettings[type] ? 24 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-500" />
              免打扰
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {doNotDisturb.enabled ? (
                    <Moon className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="text-slate-700">免打扰模式</span>
                </div>
                <button
                  onClick={() => setDoNotDisturb((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    doNotDisturb.enabled ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: doNotDisturb.enabled ? 24 : 2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </button>
              </div>
              {doNotDisturb.enabled && (
                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                  <Clock className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="time"
                      value={doNotDisturb.startTime}
                      onChange={(e) =>
                        setDoNotDisturb((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-slate-500">至</span>
                    <input
                      type="time"
                      value={doNotDisturb.endTime}
                      onChange={(e) =>
                        setDoNotDisturb((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!showCertificate}
        onClose={() => setShowCertificate(null)}
        title={showCertificate ? `${getCertificateConfig(showCertificate).title}预览` : ''}
        className="max-w-3xl"
        footer={
          showCertificate && getCertificateConfig(showCertificate).canDownload ? (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCertificate(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => showCertificate && handleDownloadCertificate(showCertificate)}
                className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
              >
                <Download className="w-4 h-4" />
                下载PDF
              </button>
            </div>
          ) : undefined
        }
      >
        {showCertificate && renderCertificate(showCertificate)}
      </Modal>

      {downloadingNotification && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px', height: '1200px' }}>
          {renderCertificate(downloadingNotification)}
        </div>
      )}
    </div>
  );
}
