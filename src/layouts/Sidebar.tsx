import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
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
  ThermometerSun,
  LogIn,
  CalendarCheck,
  FileText,
  Map,
  ShoppingCart,
  Receipt,
  FlaskConical,
  Activity,
  Medal,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../types';

interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  menuItems: MenuItem[];
  userRole?: UserRole;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const getRoleName = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    admin: '系统管理员',
    athlete: '运动员',
    referee: '裁判员',
    volunteer: '志愿者',
    security: '安保人员',
    medical: '医疗人员',
    audience: '观众',
    doping: '兴奋剂检测员',
  };
  return roleMap[role];
};

export function Sidebar({ menuItems, collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="relative flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Medal className="w-6 h-6 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-bold text-lg">智慧赛事</span>
                <span className="text-xs text-slate-400">管理系统</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-14 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors border-2 border-slate-800 z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <motion.li
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavLink
                  to={item.path}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                    />
                  )}
                </NavLink>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 border-t border-slate-700"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">2025 夏季运动会</p>
                  <p className="text-xs text-slate-400">v1.0.0</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

export type { MenuItem };
export { getRoleName };
