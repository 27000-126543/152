import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  MapPin,
  Thermometer,
  Users,
  AlertTriangle,
  Bell,
  Phone,
  Filter,
  Clock,
  Target,
  RefreshCw,
  ChevronDown,
  ShieldAlert,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAppStore } from '@/store/useAppStore';
import { cn, formatDate, formatTime } from '@/utils';
import type { Venue, SecurityPersonnel } from '@/types';

interface TrendDataPoint {
  time: string;
  人数: number;
  阈值: number;
}

interface VenueMarker {
  venue: Venue;
  x: number;
  y: number;
  density: number;
  count: number;
  isAbnormal: boolean;
}

export default function Heatmap() {
  const {
    venues,
    securityPersonnel,
    crowdHeatmapData,
    crowdDensityData,
    updateCrowdData,
    updateLocation,
    pushNotification,
  } = useAppStore();

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  const [densityThreshold, setDensityThreshold] = useState<number>(70);
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<SecurityPersonnel | null>(null);
  const [showVenueDetail, setShowVenueDetail] = useState(false);

  const mapWidth = 800;
  const mapHeight = 600;

  useEffect(() => {
    venues.forEach((venue) => {
      updateCrowdData(venue.id);
    });
  }, [venues, updateCrowdData]);

  useEffect(() => {
    const interval = setInterval(() => {
      venues.forEach((venue) => {
        updateCrowdData(venue.id);
      });
      refreshTrendData();
    }, 3000);

    return () => clearInterval(interval);
  }, [venues, updateCrowdData, selectedVenueId, densityThreshold]);

  const refreshTrendData = useCallback(() => {
    const data: TrendDataPoint[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const baseCount = selectedVenueId === 'all'
        ? venues.reduce((sum, v) => {
            const d = crowdDensityData[v.id];
            return sum + (d?.count || 0);
          }, 0) / venues.length
        : (crowdDensityData[selectedVenueId]?.count || 0);

      const variation = Math.floor((Math.random() - 0.5) * 200);
      data.push({
        time: formatTime(time),
        人数: Math.max(0, Math.floor(baseCount + variation)),
        阈值: densityThreshold * 10,
      });
    }
    setTrendData(data);
  }, [selectedVenueId, densityThreshold, venues, crowdDensityData]);

  useEffect(() => {
    refreshTrendData();
  }, [refreshTrendData]);

  const venueMarkers = useMemo<VenueMarker[]>(() => {
    return venues.map((venue, index) => {
      const angle = (index / venues.length) * 2 * Math.PI;
      const radius = Math.min(mapWidth, mapHeight) * 0.35;
      const centerX = mapWidth / 2;
      const centerY = mapHeight / 2;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const crowdData = crowdDensityData[venue.id];
      const density = crowdData?.density || 0;
      const count = crowdData?.count || 0;

      return {
        venue,
        x,
        y,
        density,
        count,
        isAbnormal: density >= densityThreshold,
      };
    });
  }, [venues, crowdDensityData, densityThreshold, mapWidth, mapHeight]);

  const filteredMarkers = useMemo(() => {
    if (selectedVenueId === 'all') return venueMarkers;
    return venueMarkers.filter((m) => m.venue.id === selectedVenueId);
  }, [venueMarkers, selectedVenueId]);

  const heatmapPoints = useMemo(() => {
    if (selectedVenueId === 'all') {
      return Object.values(crowdHeatmapData).flat();
    }
    return crowdHeatmapData[selectedVenueId] || [];
  }, [crowdHeatmapData, selectedVenueId]);

  const stats = useMemo(() => {
    const totalPeople = venueMarkers.reduce((sum, m) => sum + m.count, 0);
    const avgDensity = venueMarkers.length > 0
      ? Math.floor(venueMarkers.reduce((sum, m) => sum + m.density, 0) / venueMarkers.length)
      : 0;
    const abnormalCount = venueMarkers.filter((m) => m.isAbnormal).length;
    const onDutyPersonnel = securityPersonnel.filter(
      (p) => p.status === 'patrolling' || p.status === 'emergency'
    ).length;

    return [
      {
        icon: <Users className="w-6 h-6" />,
        label: '总人数',
        value: totalPeople.toLocaleString(),
        gradient: 'primary' as const,
      },
      {
        icon: <Thermometer className="w-6 h-6" />,
        label: '平均密度',
        value: `${avgDensity}%`,
        gradient: 'warning' as const,
      },
      {
        icon: <AlertTriangle className="w-6 h-6" />,
        label: '异常场馆',
        value: abnormalCount,
        gradient: 'danger' as const,
      },
      {
        icon: <ShieldAlert className="w-6 h-6" />,
        label: '在岗安保',
        value: onDutyPersonnel,
        gradient: 'success' as const,
      },
    ];
  }, [venueMarkers, securityPersonnel]);

  const getDensityColor = (density: number): string => {
    if (density < 30) return '#10B981';
    if (density < 60) return '#FBBF24';
    if (density < 80) return '#F97316';
    return '#EF4444';
  };

  const getDensityOpacity = (value: number): number => {
    return 0.3 + (value / 100) * 0.7;
  };

  const handleVenueClick = (marker: VenueMarker) => {
    setSelectedVenue(marker.venue);
    setShowVenueDetail(true);
    setSelectedVenueId(marker.venue.id);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    venues.forEach((venue) => {
      updateCrowdData(venue.id);
    });
    refreshTrendData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCallSecurity = (personnel: SecurityPersonnel) => {
    setSelectedPersonnel(personnel);
    setShowCallDialog(true);
  };

  const confirmCallSecurity = () => {
    if (selectedPersonnel && selectedVenue) {
      updateLocation(selectedPersonnel.id, selectedVenue.location);
      pushNotification(
        selectedPersonnel.id,
        'system',
        '紧急呼叫',
        `请立即前往 ${selectedVenue.name} 处理人流异常`,
        selectedVenue.id,
        'venue'
      );
      setShowCallDialog(false);
      setSelectedPersonnel(null);
    }
  };

  const availablePersonnel = useMemo(() => {
    return securityPersonnel.filter((p) => p.status === 'patrolling' || p.status === 'idle');
  }, [securityPersonnel]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="安保热力图"
        description="实时监控各场馆人流密度，及时发现异常情况"
        icon={Thermometer}
        actions={
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            刷新数据
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'bg-white rounded-2xl p-5 border border-slate-100 shadow-sm',
              stat.gradient === 'primary' && 'border-l-4 border-l-blue-500',
              stat.gradient === 'warning' && 'border-l-4 border-l-amber-500',
              stat.gradient === 'danger' && 'border-l-4 border-l-red-500',
              stat.gradient === 'success' && 'border-l-4 border-l-green-500'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={cn(
                'p-3 rounded-xl',
                stat.gradient === 'primary' && 'bg-blue-50 text-blue-500',
                stat.gradient === 'warning' && 'bg-amber-50 text-amber-500',
                stat.gradient === 'danger' && 'bg-red-50 text-red-500',
                stat.gradient === 'success' && 'bg-green-50 text-green-500'
              )}>
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-900">场馆热力分布</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              实时更新中
            </div>
          </div>

          <div className="relative p-4">
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              className="w-full h-auto"
              style={{ maxHeight: '600px' }}
            >
              <defs>
                <radialGradient id="heatGradient">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#F97316" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#FBBF24" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                x="0"
                y="0"
                width={mapWidth}
                height={mapHeight}
                fill="#F8FAFC"
                rx="16"
              />

              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={(mapHeight / 10) * i}
                  x2={mapWidth}
                  y2={(mapHeight / 10) * i}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={(mapWidth / 10) * i}
                  y1="0"
                  x2={(mapWidth / 10) * i}
                  y2={mapHeight}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {heatmapPoints.map((point, index) => {
                const x = ((point.lng - 116.35) / 0.1) * mapWidth;
                const y = ((39.95 - point.lat) / 0.1) * mapHeight;
                const radius = 30 + point.value * 0.5;

                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="url(#heatGradient)"
                    opacity={getDensityOpacity(point.value)}
                    style={{
                      mixBlendMode: 'multiply',
                    }}
                  />
                );
              })}

              <line
                x1={mapWidth / 2}
                y1={0}
                x2={mapWidth / 2}
                y2={mapHeight}
                stroke="#94A3B8"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.5"
              />
              <line
                x1={0}
                y1={mapHeight / 2}
                x2={mapWidth}
                y2={mapHeight / 2}
                stroke="#94A3B8"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.5"
              />

              {filteredMarkers.map((marker) => (
                <g
                  key={marker.venue.id}
                  onClick={() => handleVenueClick(marker)}
                  className="cursor-pointer"
                >
                  {marker.isAbnormal && (
                    <motion.circle
                      cx={marker.x}
                      cy={marker.y}
                      r="35"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="3"
                      initial={{ scale: 0.8, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="28"
                    fill={getDensityColor(marker.density)}
                    opacity="0.2"
                  />

                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="22"
                    fill={getDensityColor(marker.density)}
                    filter={marker.isAbnormal ? 'url(#glow)' : undefined}
                    className={cn(
                      'transition-all duration-300',
                      marker.isAbnormal && 'animate-pulse'
                    )}
                  />

                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="18"
                    fill="white"
                  />

                  <text
                    x={marker.x}
                    y={marker.y + 5}
                    textAnchor="middle"
                    className="text-xs font-bold"
                    fill={getDensityColor(marker.density)}
                  >
                    {marker.density}%
                  </text>

                  <text
                    x={marker.x}
                    y={marker.y + 50}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#334155"
                  >
                    {marker.venue.name}
                  </text>
                </g>
              ))}

              <circle
                cx={mapWidth / 2}
                cy={mapHeight / 2}
                r="12"
                fill="#3B82F6"
                filter="url(#glow)"
              />
              <text
                x={mapWidth / 2}
                y={mapHeight / 2 + 4}
                textAnchor="middle"
                className="text-xs font-bold"
                fill="white"
              >
                中
              </text>
              <text
                x={mapWidth / 2}
                y={mapHeight / 2 + 30}
                textAnchor="middle"
                className="text-xs font-medium"
                fill="#3B82F6"
              >
                指挥中心
              </text>
            </svg>

            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-600 mb-2">密度图例</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                <div className="flex items-center justify-between w-24 text-xs text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-6"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900">筛选条件</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">选择场馆</label>
                <div className="relative">
                  <select
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">全部场馆</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    时间范围
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['1h', '6h', '24h'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        timeRange === range
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {range === '1h' ? '1小时' : range === '6h' ? '6小时' : '24小时'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    密度阈值
                  </span>
                  <span className="font-bold text-blue-500">{densityThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={densityThreshold}
                  onChange={(e) => setDensityThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900">人流趋势</h3>
              </div>
              <span className="text-xs text-slate-400">近1小时</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="time"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="人数"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="阈值"
                    stroke="#EF4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-slate-900">场馆状态</h3>
              </div>
              <span className="text-xs text-slate-400">共 {venues.length} 个</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {venueMarkers.map((marker) => (
                <motion.div
                  key={marker.venue.id}
                  whileHover={{ x: 4 }}
                  onClick={() => handleVenueClick(marker)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors',
                    marker.isAbnormal
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getDensityColor(marker.density) }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{marker.venue.name}</p>
                      <p className="text-xs text-slate-500">{marker.count.toLocaleString()} 人</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-bold',
                      marker.isAbnormal ? 'text-red-500' : 'text-slate-600'
                    )}>
                      {marker.density}%
                    </span>
                    {marker.isAbnormal ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showVenueDetail && selectedVenue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowVenueDetail(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedVenue.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{selectedVenue.type} · 容量 {selectedVenue.capacity.toLocaleString()} 人</p>
                  </div>
                  <button
                    onClick={() => setShowVenueDetail(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const marker = venueMarkers.find((m) => m.venue.id === selectedVenue.id);
                  const crowdData = crowdDensityData[selectedVenue.id];
                  if (!marker || !crowdData) return null;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                          <p className="text-2xl font-bold text-blue-600">{crowdData.count.toLocaleString()}</p>
                          <p className="text-xs text-blue-500 mt-1">当前人数</p>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-xl">
                          <p className="text-2xl font-bold text-amber-600">{crowdData.density}%</p>
                          <p className="text-xs text-amber-500 mt-1">人流密度</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <p className="text-2xl font-bold text-slate-600">
                            {Math.floor((crowdData.count / selectedVenue.capacity) * 100)}%
                          </p>
                          <p className="text-xs text-slate-500 mt-1">容量占比</p>
                        </div>
                      </div>

                      {marker.isAbnormal && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-red-700">人流异常警告</p>
                            <p className="text-sm text-red-600">当前密度已超过阈值 {densityThreshold}%，请及时处理</p>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          呼叫安保人员
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {availablePersonnel.map((personnel) => (
                            <motion.div
                              key={personnel.id}
                              whileHover={{ x: 4 }}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={personnel.avatar}
                                  alt={personnel.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{personnel.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {personnel.status === 'patrolling' ? '巡逻中' : '待命'} · {personnel.phone}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCallSecurity(personnel)}
                                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                呼叫
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
                数据更新时间：{formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showCallDialog}
        onClose={() => setShowCallDialog(false)}
        onConfirm={confirmCallSecurity}
        title="确认呼叫安保人员"
        content={selectedPersonnel ? `确定要呼叫 ${selectedPersonnel.name} 前往 ${selectedVenue?.name} 吗？` : ''}
        confirmText="确认呼叫"
        confirmButtonClass="bg-blue-500 hover:bg-blue-600 shadow-blue-500/25"
      />
    </div>
  );
}
