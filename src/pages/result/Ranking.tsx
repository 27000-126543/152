import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils';
import type { Result, Event, MedalType } from '@/types';

interface RankingRow {
  athleteId: string;
  athleteName: string;
  country: string;
  countryCode: string;
  result: string;
  rank: number;
  previousRank?: number;
  medal?: MedalType;
  isRecord: boolean;
  recordType?: 'world' | 'olympic' | 'national';
  eventName: string;
  updatedAt: string;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

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

export default function ResultRanking() {
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [rankingData, setRankingData] = useState<RankingRow[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const previousRanksRef = useRef<Record<string, number>>({});

  const { results, events, athletes } = useAppStore();

  const eventCategories = useMemo(() => {
    const categories = new Set(events.map(e => e.category));
    return ['all', ...Array.from(categories)];
  }, [events]);

  const countries = useMemo(() => {
    const countrySet = new Set(athletes.map(a => a.country));
    return ['all', ...Array.from(countrySet)];
  }, [athletes]);

  const processResults = useMemo(() => {
    return (results: Result[], selectedEvent: string, selectedCountry: string): RankingRow[] => {
      let filteredResults = results;

      if (selectedEvent !== 'all') {
        const eventIds = events.filter(e => e.category === selectedEvent).map(e => e.id);
        filteredResults = filteredResults.filter(r => eventIds.includes(r.scheduleId));
      }

      if (selectedCountry !== 'all') {
        filteredResults = filteredResults.filter(r => r.country === selectedCountry);
      }

      const sortedResults = [...filteredResults]
        .filter(r => r.rank > 0)
        .sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      return sortedResults.map(r => {
        const event = events.find(e => e.id === r.scheduleId);
        return {
          athleteId: r.athleteId,
          athleteName: r.athleteName,
          country: r.country,
          countryCode: athletes.find(a => a.id === r.athleteId)?.countryCode || '',
          result: r.result,
          rank: r.rank,
          previousRank: previousRanksRef.current[r.athleteId],
          medal: r.medal,
          isRecord: r.isRecord,
          recordType: r.recordType,
          eventName: event?.name || '',
          updatedAt: r.createdAt,
        };
      });
    };
  }, [events, athletes]);

  useEffect(() => {
    const data = processResults(results, selectedEvent, selectedCountry);
    
    const previousRanks: Record<string, number> = {};
    rankingData.forEach(r => {
      previousRanks[r.athleteId] = r.rank;
    });
    previousRanksRef.current = previousRanks;

    setRankingData(data);
    setLastUpdate(new Date());

    if (data.length > 0) {
      setHighlightedId(data[0].athleteId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  }, [selectedEvent, selectedCountry, results]);

  useEffect(() => {
    const interval = setInterval(() => {
      const data = processResults(results, selectedEvent, selectedCountry);
      
      const previousRanks: Record<string, number> = {};
      rankingData.forEach(r => {
        previousRanks[r.athleteId] = r.rank;
      });
      previousRanksRef.current = previousRanks;

      setRankingData(data);
      setLastUpdate(new Date());

      if (data.length > 0) {
        setHighlightedId(data[0].athleteId);
        setTimeout(() => setHighlightedId(null), 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedEvent, selectedCountry, results, processResults, rankingData]);

  const top10Data = useMemo(() => {
    return rankingData.slice(0, 10).map(r => ({
      name: r.athleteName.substring(0, 6),
      成绩: parseFloat(r.result) || 0,
      country: r.countryCode,
    }));
  }, [rankingData]);

  const countryMedalData = useMemo(() => {
    const countryMedals: Record<string, { name: string; value: number }> = {};
    rankingData
      .filter(r => r.medal)
      .forEach(r => {
        if (!countryMedals[r.country]) {
          countryMedals[r.country] = { name: r.country, value: 0 };
        }
        countryMedals[r.country].value++;
      });
    return Object.values(countryMedals).sort((a, b) => b.value - a.value);
  }, [rankingData]);

  const getRankChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === current) return null;
    if (previous > current) return 'up';
    if (previous < current) return 'down';
    return null;
  };

  const getMedalIcon = (medal?: MedalType) => {
    if (!medal) return null;
    const iconMap = {
      gold: LucideIcons.Medal,
      silver: LucideIcons.Medal,
      bronze: LucideIcons.Medal,
    };
    const Icon = iconMap[medal];
    const colorMap = {
      gold: 'text-yellow-500',
      silver: 'text-slate-400',
      bronze: 'text-amber-600',
    };
    return <Icon className={cn('w-5 h-5', colorMap[medal])} />;
  };

  const getRecordBadge = (isRecord: boolean, recordType?: 'world' | 'olympic' | 'national') => {
    if (!isRecord) return null;
    const labelMap: Record<string, string> = {
      world: 'WR',
      olympic: 'OR',
      national: 'NR',
    };
    return (
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full"
      >
        {labelMap[recordType || 'national']}
      </motion.span>
    );
  };

  const getRankStyle = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="实时排名"
        description="查看最新比赛成绩排名，实时更新"
        icon={LucideIcons.Trophy}
        showBackButton
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LucideIcons.RefreshCw className={cn(
              'w-4 h-4',
              true && 'animate-spin'
            )} />
            最后更新: {formatDate(lastUpdate, 'HH:mm:ss')}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <LucideIcons.Filter className="w-4 h-4" />
                项目筛选
              </h3>
              <div className="space-y-1">
                {eventCategories.map((category) => (
                  <motion.button
                  key={category}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedEvent(category)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    selectedEvent === category
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {category === 'all' ? '全部项目' : category}
                </motion.button>
              ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <LucideIcons.Globe className="w-4 h-4" />
                国家/地区
              </h3>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="all">全部国家</option>
                {countries.filter(c => c !== 'all').map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">前10名成绩对比</h3>
                  <p className="text-sm text-slate-500 mt-0.5">按成绩排序</p>
                </div>
                <LucideIcons.BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-64">
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
                      formatter={(value: number) => [value.toFixed(2), '成绩']}
                    />
                    <Bar dataKey="成绩" radius={[6, 6, 0, 0]}>
                      {top10Data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">各国奖牌分布</h3>
                  <p className="text-sm text-slate-500 mt-0.5">按奖牌数量统计</p>
                </div>
                <LucideIcons.PieChart className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countryMedalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {countryMedalData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
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
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-slate-600 text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">排名列表</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  共 {rankingData.length} 条记录，每5秒自动刷新
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">运动员</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">国家/地区</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">项目</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">成绩</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">奖牌</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">破纪录</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {rankingData.map((row, index) => {
                        const rankChange = getRankChange(row.rank, row.previousRank);
                        const isHighlighted = highlightedId === row.athleteId;
                        
                        return (
                          <motion.tr
                            key={row.athleteId}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              backgroundColor: isHighlighted 
                                ? ['rgb(254, 243, 199)', 'rgba(255, 255, 255)']
                                : 'rgba(255, 255, 255, 1)',
                              transition: {
                                duration: 0.5,
                              },
                            }}
                            exit={{ opacity: 0, y: 10 }}
                            className={cn(
                              'transition-colors',
                              row.rank <= 3 && getRankStyle(row.rank).includes('from-yellow') ? 'bg-gradient-to-r from-yellow-50/30 to-transparent' : '',
                              isHighlighted && 'bg-yellow-50'
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  layout
                                  className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                                    getRankStyle(row.rank)
                                  )}
                                  animate={{ scale: isHighlighted ? [1, 1.2, 1] : 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {row.rank}
                                </motion.div>
                                {rankChange && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn(
                                      'flex items-center gap-0.5 text-xs font-medium',
                                      rankChange === 'up' ? 'text-green-500' : 'text-red-500'
                                    )}
                                  >
                                    {rankChange === 'up' ? (
                                      <LucideIcons.TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <LucideIcons.TrendingDown className="w-3 h-3" />
                                    )}
                                    {row.previousRank && Math.abs(row.rank - row.previousRank)}
                                  </motion.div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20athlete%20portrait&image_size=square`}
                                  alt={row.athleteName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                  <p className={cn(
                                    'font-medium',
                                    row.rank <= 3 ? 'text-slate-900' : 'text-slate-700'
                                  )}>
                                    {row.athleteName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full"
                                  style={{ backgroundColor: countryColors[row.countryCode] || '#6B7280' }}
                                />
                                <span className="text-slate-600">{row.country}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">
                              {row.eventName}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <motion.span
                                key={row.result}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-mono font-bold text-slate-900"
                              >
                                {row.result}
                              </motion.span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getMedalIcon(row.medal)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getRecordBadge(row.isRecord, row.recordType)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              {rankingData.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <LucideIcons.Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>暂无排名数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
