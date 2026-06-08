import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getRoleName, getRoleIcon, formatDate, exportToPDF, cn } from '@/utils';
import type { User, UserRole, NotificationType } from '@/types';

type TabKey = 'info' | 'security' | 'notifications' | 'certificates';

const tabs: { key: TabKey; label: string; icon: keyof typeof LucideIcons }[] = [
  { key: 'info', label: '个人信息', icon: 'User' },
  { key: 'security', label: '安全设置', icon: 'Shield' },
  { key: 'notifications', label: '通知设置', icon: 'Bell' },
  { key: 'certificates', label: '我的凭证', icon: 'Award' },
];

const roleColors: Record<UserRole | string, string> = {
  admin: 'bg-tech-500',
  athlete: 'bg-primary-500',
  referee: 'bg-orange-500',
  volunteer: 'bg-success-500',
  security: 'bg-danger-500',
  medical: 'bg-emerald-500',
  audience: 'bg-purple-500',
  doping: 'bg-amber-500',
};

const statusColors: Record<string, string> = {
  active: 'bg-success-500',
  inactive: 'bg-gray-400',
  pending: 'bg-amber-500',
};

const profileSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').max(50, '姓名最多50个字符'),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  avatar: z.string().optional(),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6, '原密码至少6位'),
    newPassword: z
      .string()
      .min(8, '新密码至少8位')
      .regex(/[A-Z]/, '需包含大写字母')
      .regex(/[0-9]/, '需包含数字'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次密码不一致',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface Certificate {
  id: string;
  name: string;
  type: string;
  date: string;
  description: string;
  gradient: 'primary' | 'gold' | 'tech' | 'orange' | 'success' | 'danger';
}

const mockCertificates: Certificate[] = [
  {
    id: '1',
    name: '参赛证书',
    type: '2024年夏季运动会',
    date: '2024-08-15',
    description: '男子100米田径项目参赛证明',
    gradient: 'gold',
  },
  {
    id: '2',
    name: '志愿者服务证书',
    type: '志愿服务时长证明',
    date: '2024-08-20',
    description: '累计服务120小时，表现优异',
    gradient: 'success',
  },
  {
    id: '3',
    name: '裁判资格证书',
    type: '国家级裁判认证',
    date: '2024-01-10',
    description: '田径项目一级裁判员资格',
    gradient: 'tech',
  },
  {
    id: '4',
    name: '医疗培训证书',
    type: '急救培训合格',
    date: '2024-03-15',
    description: '心肺复苏及急救技能培训合格',
    gradient: 'primary',
  },
];

const mockDevices = [
  {
    id: '1',
    name: 'MacBook Pro',
    os: 'macOS Sonoma',
    browser: 'Chrome 125',
    lastLogin: '2024-06-08 14:30',
    isCurrent: true,
  },
  {
    id: '2',
    name: 'iPhone 15 Pro',
    os: 'iOS 17',
    browser: 'Safari',
    lastLogin: '2024-06-07 09:15',
    isCurrent: false,
  },
  {
    id: '3',
    name: 'Windows PC',
    os: 'Windows 11',
    browser: 'Edge 125',
    lastLogin: '2024-06-05 18:45',
    isCurrent: false,
  },
];

function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        checked ? 'bg-primary-500' : 'bg-gray-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      )}
    >
      <motion.span
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow-md"
      />
    </button>
  );
}

