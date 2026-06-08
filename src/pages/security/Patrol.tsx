import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Route,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Clock,
  Download,
  CheckCircle2,
  Navigation,
  ShieldAlert,
  FileText,
  List,
  Map,
  Settings,
  User,
  Calendar,
  Timer,
  Flag,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAppStore } from '@/store/useAppStore';
import { cn, formatDate, exportToPDF, generateUUID } from '@/utils';
import type { Venue, SecurityPersonnel, PatrolRoute } from '@/types';

interface PatrolPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  completed: boolean;
  estimatedTime: number;
}

interface PatrolRecord {
  id: string;
  routeId: string;
  venueName: string;
  personnelName: string;
  startTime: string;
  endTime?: string;
  status: 'ongoing' | 'completed' | 'cancelled';
  completedPoints: number;
  totalPoints: number;
  anomalies: string[];
}

export default function Patrol() {
  const {
    venues,
    securityPersonnel,
    patrolRoutes,
    generatePatrolRoute,
    adjustPatrolRoute,
    updateLocation,
    pushNotification,
  } = useAppStore();

  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [currentRoute, setCurrentRoute] = useState<PatrolRoute | null>(null);
  const [patrolPoints, setPatrolPoints] = useState<PatrolPoint[]>([]);
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [patrolInterval, setPatrolInterval] = useState<number | null>(null);
  const [patrolStartTime, setPatrolStartTime] = useState<string>('');
  const [patrolRecords, setPatrolRecords] = useState<PatrolRecord[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAnomalyDialog, setShowAnomalyDialog] = useState(false);
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [patrolIntervalTime, setPatrolIntervalTime] = useState(5);
  const [activeTab, setActiveTab] = useState<'map' | 'records'>('map');
  const [isGenerating, setIsGenerating] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapWidth = 800;
  const mapHeight = 500;

  useEffect(() => {
    const records: PatrolRecord[] = [
      {
        id: generateUUID(),
        routeId: 'R001',
        venueName: '主体育场',
        personnelName: '赵安保',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 86400000 + 3600000).toISOString(),
        status: 'completed',
        completedPoints: 6,
        totalPoints: 6,
        anomalies: [],
      },
      {
        id: generateUUID(),
        routeId: 'R002',
        venueName: '游泳馆',
        personnelName: '钱安保',
        startTime: new Date(Date.now() - 172800000).toISOString(),
        endTime: new Date(Date.now() - 172800000 + 2400000).toISOString(),
        status: 'completed',
        completedPoints: 5,
        totalPoints: 5,
        anomalies: ['发现可疑物品'],
      },
      {
        id: generateUUID(),
        routeId: 'R003',
        venueName: '体育馆',
        personnelName: '孙安保',
        startTime: new Date(Date.now() - 259200000).toISOString(),
        endTime: new Date(Date.now() - 259200000 + 3000000).toISOString(),
        status: 'completed',
        completedPoints: 6,
        totalPoints: 6,
        anomalies: [],
      },
    ];
    setPatrolRecords(records);
  }, []);

  const availablePersonnel = useMemo(() => {
    return securityPersonnel.filter((p) => p.status !== 'emergency');
  }, [securityPersonnel]);

  const mapPoints = useMemo(() => {
    if (patrolPoints.length === 0) return [];

    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    const radius = Math.min(mapWidth, mapHeight) * 0.35;

    return patrolPoints.map((point, index) => {
      const angle = (index / patrolPoints.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...point,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }, [patrolPoints, mapWidth, mapHeight]);

  const currentMapPosition = useMemo(() => {
    if (!currentPosition || mapPoints.length === 0) return null;

    const minLat = Math.min(...mapPoints.map((p) => p.lat));
    const maxLat = Math.max(...mapPoints.map((p) => p.lat));
    const minLng = Math.min(...mapPoints.map((p) => p.lng));
    const maxLng = Math.max(...mapPoints.map((p) => p.lng));

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    const x = ((currentPosition.lng - minLng) / lngRange) * mapWidth * 0.8 + mapWidth * 0.1;
    const y = ((maxLat - currentPosition.lat) / latRange) * mapHeight * 0.8 + mapHeight * 0.1;

    return { x, y };
  }, [currentPosition, mapPoints, mapWidth, mapHeight]);

  const estimatedTotalTime = useMemo(() => {
    return patrolPoints.reduce((sum, p) => sum + p.estimatedTime, 0);
  }, [patrolPoints]);

  const elapsedTime = useMemo(() => {
    if (!patrolStartTime || !isPatrolling) return 0;
    return Math.floor((Date.now() - new Date(patrolStartTime).getTime()) / 1000);
  }, [patrolStartTime, isPatrolling]);

  const completionRate = useMemo(() => {
    if (patrolPoints.length === 0) return 0;
    const completed = patrolPoints.filter((p) => p.completed).length;
    return Math.floor((completed / patrolPoints.length) * 100);
  }, [patrolPoints]);

  const handleGenerateRoute = useCallback(() => {
    if (!selectedVenueId || !selectedPersonnelId) return;

    setIsGenerating(true);

    setTimeout(() => {
      const route = generatePatrolRoute(selectedVenueId, selectedPersonnelId);
      setCurrentRoute(route);

      const venue = venues.find((v) => v.id === selectedVenueId);
      const baseLat = venue?.location.lat || 39.9;
      const baseLng = venue?.location.lng || 116.4;

      const points: PatrolPoint[] = route.waypoints.map((wp, index) => ({
        id: generateUUID(),
        name: `巡逻点 ${index + 1}`,
        lat: wp.lat,
        lng: wp.lng,
        completed: false,
        estimatedTime: patrolIntervalTime,
      }));

      setPatrolPoints(points);
      setCurrentPosition({ lat: baseLat, lng: baseLng });
      setIsGenerating(false);
    }, 1000);
  }, [selectedVenueId, selectedPersonnelId, generatePatrolRoute, venues, patrolIntervalTime]);

  const handleMovePoint = useCallback((index: number, direction: 'up' | 'down') => {
    setPatrolPoints((prev) => {
      const newPoints = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newPoints.length) return prev;

      [newPoints[index], newPoints[targetIndex]] = [newPoints[targetIndex], newPoints[index]];

      if (currentRoute) {
        const waypoints = newPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
        adjustPatrolRoute(currentRoute.id, waypoints);
      }

      return newPoints;
    });
  }, [currentRoute, adjustPatrolRoute]);

  const handleAddPoint = useCallback(() => {
    const venue = venues.find((v) => v.id === selectedVenueId);
    const baseLat = venue?.location.lat || 39.9;
    const baseLng = venue?.location.lng || 116.4;

    const newPoint: PatrolPoint = {
      id: generateUUID(),
      name: `巡逻点 ${patrolPoints.length + 1}`,
      lat: baseLat + (Math.random() - 0.5) * 0.01,
      lng: baseLng + (Math.random() - 0.5) * 0.01,
      completed: false,
      estimatedTime: patrolIntervalTime,
    };

    setPatrolPoints((prev) => {
      const newPoints = [...prev, newPoint];
      if (currentRoute) {
        const waypoints = newPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
        adjustPatrolRoute(currentRoute.id, waypoints);
      }
      return newPoints;
    });
  }, [selectedVenueId, venues, patrolPoints.length, patrolIntervalTime, currentRoute, adjustPatrolRoute]);

  const handleDeletePoint = useCallback((index: number) => {
    setPatrolPoints((prev) => {
      const newPoints = prev.filter((_, i) => i !== index);
      if (currentRoute) {
        const waypoints = newPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
        adjustPatrolRoute(currentRoute.id, waypoints);
      }
      return newPoints;
    });
  }, [currentRoute, adjustPatrolRoute]);

  const handleStartPatrol = useCallback(() => {
    if (patrolPoints.length === 0) return;

    setIsPatrolling(true);
    setIsPaused(false);
    setPatrolStartTime(new Date().toISOString());
    setCurrentPointIndex(0);

    const personnel = securityPersonnel.find((p) => p.id === selectedPersonnelId);
    if (personnel) {
      pushNotification(
        selectedPersonnelId,
        'system',
        '巡逻任务开始',
        `您在 ${venues.find((v) => v.id === selectedVenueId)?.name} 的巡逻任务已开始`,
        currentRoute?.id,
        'patrolRoute'
      );
    }
  }, [patrolPoints, selectedPersonnelId, selectedVenueId, venues, currentRoute, securityPersonnel, pushNotification]);

  const handlePausePatrol = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResumePatrol = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleStopPatrol = useCallback(() => {
    if (patrolInterval) {
      clearInterval(patrolInterval);
      setPatrolInterval(null);
    }

    const completed = patrolPoints.filter((p) => p.completed).length;
    const newRecord: PatrolRecord = {
      id: generateUUID(),
      routeId: currentRoute?.id || generateUUID(),
      venueName: venues.find((v) => v.id === selectedVenueId)?.name || '',
      personnelName: securityPersonnel.find((p) => p.id === selectedPersonnelId)?.name || '',
      startTime: patrolStartTime,
      endTime: new Date().toISOString(),
      status: completed === patrolPoints.length ? 'completed' : 'cancelled',
      completedPoints: completed,
      totalPoints: patrolPoints.length,
      anomalies: [],
    };
    setPatrolRecords((prev) => [newRecord, ...prev]);

    setIsPatrolling(false);
    setIsPaused(false);
    setCurrentPointIndex(0);
    setPatrolStartTime('');
  }, [patrolInterval, patrolPoints, currentRoute, venues, selectedVenueId, securityPersonnel, selectedPersonnelId, patrolStartTime]);

  useEffect(() => {
    if (!isPatrolling || isPaused || patrolPoints.length === 0) {
      if (patrolInterval) {
        clearInterval(patrolInterval);
        setPatrolInterval(null);
      }
      return;
    }

    const interval = window.setInterval(() => {
      if (currentPointIndex >= patrolPoints.length) {
        handleStopPatrol();
        return;
      }

      const currentPoint = patrolPoints[currentPointIndex];
      setCurrentPosition({ lat: currentPoint.lat, lng: currentPoint.lng });
      updateLocation(selectedPersonnelId, { lat: currentPoint.lat, lng: currentPoint.lng });

      setPatrolPoints((prev) =>
        prev.map((p, i) => (i === currentPointIndex ? { ...p, completed: true } : p))
      );

      setCurrentPointIndex((prev) => prev + 1);
    }, patrolIntervalTime * 1000);

    setPatrolInterval(interval);

    return () => {
      clearInterval(interval);
      setPatrolInterval(null);
    };
  }, [isPatrolling, isPaused, patrolPoints, currentPointIndex, patrolIntervalTime, selectedPersonnelId, updateLocation, handleStopPatrol]);

  const handleReportAnomaly = useCallback(() => {
    if (!anomalyDescription.trim()) return;

    const venue = venues.find((v) => v.id === selectedVenueId);
    const personnel = securityPersonnel.find((p) => p.id === selectedPersonnelId);

    pushNotification(
      'all',
      'system',
      '巡逻异常上报',
      `${personnel?.name} 在 ${venue?.name} 巡逻时发现：${anomalyDescription}`,
      currentRoute?.id,
      'patrolRoute'
    );

    setPatrolRecords((prev) =>
      prev.map((r) =>
        r.id === patrolRecords[0]?.id
          ? { ...r, anomalies: [...r.anomalies, anomalyDescription] }
          : r
      )
    );

    setAnomalyDescription('');
    setShowAnomalyDialog(false);
  }, [anomalyDescription, selectedVenueId, selectedPersonnelId, venues, securityPersonnel, pushNotification, currentRoute, patrolRecords]);

  const handleExportReport = useCallback(() => {
    exportToPDF('patrol-report', `巡逻报告_${formatDate(new Date(), 'yyyyMMdd')}`);
    setShowReportDialog(false);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟${secs}秒`;
    return `${secs}秒`;
  };

  const getPointColor = (point: PatrolPoint, index: number): string => {
    if (point.completed) return '#10B981';
    if (index === currentPointIndex && isPatrolling && !isPaused) return '#3B82F6';
    return '#94A3B8';
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="巡逻路线管理"
        description="智能生成最优巡逻路线，实时监控巡逻进度"
        icon={Route}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab(activeTab === 'map' ? 'records' : 'map')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {activeTab === 'map' ? (
                <><List className="w-4 h-4" /> 查看记录</>
              ) : (
                <><Map className="w-4 h-4" /> 返回地图</>
              )}
            </button>
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {activeTab === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="text-sm text-slate-600 mb-2 block flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    选择场馆
                  </label>
                  <select
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={isPatrolling}
                  >
                    <option value="">请选择场馆</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} (容量: {venue.capacity.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-sm text-slate-600 mb-2 block flex items-center gap-1">
                    <User className="w-4 h-4" />
                    安保人员
                  </label>
                  <select
                    value={selectedPersonnelId}
                    onChange={(e) => setSelectedPersonnelId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={isPatrolling}
                  >
                    <option value="">请选择安保人员</option>
                    {availablePersonnel.map((personnel) => (
                      <option key={personnel.id} value={personnel.id}>
                        {personnel.name} ({personnel.status === 'patrolling' ? '巡逻中' : '待命'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-slate-600 mb-2 block flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    巡逻间隔
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={patrolIntervalTime}
                    onChange={(e) => setPatrolIntervalTime(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={isPatrolling}
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleGenerateRoute}
                    disabled={!selectedVenueId || !selectedPersonnelId || isGenerating || isPatrolling}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <><Route className="w-4 h-4 animate-spin" /> 生成中...</>
                    ) : (
                      <><Route className="w-4 h-4" /> 生成路线</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900">巡逻路线图</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {isPatrolling && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-slate-600">
                            {isPaused ? '已暂停' : `巡逻中 (${currentPointIndex}/${patrolPoints.length})`}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500">
                          已用时: {formatDuration(elapsedTime)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div ref={mapRef} className="relative p-4" style={{ minHeight: '500px' }}>
                  <svg
                    viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                    className="w-full h-auto"
                  >
                    <defs>
                      <filter id="routeGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                      <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#94A3B8" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                      </linearGradient>
                    </defs>

                    <rect
                      x="0"
                      y="0"
                      width={mapWidth}
                      height={mapHeight}
                      fill="#F8FAFC"
                      rx="16"
                    />

                    {Array.from({ length: 8 }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={(mapHeight / 8) * i}
                        x2={mapWidth}
                        y2={(mapHeight / 8) * i}
                        stroke="#E2E8F0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={(mapWidth / 8) * i}
                        y1="0"
                        x2={(mapWidth / 8) * i}
                        y2={mapHeight}
                        stroke="#E2E8F0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {mapPoints.length > 1 && mapPoints.map((point, index) => {
                      if (index === mapPoints.length - 1) return null;
                      const nextPoint = mapPoints[index + 1];
                      const isCompleted = point.completed && nextPoint.completed;
                      const isCurrent = index === currentPointIndex - 1 && !point.completed;

                      return (
                        <g key={`line-${index}`}>
                          <line
                            x1={point.x}
                            y1={point.y}
                            x2={nextPoint.x}
                            y2={nextPoint.y}
                            stroke={isCompleted ? '#10B981' : '#CBD5E1'}
                            strokeWidth="4"
                            strokeLinecap="round"
                            opacity={isCompleted ? 1 : 0.5}
                          />
                          {isCurrent && isPatrolling && !isPaused && (
                            <motion.circle
                              cx={point.x}
                              cy={point.y}
                              r="6"
                              fill="#3B82F6"
                              initial={{ x: 0 }}
                              animate={{
                                x: [0, nextPoint.x - point.x],
                                y: [0, nextPoint.y - point.y],
                              }}
                              transition={{
                                duration: patrolIntervalTime,
                                ease: 'linear',
                                repeat: Infinity,
                              }}
                            />
                          )}
                        </g>
                      );
                    })}

                    {mapPoints.map((point, index) => (
                      <g key={point.id}>
                        {point.completed && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="20"
                            fill="#10B981"
                            opacity="0.2"
                          />
                        )}

                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="16"
                          fill={getPointColor(point, index)}
                          filter={index === currentPointIndex && isPatrolling && !isPaused ? 'url(#routeGlow)' : undefined}
                          className={cn(
                            'transition-all duration-300',
                            index === currentPointIndex && isPatrolling && !isPaused && 'animate-pulse'
                          )}
                        />

                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="12"
                          fill="white"
                        />

                        {point.completed ? (
                          <CheckCircle2
                            className="text-green-500"
                            style={{
                              transform: `translate(${point.x - 8}px, ${point.y - 8}px)`,
                            }}
                            size={16}
                          />
                        ) : (
                          <text
                            x={point.x}
                            y={point.y + 4}
                            textAnchor="middle"
                            className="text-xs font-bold"
                            fill={getPointColor(point, index)}
                          >
                            {index + 1}
                          </text>
                        )}

                        <text
                          x={point.x}
                          y={point.y + 35}
                          textAnchor="middle"
                          className="text-xs font-medium"
                          fill="#334155"
                        >
                          {point.name}
                        </text>
                      </g>
                    ))}

                    {currentMapPosition && isPatrolling && (
                      <g>
                        <motion.circle
                          cx={currentMapPosition.x}
                          cy={currentMapPosition.y}
                          r="24"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          initial={{ scale: 0.8, opacity: 1 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <circle
                          cx={currentMapPosition.x}
                          cy={currentMapPosition.y}
                          r="10"
                          fill="#3B82F6"
                          filter="url(#routeGlow)"
                        />
                        <Navigation
                          className="text-white"
                          style={{
                            transform: `translate(${currentMapPosition.x - 6}px, ${currentMapPosition.y - 6}px) rotate(45deg)`,
                          }}
                          size={12}
                        />
                      </g>
                    )}
                  </svg>

                  <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-100">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-slate-600">已完成</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-600">进行中</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-400" />
                        <span className="text-slate-600">待巡逻</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {!isPatrolling ? (
                      <button
                        onClick={handleStartPatrol}
                        disabled={patrolPoints.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        开始巡逻
                      </button>
                    ) : (
                      <>
                        {isPaused ? (
                          <button
                            onClick={handleResumePatrol}
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            继续巡逻
                          </button>
                        ) : (
                          <button
                            onClick={handlePausePatrol}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            暂停巡逻
                          </button>
                        )}
                        <button
                          onClick={handleStopPatrol}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                        >
                          <Square className="w-4 h-4" />
                          结束巡逻
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setShowAnomalyDialog(true)}
                      disabled={!isPatrolling}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      异常上报
                    </button>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
                      <p className="text-xs text-slate-500">完成率</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{estimatedTotalTime}分钟</p>
                      <p className="text-xs text-slate-500">预计时长</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{patrolPoints.length}</p>
                      <p className="text-xs text-slate-500">巡逻点</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <List className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-slate-900">巡逻点列表</h3>
                    </div>
                    <button
                      onClick={handleAddPoint}
                      disabled={!currentRoute || isPatrolling}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-500 text-sm rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      添加
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {patrolPoints.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                        <Route className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">请先生成巡逻路线</p>
                      </div>
                    ) : (
                      patrolPoints.map((point, index) => (
                        <motion.div
                          key={point.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl transition-colors',
                            point.completed
                              ? 'bg-green-50 border border-green-100'
                              : index === currentPointIndex && isPatrolling && !isPaused
                              ? 'bg-blue-50 border border-blue-100'
                              : 'bg-slate-50'
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              point.completed
                                ? 'bg-green-500 text-white'
                                : index === currentPointIndex && isPatrolling && !isPaused
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {point.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-medium truncate',
                              point.completed ? 'text-green-700' : 'text-slate-900'
                            )}>
                              {point.name}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {point.estimatedTime}分钟
                            </p>
                          </div>

                          {!isPatrolling && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMovePoint(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleMovePoint(index, 'down')}
                                disabled={index === patrolPoints.length - 1}
                                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDeletePoint(index)}
                                disabled={patrolPoints.length <= 2}
                                className="p-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {currentRoute && selectedVenueId && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="w-5 h-5 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">路线信息</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">场馆</span>
                        <span className="text-sm font-medium text-slate-900">
                          {venues.find((v) => v.id === selectedVenueId)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">安保人员</span>
                        <span className="text-sm font-medium text-slate-900">
                          {securityPersonnel.find((p) => p.id === selectedPersonnelId)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">巡逻点数</span>
                        <span className="text-sm font-medium text-slate-900">{patrolPoints.length} 个</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">预计时长</span>
                        <span className="text-sm font-medium text-blue-500">{estimatedTotalTime} 分钟</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-500">生成时间</span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatDate(currentRoute.generatedAt, 'MM-dd HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="records"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">总巡逻次数</p>
                    <p className="text-2xl font-bold text-slate-900">{patrolRecords.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">完成率</p>
                    <p className="text-2xl font-bold text-green-500">
                      {patrolRecords.length > 0
                        ? Math.floor(
                            (patrolRecords.filter((r) => r.status === 'completed').length /
                              patrolRecords.length) *
                              100
                          )
                        : 0}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">异常事件</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {patrolRecords.reduce((sum, r) => sum + r.anomalies.length, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">总巡逻点</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {patrolRecords.reduce((sum, r) => sum + r.totalPoints, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Flag className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-900">巡逻记录</h3>
                </div>
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出报告
                </button>
              </div>

              <div id="patrol-report">
                <div className="divide-y divide-slate-100">
                  {patrolRecords.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>暂无巡逻记录</p>
                    </div>
                  ) : (
                    patrolRecords.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              'p-2.5 rounded-xl',
                              record.status === 'completed' ? 'bg-green-50' : 'bg-slate-100'
                            )}>
                              {record.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-slate-900">{record.venueName}</h4>
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-xs font-medium',
                                  record.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                )}>
                                  {record.status === 'completed' ? '已完成' : '已取消'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 mt-1">
                                安保人员：{record.personnelName} · 完成 {record.completedPoints}/{record.totalPoints} 个巡逻点
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDate(record.startTime, 'yyyy-MM-dd HH:mm')} - {record.endTime ? formatDate(record.endTime, 'HH:mm') : ''}
                              </p>
                              {record.anomalies.length > 0 && (
                                <div className="mt-2 p-2 bg-red-50 rounded-lg">
                                  <p className="text-xs text-red-600 font-medium mb-1">异常事件：</p>
                                  {record.anomalies.map((a, i) => (
                                    <p key={i} className="text-xs text-red-500">• {a}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {Math.floor((record.completedPoints / record.totalPoints) * 100)}%
                            </p>
                            <p className="text-xs text-slate-400">完成率</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showAnomalyDialog}
        onClose={() => {
          setShowAnomalyDialog(false);
          setAnomalyDescription('');
        }}
        onConfirm={handleReportAnomaly}
        title="上报异常情况"
        content=""
        confirmText="确认上报"
        confirmButtonClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/25"
        icon={<AlertTriangle className="w-6 h-6 text-orange-500" />}
      >
        <div className="mt-4">
          <label className="text-sm text-slate-600 mb-2 block">异常描述</label>
          <textarea
            value={anomalyDescription}
            onChange={(e) => setAnomalyDescription(e.target.value)}
            placeholder="请描述发现的异常情况..."
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onConfirm={handleExportReport}
        title="导出巡逻报告"
        content="确定要导出当前巡逻记录报告为PDF文件吗？"
        confirmText="确认导出"
        confirmButtonClass="bg-blue-500 hover:bg-blue-600 shadow-blue-500/25"
        icon={<Download className="w-6 h-6 text-blue-500" />}
      />
    </div>
  );
}
