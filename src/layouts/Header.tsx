import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  LogOut,
  ChevronDown,
  Clock,
  Trophy,
  User as UserIcon,
  MessageCircle,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { User, Notification } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HeaderProps {
  title?: string;
}

export function Header({ title = '2025 夏季运动会智慧管理系统' }: HeaderProps) {
  const navigate = useNavigate();
  const { currentUser, logout, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    setShowNotificationPanel(false);
    navigate('/messages', { state: { notificationId: notification.id } });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'result':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'medical':
        return <MessageCircle className="w-4 h-4 text-red-500" />;
      case 'ticket':
        return <Trophy className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-blue-600" />
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {format(currentTime, 'yyyy年MM月dd日 EEEE HH:mm:ss', { locale: zhCN })}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotificationPanel && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-800">消息通知</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      全部已读
                    </button>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>暂无通知</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notification.content}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(notification.createdAt), 'MM-dd HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{currentUser?.name || '未登录'}</p>
              <p className="text-xs text-slate-500">
                {currentUser ? getRoleLabel(currentUser.role) : ''}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="font-medium text-slate-800">{currentUser?.name}</p>
                  <p className="text-sm text-slate-500">{currentUser?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    个人中心
                  </button>
                  <button
                    onClick={() => {
                      navigate('/messages');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    消息中心
                  </button>
                </div>
                <div className="border-t border-slate-200 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function getRoleLabel(role: User['role']): string {
  const labels: Record<User['role'], string> = {
    admin: '系统管理员',
    athlete: '运动员',
    referee: '裁判员',
    volunteer: '志愿者',
    security: '安保人员',
    medical: '医疗人员',
    audience: '观众',
    doping: '兴奋剂检测员',
  };
  return labels[role];
}