function AvatarUpload({
  value,
  onChange,
  name,
}: {
  value?: string;
  onChange: (url: string) => void;
  name: string;
}) {
  const handleUpload = () => {
    const mockAvatars = [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20photo&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=business%20avatar%20portrait&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20profile%20picture&image_size=square',
    ];
    const randomAvatar = mockAvatars[Math.floor(Math.random() * mockAvatars.length)];
    onChange(randomAvatar);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-tech-600 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="头像" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleUpload}
          className="absolute bottom-0 right-0 p-1.5 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors"
        >
          <LucideIcons.Camera className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">上传头像</p>
        <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { currentUser, updateCurrentUser } = useAppStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    registration: true,
    schedule: true,
    result: true,
    doping: true,
    ticket: true,
    medical: true,
    system: true,
  });

  const [pushMethods, setPushMethods] = useState({
    inApp: true,
    email: false,
    sms: false,
  });

  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      avatar: currentUser?.avatar || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const avatarValue = watch('avatar');
  const nameValue = watch('name');
  const newPasswordValue = watchPassword('newPassword');

  const passwordStrength = useMemo(() => {
    if (!newPasswordValue) return { level: 0, label: '', color: '' };
    let level = 0;
    if (newPasswordValue.length >= 8) level++;
    if (/[A-Z]/.test(newPasswordValue)) level++;
    if (/[0-9]/.test(newPasswordValue)) level++;
    if (/[^A-Za-z0-9]/.test(newPasswordValue)) level++;

    const levels = [
      { level: 0, label: '弱', color: 'bg-danger-500' },
      { level: 1, label: '较弱', color: 'bg-orange-500' },
      { level: 2, label: '中等', color: 'bg-amber-500' },
      { level: 3, label: '较强', color: 'bg-success-500' },
      { level: 4, label: '强', color: 'bg-emerald-500' },
    ];
    return levels[level];
  }, [newPasswordValue]);

  const roleStats = useMemo(() => {
    if (!currentUser) return [];
    const role = currentUser.role;

    const stats: Record<UserRole, { icon: keyof typeof LucideIcons; value: string | number; label: string; gradient: 'primary' | 'gold' | 'tech' | 'orange' | 'success' | 'danger' }[]> = {
      admin: [
        { icon: 'Users', value: '1,234', label: '总用户数', gradient: 'primary' },
        { icon: 'Calendar', value: '56', label: '赛事总数', gradient: 'tech' },
        { icon: 'Activity', value: '99.9%', label: '系统可用率', gradient: 'success' },
      ],
      athlete: [
        { icon: 'Target', value: '5', label: '参赛项目数', gradient: 'primary' },
        { icon: 'Medal', value: '12', label: '获得奖牌数', gradient: 'gold' },
        { icon: 'Trophy', value: '3', label: '破纪录次数', gradient: 'orange' },
      ],
      referee: [
        { icon: 'ClipboardList', value: '28', label: '执裁场次', gradient: 'primary' },
        { icon: 'CheckCircle', value: '156', label: '录入成绩数', gradient: 'success' },
        { icon: 'Star', value: '4.8', label: '综合评分', gradient: 'gold' },
      ],
      volunteer: [
        { icon: 'Clock', value: '120h', label: '服务时长', gradient: 'success' },
        { icon: 'HeartHandshake', value: '15', label: '服务次数', gradient: 'primary' },
        { icon: 'Star', value: '4.9', label: '服务评价', gradient: 'gold' },
      ],
      security: [
        { icon: 'ShieldAlert', value: '45', label: '巡逻次数', gradient: 'danger' },
        { icon: 'AlertTriangle', value: '3', label: '处理异常数', gradient: 'orange' },
        { icon: 'CheckCircle', value: '100%', label: '响应率', gradient: 'success' },
      ],
      medical: [
        { icon: 'Stethoscope', value: '89', label: '接诊次数', gradient: 'primary' },
        { icon: 'Clock', value: '3.2min', label: '平均响应时间', gradient: 'tech' },
        { icon: 'Heart', value: '95%', label: '治愈率', gradient: 'success' },
      ],
      audience: [
        { icon: 'Ticket', value: '15', label: '购票数量', gradient: 'orange' },
        { icon: 'Eye', value: '12', label: '观看比赛数', gradient: 'primary' },
        { icon: 'Star', value: '4.7', label: '观赛评价', gradient: 'gold' },
      ],
      doping: [
        { icon: 'FlaskConical', value: '67', label: '检测样本数', gradient: 'tech' },
        { icon: 'AlertCircle', value: '2', label: '异常结果数', gradient: 'danger' },
        { icon: 'CheckCircle', value: '97%', label: '阴性率', gradient: 'success' },
      ],
    };

    return stats[role] || stats.admin;
  }, [currentUser]);

  const onSubmitProfile = handleProfileSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateCurrentUser(data);
      showToast('success', '个人信息更新成功');
    } catch (error) {
      showToast('error', '更新失败，请稍后重试');
    }
  });

  const onSubmitPassword = handlePasswordSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      showToast('success', '密码修改成功');
      resetPassword();
      setShowPasswordModal(false);
    } catch (error) {
      showToast('error', '密码修改失败，请稍后重试');
    }
  });

  const handleDeleteAccount = () => {
    showToast('info', '账户注销功能开发中...');
    setShowDeleteConfirm(false);
  };

  const handleExportCertificate = (cert: Certificate) => {
    const elementId = `cert-${cert.id}`;
    exportToPDF(elementId, cert.name)
      .then(() => showToast('success', `${cert.name} 导出成功`))
      .catch(() => showToast('error', '导出失败，请稍后重试'));
  };

  const toggleNotification = (key: string) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast('success', '通知设置已更新');
  };

  const renderInfoTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Edit3 className="w-5 h-5 text-primary-500" />
          基本信息编辑
        </h3>
        <form onSubmit={onSubmitProfile} className="space-y-6">
          <div className="mb-8">
            <AvatarUpload
              value={avatarValue || currentUser?.avatar}
              onChange={(url) => setValue('avatar', url, { shouldDirty: true })}
              name={nameValue || currentUser?.name || ''}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                {...registerProfile('name')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                placeholder="请输入姓名"
              />
              {profileErrors.name && (
                <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                  <LucideIcons.AlertCircle className="w-4 h-4" />
                  {profileErrors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱 <span className="text-danger-500">*</span>
              </label>
              <input
                type="email"
                {...registerProfile('email')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                placeholder="请输入邮箱"
              />
              {profileErrors.email && (
                <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                  <LucideIcons.AlertCircle className="w-4 h-4" />
                  {profileErrors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号 <span className="text-danger-500">*</span>
              </label>
              <input
                type="tel"
                {...registerProfile('phone')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                placeholder="请输入手机号"
              />
              {profileErrors.phone && (
                <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                  <LucideIcons.AlertCircle className="w-4 h-4" />
                  {profileErrors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                {currentUser?.username}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                {getRoleName(currentUser?.role || '')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户ID
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 font-mono">
                {currentUser?.id}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                注册时间
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
                {formatDate(currentUser?.createdAt || '', 'yyyy年MM月dd日 HH:mm')}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {profileSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  保存中...
                </>
              ) : (
                <>
                  <LucideIcons.Save className="w-4 h-4" />
                  保存修改
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.BarChart3 className="w-5 h-5 text-primary-500" />
          数据统计
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleStats.map((stat, index) => {
            const IconComponent = LucideIcons[stat.icon] as React.ComponentType<{ className?: string }>;
            return (
              <StatCard
                key={index}
                icon={<IconComponent className="w-6 h-6" />}
                value={stat.value}
                label={stat.label}
                gradient={stat.gradient}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderSecurityTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Lock className="w-5 h-5 text-primary-500" />
          修改密码
        </h3>
        <button
          type="button"
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary-100 text-primary-600 rounded-xl group-hover:bg-primary-200 transition-colors">
              <LucideIcons.Key className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">修改登录密码</p>
              <p className="text-sm text-gray-500">定期更换密码，保障账户安全</p>
            </div>
          </div>
          <LucideIcons.ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Smartphone className="w-5 h-5 text-primary-500" />
          两步验证
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <LucideIcons.Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">双因素认证</p>
              <p className="text-sm text-gray-500">启用后登录需要输入验证码</p>
            </div>
          </div>
          <Switch
            checked={twoFactorEnabled}
            onChange={() => {
              setTwoFactorEnabled(!twoFactorEnabled);
              showToast('success', `两步验证已${!twoFactorEnabled ? '开启' : '关闭'}`);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Monitor className="w-5 h-5 text-primary-500" />
          登录设备管理
        </h3>
        <div className="space-y-3">
          {mockDevices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
                  {device.name.includes('Mac') || device.name.includes('Windows') ? (
                    <LucideIcons.Monitor className="w-5 h-5" />
                  ) : (
                    <LucideIcons.Smartphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{device.name}</p>
                    {device.isCurrent && (
                      <span className="px-2 py-0.5 bg-success-100 text-success-600 text-xs font-medium rounded-full">
                        当前设备
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {device.os} · {device.browser}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    上次登录：{device.lastLogin}
                  </p>
                </div>
              </div>
              {!device.isCurrent && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-danger-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-danger-600 mb-4 flex items-center gap-2">
          <LucideIcons.AlertTriangle className="w-5 h-5" />
          危险操作
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          注销账户将删除您的所有数据，此操作不可恢复，请谨慎操作。
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-6 py-2.5 border border-danger-300 text-danger-600 rounded-xl font-medium hover:bg-danger-50 transition-colors"
        >
          注销账户
        </button>
      </div>
    </motion.div>
  );

  const renderNotificationsTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Bell className="w-5 h-5 text-primary-500" />
          推送方式
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'inApp', label: '站内通知', icon: 'MessageSquare' as const },
            { key: 'email', label: '邮件通知', icon: 'Mail' as const },
            { key: 'sms', label: '短信通知', icon: 'Smartphone' as const },
          ].map((item) => {
            const IconComponent = LucideIcons[item.icon];
            const checked = pushMethods[item.key as keyof typeof pushMethods];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setPushMethods((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }));
                  showToast('success', '推送方式已更新');
                }}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  checked
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <IconComponent
                  className={cn('w-6 h-6 mb-2', checked ? 'text-primary-500' : 'text-gray-400')}
                />
                <p className={cn('font-medium', checked ? 'text-primary-700' : 'text-gray-700')}>
                  {item.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Moon className="w-5 h-5 text-primary-500" />
          勿扰模式
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
          <div>
            <p className="font-medium text-gray-900">开启勿扰模式</p>
            <p className="text-sm text-gray-500">开启后将不会收到任何通知推送</p>
          </div>
          <Switch
            checked={doNotDisturb}
            onChange={() => {
              setDoNotDisturb(!doNotDisturb);
              showToast('success', `勿扰模式已${!doNotDisturb ? '开启' : '关闭'}`);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <LucideIcons.Settings className="w-5 h-5 text-primary-500" />
          通知类型
        </h3>
        <div className="space-y-3">
          {[
            { key: 'registration' as NotificationType, label: '注册通知', icon: 'UserPlus', desc: '新用户注册审核通知' },
            { key: 'schedule' as NotificationType, label: '赛程变更通知', icon: 'Calendar', desc: '比赛时间、场地变更通知' },
            { key: 'result' as NotificationType, label: '成绩通知', icon: 'Trophy', desc: '比赛结果公布通知' },
            { key: 'doping' as NotificationType, label: '检测异常通知', icon: 'FlaskConical', desc: '兴奋剂检测结果通知' },
            { key: 'ticket' as NotificationType, label: '门票变动通知', icon: 'Ticket', desc: '购票、退票通知' },
            { key: 'medical' as NotificationType, label: '医疗处理通知', icon: 'Stethoscope', desc: '伤病处理进度通知' },
            { key: 'system' as NotificationType, label: '系统通知', icon: 'Settings', desc: '系统维护、公告通知' },
          ].map((item) => {
            const IconComponent = LucideIcons[item.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings[item.key] ?? true}
                  onChange={() => toggleNotification(item.key)}
                  disabled={doNotDisturb}
                />
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderCertificatesTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockCertificates.map((cert) => {
          const IconComponent = LucideIcons.Award;
          return (
            <motion.div
              key={cert.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden rounded-2xl shadow-lg"
            >
              <div
                id={`cert-${cert.id}`}
                className={cn(
                  'bg-gradient-to-br p-6 text-white',
                  {
                    primary: 'from-primary-500 to-primary-700',
                    gold: 'from-gold-400 to-gold-600',
                    tech: 'from-tech-400 to-tech-600',
                    orange: 'from-orange-400 to-orange-600',
                    success: 'from-success-400 to-success-600',
                    danger: 'from-danger-400 to-danger-600',
                  }[cert.gradient]
                )}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -right-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {cert.type}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold mb-2">{cert.name}</h4>
                  <p className="text-white/80 text-sm mb-4">{cert.description}</p>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <LucideIcons.Calendar className="w-4 h-4" />
                    <span>{formatDate(cert.date, 'yyyy年MM月dd日')}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleExportCertificate(cert)}
                  className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <LucideIcons.Download className="w-4 h-4" />
                  下载PDF
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LucideIcons.User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">请先登录</p>
        </div>
      </div>
    );
  }

  const RoleIcon = LucideIcons[getRoleIcon(currentUser.role) as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="个人中心"
        description="管理您的账户信息和偏好设置"
        icon={LucideIcons.User}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-80 flex-shrink-0"
        >
          <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-tech-600 rounded-2xl shadow-xl p-6 text-white sticky top-4">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden mx-auto ring-4 ring-white/30">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className={cn('w-3 h-3 rounded-full', statusColors[currentUser.status])} />
                  </div>
                </div>

                <h2 className="text-2xl font-bold mt-4">{currentUser.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <RoleIcon className="w-4 h-4" />
                  <span className="text-white/80">{getRoleName(currentUser.role)}</span>
                </div>
                <div className="flex justify-center gap-2 mt-3">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium', roleColors[currentUser.role], 'bg-opacity-20 bg-white')}>
                    {currentUser.status === 'active' ? '正常' : currentUser.status === 'inactive' ? '禁用' : '待审核'}
                  </span>
                </div>
                <p className="text-white/60 text-sm mt-2 font-mono">ID: {currentUser.id}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <LucideIcons.Mail className="w-5 h-5 text-white/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60">邮箱</p>
                    <p className="text-sm truncate">{currentUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <LucideIcons.Phone className="w-5 h-5 text-white/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60">电话</p>
                    <p className="text-sm">{currentUser.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <LucideIcons.Calendar className="w-5 h-5 text-white/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60">注册时间</p>
                    <p className="text-sm">{formatDate(currentUser.createdAt, 'yyyy-MM-dd')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="border-b border-gray-100 p-2">
              <nav className="flex flex-wrap gap-1" aria-label="Tabs">
                {tabs.map((tab) => {
                  const TabIcon = LucideIcons[tab.icon] as React.ComponentType<{ className?: string }>;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all',
                        activeTab === tab.key
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <TabIcon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                <div key={activeTab}>
                  {activeTab === 'info' && renderInfoTab()}
                  {activeTab === 'security' && renderSecurityTab()}
                  {activeTab === 'notifications' && renderNotificationsTab()}
                  {activeTab === 'certificates' && renderCertificatesTab()}
                </div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowPasswordModal(false);
                resetPassword();
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">修改密码</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      resetPassword();
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <LucideIcons.X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={onSubmitPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">原密码</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        {...registerPassword('oldPassword')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                        placeholder="请输入原密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showOldPassword ? <LucideIcons.EyeOff className="w-5 h-5" /> : <LucideIcons.Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.oldPassword && (
                      <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                        <LucideIcons.AlertCircle className="w-4 h-4" />
                        {passwordErrors.oldPassword.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...registerPassword('newPassword')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                        placeholder="请输入新密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <LucideIcons.EyeOff className="w-5 h-5" /> : <LucideIcons.Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                        <LucideIcons.AlertCircle className="w-4 h-4" />
                        {passwordErrors.newPassword.message}
                      </p>
                    )}
                    {newPasswordValue && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">密码强度：</span>
                          <span className={cn('text-xs font-medium', passwordStrength.color.replace('bg-', 'text-'))}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                'h-1.5 flex-1 rounded-full transition-colors',
                                level <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerPassword('confirmPassword')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                        placeholder="请再次输入新密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <LucideIcons.EyeOff className="w-5 h-5" /> : <LucideIcons.Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-danger-500 flex items-center gap-1">
                        <LucideIcons.AlertCircle className="w-4 h-4" />
                        {passwordErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        resetPassword();
                      }}
                      className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {passwordSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          提交中...
                        </>
                      ) : (
                        '确认修改'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="确认注销账户"
        content="注销账户将删除您的所有个人数据，此操作不可恢复。您确定要继续吗？"
        confirmText="确认注销"
        cancelText="取消"
        icon={<LucideIcons.AlertTriangle className="w-6 h-6 text-danger-500" />}
      />
    </div>
  );
}
