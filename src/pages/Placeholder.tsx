import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceholderProps {
  title?: string;
  description?: string;
  icon?: keyof typeof LucideIcons;
  featureName?: string;
}

export default function Placeholder({
  title = '功能开发中',
  description = '该功能正在紧张开发中，敬请期待',
  icon = 'Construction',
  featureName,
}: PlaceholderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPath = featureName || location.pathname;
  
  const Icon = LucideIcons[icon] as typeof LucideIcons.LayoutDashboard;
  
  const getPathDisplay = (path: string): string => {
    const pathMap: Record<string, string> = {
      '/athlete/profile': '运动员个人信息',
      '/athlete/list': '运动员列表',
      '/athlete/register': '运动员注册',
      '/schedule/generate': '赛事编排',
      '/schedule/calendar': '赛程日历',
      '/result/entry': '成绩录入',
      '/result/ranking': '成绩排名',
      '/result/medal': '奖牌榜',
      '/doping/test': '兴奋剂抽检',
      '/doping/result': '检测结果',
      '/volunteer/register': '志愿者注册',
      '/volunteer/manage': '志愿者管理',
      '/volunteer/checkin': '签到打卡',
      '/security/heatmap': '安保热力图',
      '/security/patrol': '巡逻路线',
      '/ticket/buy': '购票选座',
      '/ticket/order': '票务订单',
      '/medical/report': '伤病上报',
      '/medical/dispatch': '医疗调度',
      '/messages': '消息中心',
      '/profile': '个人中心',
      '/dashboard': '数据总览',
    };
    return pathMap[path] || path;
  };
  
  const getProgressInfo = (path: string): { progress: number; status: string; eta: string } => {
    const progressMap: Record<string, { progress: number; status: string; eta: string }> = {
      '/athlete/profile': { progress: 85, status: '测试优化中', eta: '预计3天内上线' },
      '/athlete/list': { progress: 90, status: '功能完善中', eta: '预计2天内上线' },
      '/athlete/register': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/schedule/generate': { progress: 95, status: '最终测试中', eta: '预计1天内上线' },
      '/schedule/calendar': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/result/entry': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/result/ranking': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/result/medal': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/doping/test': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/doping/result': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/volunteer/register': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/volunteer/manage': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/volunteer/checkin': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/security/heatmap': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/security/patrol': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/ticket/buy': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/ticket/order': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/medical/report': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/medical/dispatch': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/messages': { progress: 100, status: '已完成', eta: '可正常使用' },
      '/profile': { progress: 100, status: '已完成', eta: '可正常使用' },
    };
    return progressMap[path] || { progress: 50, status: '开发中', eta: '预计近期上线' };
  };
  
  const progressInfo = getProgressInfo(currentPath);
  const displayName = getPathDisplay(currentPath);
  
  const relatedFeatures = [
    { name: '数据总览', path: '/dashboard', icon: 'LayoutDashboard' },
    { name: '消息中心', path: '/messages', icon: 'Bell' },
    { name: '个人中心', path: '/profile', icon: 'User' },
  ];
  
  return (
    <div className="min-h-screen">
      <PageHeader
        title={title}
        description={description}
        icon={Icon}
        actions={
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <LucideIcons.ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium text-slate-700">返回上页</span>
          </button>
        }
      />
      
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-8 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="inline-flex p-6 bg-white/20 backdrop-blur-sm rounded-3xl mb-4"
            >
              <LucideIcons.Construction className="w-16 h-16 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">{displayName}</h2>
            <p className="text-white/80 text-lg">{progressInfo.status}</p>
          </div>
          
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">开发进度</span>
                <span className="text-sm font-bold text-amber-600">{progressInfo.progress}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressInfo.progress}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    progressInfo.progress === 100 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  )}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2 text-center">{progressInfo.eta}</p>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <LucideIcons.Info className="w-5 h-5 text-blue-500" />
                功能说明
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LucideIcons.Check className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">当前路径</p>
                    <p className="text-sm text-slate-500 font-mono">{currentPath}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LucideIcons.Sparkles className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">相关推荐</p>
                    <p className="text-sm text-slate-500">您可以先浏览其他已完成的功能模块</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <LucideIcons.Compass className="w-5 h-5 text-purple-500" />
                快速导航
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {relatedFeatures.map((feature) => {
                  const FeatureIcon = LucideIcons[feature.icon as keyof typeof LucideIcons] as typeof LucideIcons.LayoutDashboard;
                  return (
                    <motion.button
                      key={feature.path}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(feature.path)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:border hover:border-slate-200 transition-all"
                    >
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <FeatureIcon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{feature.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="px-8 pb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <LucideIcons.Home className="w-5 h-5" />
              返回数据总览
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
