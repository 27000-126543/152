import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { formatDate, getMedalColor } from '@/utils';
import type { MedalStanding, Result } from '@/types';

const countryColors: Record<string, string> = {
  CHN: '#DE2910',
  USA: '#3C3B6E',
  JPN: '#BC002D',
  GER: '#000000',
  AUS: '#00008B',
  FRA: '#0055A4',
  GBR: '#012169',
  KOR: '#003478',
  ITA: '#009246',
  CAN: '#FF0000',
};

interface SortConfig {
  key: keyof MedalStanding;
  direction: 'asc' | 'desc';
}

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
  className?: string;
}

function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const count = useCountUp(value);
  return <span className={className}>{count.toLocaleString()}</span>;
}

export default function MedalTable() {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'gold',
    direction: 'desc',
  });

  const { medalStanding, results, athletes } = useAppStore();

  const sortedMedalStanding = useMemo(() => {
    return [...medalStanding].sort((a, b) => {
      if (sortConfig.key === 'rank') {
        return sortConfig.direction === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      }
      if (sortConfig.key === 'country') {
        return sortConfig.direction === 'asc'
          ? a.country.localeCompare(b.country)
          : b.country.localeCompare(a.country);
      }
      const aVal = a[sortConfig.key] as number;
      const bVal = b[sortConfig.key] as number;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [medalStanding, sortConfig]);

  const top10Data = useMemo(() => {
    return sortedMedalStanding.slice(0, 10).map((m) => ({
      name: m.countryCode,
      country: m.country,
      金牌: m.gold,
      银牌: m.silver,
      铜牌: m.bronze,
    }));
  }, [sortedMedalStanding]);

  const goldDistributionData = useMemo(() => {
    return sortedMedalStanding.slice(0, 10).map((m) => ({
      name: m.country,
      value: m.gold,
    }));
  }, [sortedMedalStanding]);

  const dailyMedalTrendData = useMemo(() => {
    const dailyData: Record<string, { date: string; 金牌: number; 银牌: number; 铜牌: number }> = {};

    results.forEach((result) => {
      if (!result.medal) return;
      const date = result.createdAt.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, 金牌: 0, 银牌: 0, 铜牌: 0 };
      }
      const medalKey = result.medal === 'gold' ? '金牌' : result.medal === 'silver' ? '银牌' : '铜牌';
      dailyData[date][medalKey]++;
    });

    return Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map((d) => ({
        ...d,
        date: formatDate(new Date(d.date), 'MM/dd'),
      }));
  }, [results]);

  const getCountryMedalDetails = (countryCode: string) => {
    const countryAthletes = athletes.filter((a) => a.countryCode === countryCode);
    const athleteIds = countryAthletes.map((a) => a.id);
    return results.filter(
      (r) => athleteIds.includes(r.athleteId) && r.medal
    );
  };

  const handleSort = (key: keyof MedalStanding) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getRankPodiumStyle = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600';
      case 2:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500';
      case 3:
        return 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700';
      default:
        return 'bg-slate-100';
    }
  };

  const getMedalEmoji = (medal: string) => {
    const emojiMap: Record<string, string> = {
      gold: '🥇',
      silver: '🥈',
      bronze: '🥉',
    };
    return emojiMap[medal] || '';
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="奖牌榜"
        description="查看各国/地区奖牌获得情况"
        icon={LucideIcons.Medal}
        showBackButton
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-card border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">每日新增奖牌趋势</h3>
              <p className="text-sm text-slate-500 mt-0.5">最近7天奖牌新增情况</p>
            </div>
            <LucideIcons.TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMedalTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="金牌"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="银牌"
                  stroke="#9CA3AF"
                  strokeWidth={3}
                  dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="铜牌"
                  stroke="#D97706"
                  strokeWidth={3}
                  dot={{ fill: '#D97706', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">前10国家奖牌对比</h3>
                <p className="text-sm text-slate-500 mt-0.5">按金牌数排序</p>
              </div>
              <LucideIcons.BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="金牌" stackId="a" radius={[0, 0, 0, 0]}>
                    {top10Data.map((_, index) => (
                      <Cell key={`gold-${index}`} fill={getMedalColor('gold')} />
                    ))}
                  </Bar>
                  <Bar dataKey="银牌" stackId="a">
                    {top10Data.map((_, index) => (
                      <Cell key={`silver-${index}`} fill={getMedalColor('silver')} />
                    ))}
                  </Bar>
                  <Bar dataKey="铜牌" stackId="a" radius={[6, 6, 0, 0]}>
                    {top10Data.map((_, index) => (
                      <Cell key={`bronze-${index}`} fill={getMedalColor('bronze')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-card border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">金牌分布</h3>
                <p className="text-sm text-slate-500 mt-0.5">前10国家占比</p>
              </div>
              <LucideIcons.PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goldDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {goldDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={countryColors[top10Data[index]?.name] || '#6B7280'}
                      />
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
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">奖牌榜排名</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              点击表头可排序，点击国家行查看详细奖牌信息
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-20 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center gap-1">
                      排名
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center gap-1">
                      国家/地区
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('gold')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('gold') }} />
                      金牌
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('silver')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('silver') }} />
                      银牌
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('bronze')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMedalColor('bronze') }} />
                      铜牌
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      总数
                      <LucideIcons.ChevronsUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 w-20">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {sortedMedalStanding.map((standing, index) => {
                    const isExpanded = expandedCountry === standing.countryCode;
                    const medalDetails = getCountryMedalDetails(standing.countryCode);
                    const isTop3 = standing.rank <= 3;

                    return (
                      <>
                        <motion.tr
                          key={standing.countryCode}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setExpandedCountry(isExpanded ? null : standing.countryCode)}
                          className={cn(
                            'cursor-pointer transition-all',
                            isTop3 && getRankPodiumStyle(standing.rank),
                            !isTop3 && 'hover:bg-slate-50'
                          )}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {isTop3 && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.05 + 0.3 }}
                                  className={cn(
                                    'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl',
                                    isTop3 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                  )}
                                  style={isTop3 ? { boxShadow: '0 4px 15px rgba(0,0,0,0.2)' } : {}}
                                >
                                  {standing.rank === 1 && '🥇'}
                                  {standing.rank === 2 && '🥈'}
                                  {standing.rank === 3 && '🥉'}
                                </motion.div>
                              )}
                              {!isTop3 && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                  {standing.rank}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-md"
                                style={{ backgroundColor: countryColors[standing.countryCode] || '#6B7280' }}
                              >
                                {standing.countryCode}
                              </div>
                              <span className={cn(
                                'font-semibold text-lg',
                                isTop3 ? 'text-white' : 'text-slate-900'
                              )}>
                                {standing.country}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <AnimatedNumber
                              value={standing.gold}
                              className={cn(
                                'text-2xl font-bold',
                                isTop3 ? 'text-white' : ''
                              )}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <AnimatedNumber
                              value={standing.silver}
                              className={cn(
                                'text-2xl font-bold',
                                isTop3 ? 'text-white/90' : 'text-slate-700'
                              )}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <AnimatedNumber
                              value={standing.bronze}
                              className={cn(
                                'text-2xl font-bold',
                                isTop3 ? 'text-white/80' : 'text-slate-600'
                              )}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <AnimatedNumber
                              value={standing.total}
                              className={cn(
                                'text-2xl font-bold',
                                isTop3 ? 'text-white' : 'text-slate-900'
                              )}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <LucideIcons.ChevronDown
                                className={cn(
                                  'w-5 h-5 mx-auto',
                                  isTop3 ? 'text-white' : 'text-slate-400'
                                )}
                              />
                            </motion.div>
                          </td>
                        </motion.tr>

                        {isExpanded && (
                          <motion.tr
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-slate-50 p-4">
                                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <LucideIcons.Award className="w-4 h-4 text-primary-500" />
                                  {standing.country} 奖牌明细
                                </h4>
                                {medalDetails.length === 0 ? (
                                  <div className="py-8 text-center text-slate-500">
                                    <LucideIcons.Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p>暂无奖牌记录</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {medalDetails.map((result: Result) => (
                                      <motion.div
                                        key={result.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-xl p-4 border border-slate-200"
                                      >
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="text-2xl">
                                            {getMedalEmoji(result.medal || '')}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">
                                              {result.athleteName}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                              {athletes.find(a => a.id === result.athleteId)?.events.join(', ') || ''}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex items-center justify-between">
                                            <span className="text-slate-500">项目</span>
                                            <span className="font-medium text-slate-700">{result.result}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-slate-500">成绩</span>
                                            <span className="font-mono font-medium text-slate-700">{result.result}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-slate-500">日期</span>
                                            <span className="text-slate-600">
                                              {formatDate(new Date(result.createdAt), 'yyyy-MM-dd')}
                                            </span>
                                          </div>
                                          {result.isRecord && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 font-medium">
                                              <LucideIcons.Flame className="w-3 h-3" />
                                              破纪录
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
