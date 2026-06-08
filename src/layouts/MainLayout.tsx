import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Trophy,
  Pill,
  HeartHandshake,
  Shield,
  Ticket,
  Stethoscope,
  Bell,
  User,
  ClipboardList,
  MapPin,
  CalendarCheck,
  FileText,
  Map,
  ShoppingCart,
  Receipt,
  FlaskConical,
  Activity,
  ThermometerSun,
  type LucideIcon,
} from 'lucide-react';
import { Sidebar, type MenuItem } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '../store/useAppStore';
import type { UserRole } from '../types';

interface MainLayoutProps {
  children: ReactNode;
}

const baseMenuItems: MenuItem[] = [
  { key: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'messages', label: '消息中心', icon: Bell, path: '/messages' },
  { key: 'profile', label: '个人中心', icon: User, path: '/profile' },
];

const roleMenuConfig: Record<UserRole, MenuItem[]> = {
  admin: [
    { key: 'athlete-list', label: '运动员管理', icon: Users, path: '/athlete/list' },
    { key: 'athlete-register', label: '运动员注册', icon: Users, path: '/athlete/register' },
    { key: 'schedule-generate', label: '赛事编排', icon: CalendarDays, path: '/schedule/generate' },
    { key: 'schedule-calendar', label: '赛程日历', icon: CalendarDays, path: '/schedule/calendar' },
    { key: 'result-entry', label: '成绩录入', icon: Trophy, path: '/result/entry' },
    { key: 'result-ranking', label: '成绩排名', icon: Trophy, path: '/result/ranking' },
    { key: 'result-medal', label: '奖牌榜', icon: Trophy, path: '/result/medal' },
    { key: 'doping-test', label: '兴奋剂抽检', icon: Pill, path: '/doping/test' },
    { key: 'doping-result', label: '检测结果', icon: Pill, path: '/doping/result' },
    { key: 'volunteer-manage', label: '志愿者管理', icon: HeartHandshake, path: '/volunteer/manage' },
    { key: 'volunteer-register', label: '志愿者注册', icon: HeartHandshake, path: '/volunteer/register' },
    { key: 'security-heatmap', label: '安保热力图', icon: Shield, path: '/security/heatmap' },
    { key: 'security-patrol', label: '巡逻路线', icon: Shield, path: '/security/patrol' },
    { key: 'ticket-buy', label: '购票选座', icon: Ticket, path: '/ticket/buy' },
    { key: 'ticket-order', label: '票务订单', icon: Ticket, path: '/ticket/order' },
    { key: 'medical-report', label: '伤病上报', icon: Stethoscope, path: '/medical/report' },
    { key: 'medical-dispatch', label: '医疗调度', icon: Stethoscope, path: '/medical/dispatch' },
  ],
  athlete: [
    { key: 'schedule-calendar', label: '赛程日历', icon: CalendarDays, path: '/schedule/calendar' },
    { key: 'result-ranking', label: '成绩排名', icon: Trophy, path: '/result/ranking' },
    { key: 'result-medal', label: '奖牌榜', icon: Trophy, path: '/result/medal' },
    { key: 'athlete-profile', label: '个人信息', icon: User, path: '/athlete/profile' },
  ],
  referee: [
    { key: 'result-entry', label: '成绩录入', icon: ClipboardList, path: '/result/entry' },
    { key: 'schedule-calendar', label: '赛程日历', icon: CalendarDays, path: '/schedule/calendar' },
    { key: 'result-ranking', label: '成绩排名', icon: Trophy, path: '/result/ranking' },
  ],
  volunteer: [
    { key: 'volunteer-checkin', label: '签到打卡', icon: CalendarCheck, path: '/volunteer/checkin' },
    { key: 'volunteer-manage', label: '岗位分配', icon: MapPin, path: '/volunteer/manage' },
  ],
  security: [
    { key: 'security-patrol', label: '巡逻路线', icon: Map, path: '/security/patrol' },
    { key: 'security-heatmap', label: '热力图监控', icon: ThermometerSun, path: '/security/heatmap' },
  ],
  medical: [
    { key: 'medical-dispatch', label: '医疗调度', icon: Stethoscope, path: '/medical/dispatch' },
    { key: 'medical-report', label: '伤病上报', icon: Activity, path: '/medical/report' },
  ],
  audience: [
    { key: 'schedule-calendar', label: '赛程日历', icon: CalendarDays, path: '/schedule/calendar' },
    { key: 'ticket-buy', label: '购票选座', icon: ShoppingCart, path: '/ticket/buy' },
    { key: 'ticket-order', label: '我的订单', icon: Receipt, path: '/ticket/order' },
    { key: 'result-medal', label: '奖牌榜', icon: Trophy, path: '/result/medal' },
  ],
  doping: [
    { key: 'doping-test', label: '兴奋剂抽检', icon: FlaskConical, path: '/doping/test' },
    { key: 'doping-result', label: '检测结果', icon: FileText, path: '/doping/result' },
  ],
};

function getMenuItemsByRole(role: UserRole): MenuItem[] {
  const roleMenus = roleMenuConfig[role] || [];
  const messagesIndex = baseMenuItems.findIndex((m) => m.key === 'messages');
  const profileIndex = baseMenuItems.findIndex((m) => m.key === 'profile');

  return [
    baseMenuItems[0],
    ...roleMenus,
    ...baseMenuItems.slice(1, messagesIndex),
    ...baseMenuItems.slice(messagesIndex, profileIndex + 1),
  ];
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    const items = getMenuItemsByRole(currentUser.role);
    setMenuItems(items);

    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        menuItems={menuItems}
        userRole={currentUser.role}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {isLoaded && (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>

          {!isLoaded && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export { getMenuItemsByRole };
