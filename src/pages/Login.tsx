import { useState } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import { getRoleName, getRoleIcon } from '@/utils';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const roles: UserRole[] = ['admin', 'athlete', 'referee', 'volunteer', 'security', 'medical', 'audience', 'doping'];

const roleColors: Record<UserRole, string> = {
  admin: 'from-blue-500 to-blue-600',
  athlete: 'from-green-500 to-green-600',
  referee: 'from-amber-500 to-amber-600',
  volunteer: 'from-pink-500 to-pink-600',
  security: 'from-red-500 to-red-600',
  medical: 'from-teal-500 to-teal-600',
  audience: 'from-purple-500 to-purple-600',
  doping: 'from-orange-500 to-orange-600',
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAppStore((state) => state.login);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    showToast('success', `欢迎回来，${getRoleName(role)}！`);
    navigate('/dashboard');
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      showToast('warning', '请先选择角色');
      return;
    }
    if (!username || !password) {
      showToast('warning', '请输入用户名和密码');
      return;
    }
    handleLogin(selectedRole);
  };

  const handleQuickLogin = (role: UserRole) => {
    handleLogin(role);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-500/5 to-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
            className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/30"
          >
            <LucideIcons.Trophy className="w-14 h-14 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-5xl font-bold text-white mb-4 tracking-tight"
          >
            2026 国际体育盛会
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-2xl text-amber-400 font-medium mb-8"
          >
            激情竞技 · 智慧管理
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {['高效', '智能', '安全', '便捷'].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm border border-white/10"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-16 flex items-center justify-center gap-8 text-white/40 text-sm"
          >
            <div className="flex items-center gap-2">
              <LucideIcons.Shield className="w-4 h-4" />
              <span>安全可靠</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <LucideIcons.Zap className="w-4 h-4" />
              <span>高效运行</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <LucideIcons.Globe className="w-4 h-4" />
              <span>全球视野</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="w-full max-w-xl"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 border border-white/20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-slate-800 mb-2">欢迎登录</h2>
              <p className="text-slate-500">请选择您的角色开始使用</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              {roles.map((role, index) => {
                const IconComponent = LucideIcons[getRoleIcon(role) as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                const isSelected = selectedRole === role;

                return (
                  <motion.button
                    key={role}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(role)}
                    onDoubleClick={() => handleQuickLogin(role)}
                    className={cn(
                      'relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 group',
                      isSelected
                        ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg shadow-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="selected-glow"
                        className="absolute inset-0 rounded-2xl bg-amber-400/20 animate-pulse"
                        style={{ filter: 'blur(8px)' }}
                      />
                    )}

                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300',
                      isSelected
                        ? `bg-gradient-to-br ${roleColors[role]} shadow-lg`
                        : 'bg-slate-100 group-hover:bg-slate-200'
                    )}>
                      {IconComponent && <IconComponent className={cn('w-6 h-6', isSelected ? 'text-white' : 'text-slate-600')} />}
                    </div>

                    <span className={cn(
                      'text-xs font-medium text-center transition-colors duration-300',
                      isSelected ? 'text-amber-700' : 'text-slate-600'
                    )}>
                      {getRoleName(role)}
                    </span>

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center"
                      >
                        <LucideIcons.Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              onSubmit={handleFormLogin}
              className="space-y-4 mb-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
                <div className="relative">
                  <LucideIcons.User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
                <div className="relative">
                  <LucideIcons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 bg-slate-50/50"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!selectedRole}
                className={cn(
                  'w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2',
                  selectedRole
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-700 hover:to-amber-600 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-300 cursor-not-allowed'
                )}
              >
                <LucideIcons.LogIn className="w-5 h-5" />
                <span>登录系统</span>
              </motion.button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-center text-sm text-slate-500 mb-6"
            >
              <p className="flex items-center justify-center gap-2">
                <LucideIcons.Lightbulb className="w-4 h-4 text-amber-500" />
                <span>双击角色卡片可快速登录体验</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center justify-center gap-6 pt-6 border-t border-slate-200"
            >
              <Link
                to="/public/athlete-register"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <LucideIcons.UserPlus className="w-4 h-4" />
                <span>运动员注册</span>
              </Link>
              <div className="w-px h-4 bg-slate-300" />
              <Link
                to="/public/volunteer-register"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <LucideIcons.HeartHandshake className="w-4 h-4" />
                <span>志愿者注册</span>
              </Link>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-center text-sm text-white/40 mt-6"
          >
            © 2026 国际体育盛会管理系统 · 智慧赛事 精彩无限
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
