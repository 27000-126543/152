import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ambulance,
  MapPin,
  AlertTriangle,
  Stethoscope,
  User,
  Phone,
  MessageSquare,
  FileText,
  Download,
  CheckCircle2,
  Activity,
  Users,
  Timer,
  BarChart3,
  AlertCircle,
  Check,
  ChevronRight,
  Navigation,
  HeartPulse,
  Pill,
  Search,
  Filter,
  TrendingUp,
  PieChart,
  Send,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAppStore } from '@/store/useAppStore';
import {
  cn,
  formatDate,
  formatTime,
  calculateDistance,
  exportToPDF,
} from '@/utils';
import type { MedicalRecord, MedicalStaff, Severity, MedicalStatus } from '@/types';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface StaffLocation {
  staffId: string;
  lat: number;
  lng: number;
  lastUpdate: string;
}

interface TreatmentFormData {
  diagnosis: string;
  treatment: string;
  medications: string;
  notes: string;
}

const severityColors: Record<Severity, { bg: string; border: string; text: string; dot: string }> = {
  mild: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-600', dot: 'bg-green-500' },
  moderate: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  severe: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-600', dot: 'bg-red-500' },
};

const severityLabels: Record<Severity, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
  critical: '危急',
};

const injuryTypeLabels: Record<string, string> = {
  sprain: '扭伤',
  strain: '拉伤',
  abrasion: '擦伤',
  heatstroke: '中暑',
  cardiac: '心脏不适',
  other: '其他',
};

const patientTypeLabels: Record<string, string> = {
  athlete: '运动员',
  audience: '观众',
  staff: '工作人员',
  volunteer: '志愿者',
};

const mapWidth = 700;
const mapHeight = 500;

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7C2D12', '#3B82F6', '#8B5CF6'];

export default function Dispatch() {
  const {
    medicalRecords,
    medicalStaff,
    dispatchNearestMedical,
    dispatchMedicalStaff,
    updateRecord,
    pushNotification,
  } = useAppStore();

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showConfirmDispatch, setShowConfirmDispatch] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [staffLocations, setStaffLocations] = useState<StaffLocation[]>([]);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormData>({
    diagnosis: '',
    treatment: '',
    medications: '',
    notes: '',
  });
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'stats'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  useEffect(() => {
    const locations: StaffLocation[] = medicalStaff.map((s) => ({
      staffId: s.id,
      lat: 39.9 + (Math.random() - 0.5) * 0.02,
      lng: 116.4 + (Math.random() - 0.5) * 0.02,
      lastUpdate: new Date().toISOString(),
    }));
    setStaffLocations(locations);

    const interval = setInterval(() => {
      setStaffLocations((prev) =>
        prev.map((loc) => ({
          ...loc,
          lat: loc.lat + (Math.random() - 0.5) * 0.002,
          lng: loc.lng + (Math.random() - 0.5) * 0.002,
          lastUpdate: new Date().toISOString(),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [medicalStaff]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCountdowns: Record<string, number> = {};

      pendingRecords.forEach((record) => {
        const createdAt = new Date(record.createdAt).getTime();
        const elapsed = Math.floor((now - createdAt) / 1000);
        const limit = record.severity === 'critical' ? 60 : record.severity === 'severe' ? 600 : record.severity === 'moderate' ? 1800 : 3600;
        newCountdowns[record.id] = Math.max(0, limit - elapsed);
      });

      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [medicalRecords]);

  const pendingRecords = useMemo(() => {
    return medicalRecords
      .filter((r) => r.status !== 'completed')
      .sort((a, b) => {
        const severityOrder: Severity[] = ['critical', 'severe', 'moderate', 'mild'];
        return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      });
  }, [medicalRecords]);

  const filteredRecords = useMemo(() => {
    let records = activeTab === 'pending' ? pendingRecords : medicalRecords;

    if (searchQuery) {
      records = records.filter(
        (r) =>
          r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.injuryType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterSeverity !== 'all') {
      records = records.filter((r) => r.severity === filterSeverity);
    }

    return records;
  }, [activeTab, pendingRecords, medicalRecords, searchQuery, filterSeverity]);

  const selectedRecord = useMemo(
    () => medicalRecords.find((r) => r.id === selectedRecordId) || null,
    [medicalRecords, selectedRecordId]
  );

  const selectedStaff = useMemo(
    () => medicalStaff.find((s) => s.id === selectedStaffId) || null,
    [medicalStaff, selectedStaffId]
  );

  const availableStaff = useMemo(
    () => medicalStaff.filter((s) => s.status === 'on-duty'),
    [medicalStaff]
  );

  const todayRecords = useMemo(() => {
    const today = formatDate(new Date(), 'yyyy-MM-dd');
    return medicalRecords.filter((r) => formatDate(r.createdAt, 'yyyy-MM-dd') === today);
  }, [medicalRecords]);

  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    let totalResponseTime = 0;
    let respondedCount = 0;

    todayRecords.forEach((r) => {
      typeCounts[r.injuryType] = (typeCounts[r.injuryType] || 0) + 1;
      if (r.responseTime) {
        totalResponseTime += r.responseTime;
        respondedCount++;
      }
    });

    const pieData = Object.entries(typeCounts).map(([name, value]) => ({
      name: injuryTypeLabels[name] || name,
      value,
    }));

    return {
      totalToday: todayRecords.length,
      bySeverity: {
        critical: todayRecords.filter((r) => r.severity === 'critical').length,
        severe: todayRecords.filter((r) => r.severity === 'severe').length,
        moderate: todayRecords.filter((r) => r.severity === 'moderate').length,
        mild: todayRecords.filter((r) => r.severity === 'mild').length,
      },
      avgResponseTime: respondedCount > 0 ? Math.round(totalResponseTime / respondedCount) : 0,
      pieData,
    };
  }, [todayRecords]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOverdue = (record: MedicalRecord): boolean => {
    const countdown = countdowns[record.id] || 0;
    return countdown <= 0 && record.status === 'reported';
  };

  const getEstimatedTime = (record: MedicalRecord, staff: MedicalStaff): number => {
    const staffLoc = staffLocations.find((l) => l.staffId === staff.id);
    if (!staffLoc) return 0;
    const distance = calculateDistance(
      record.location.lat,
      record.location.lng,
      staffLoc.lat,
      staffLoc.lng
    );
    return Math.ceil(distance * 15);
  };

  const handleAutoDispatch = useCallback((recordId: string) => {
    const result = dispatchNearestMedical(recordId);
    if (result) {
      setSelectedStaffId(result.staff.id);
      pushNotification(
        result.staff.id,
        'medical',
        '新的医疗任务',
        `您已被自动调度处理伤病事件，请尽快前往`,
        recordId,
        'medicalRecord'
      );
    }
    setShowConfirmDispatch(false);
  }, [dispatchNearestMedical, pushNotification]);

  const handleManualDispatch = useCallback((recordId: string, staffId: string) => {
    dispatchMedicalStaff(recordId, staffId);
    pushNotification(
      staffId,
      'medical',
      '新的医疗任务',
      `您已被调度处理伤病事件，请尽快前往`,
      recordId,
      'medicalRecord'
    );
    setShowConfirmDispatch(false);
  }, [dispatchMedicalStaff, pushNotification]);

  const handleCompleteTreatment = useCallback(() => {
    if (!selectedRecordId) return;

    const medications = treatmentForm.medications
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    updateRecord(selectedRecordId, {
      treatment: treatmentForm.treatment,
      medications,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    setShowTreatmentModal(false);
    setTreatmentForm({ diagnosis: '', treatment: '', medications: '', notes: '' });
  }, [selectedRecordId, treatmentForm, updateRecord]);

  const handleSendMessage = useCallback(() => {
    if (!selectedStaffId || !messageContent.trim()) return;

    pushNotification(
      selectedStaffId,
      'medical',
      '调度中心消息',
      messageContent,
      selectedRecordId || '',
      'medicalRecord'
    );

    setMessageContent('');
    setShowMessageModal(false);
  }, [selectedStaffId, messageContent, pushNotification, selectedRecordId]);

  const handleExportPDF = useCallback(() => {
    if (selectedRecordId) {
      exportToPDF('medical-record', `病历_${selectedRecordId.slice(0, 8)}`);
    }
  }, [selectedRecordId]);

  const mapToSvg = (lat: number, lng: number) => {
    const x = ((lng - 116.38) / 0.06) * mapWidth;
    const y = ((39.92 - lat) / 0.04) * mapHeight;
    return {
      x: Math.max(20, Math.min(mapWidth - 20, x)),
      y: Math.max(20, Math.min(mapHeight - 20, y)),
    };
  };

  const getTimelineSteps = (record: MedicalRecord) => {
    const steps: { status: MedicalStatus; title: string; description: string; time?: string }[] = [
      { status: 'reported', title: '已上报', description: '伤病信息已提交', time: formatTime(record.createdAt) },
    ];

    if (record.status === 'dispatched' || record.status === 'processing' || record.status === 'completed') {
      steps.push({ status: 'dispatched', title: '已调度', description: '医护人员已派出' });
    }

    if (record.status === 'processing' || record.status === 'completed') {
      steps.push({ status: 'processing', title: '处理中', description: '医护人员正在救治' });
    }

    if (record.status === 'completed' && record.completedAt) {
      steps.push({ status: 'completed', title: '已完成', description: '处理完成', time: formatTime(record.completedAt) });
    }

    return steps;
  };

  const assignedStaffForRecord = (record: MedicalRecord) => {
    return medicalStaff.find((s) => s.id === record.assignedMedicalId);
  };

  return (
    <div className="min-h-screen pb-8">
      <PageHeader
        title="医疗调度中心"
        description="实时监控伤病事件，智能调度医疗资源"
        icon={Ambulance}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['pending', 'all', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab === 'pending' ? `待处理 (${pendingRecords.length})` : tab === 'all' ? '全部记录' : '统计面板'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {activeTab === 'stats' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">今日伤病总数</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalToday}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-600">+12%</span>
                <span className="text-slate-500">较昨日</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">平均响应时间</p>
                  <p className="text-3xl font-bold text-green-600">{stats.avgResponseTime}秒</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Timer className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-slate-500">达标率 95%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">在岗医护人员</p>
                  <p className="text-3xl font-bold text-purple-600">{availableStaff.length}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-slate-500">共 {medicalStaff.length} 人</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">待处理事件</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingRecords.length}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {stats.bySeverity.critical > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    危急 {stats.bySeverity.critical}
                  </span>
                )}
                {stats.bySeverity.severe > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                    重度 {stats.bySeverity.severe}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-slate-900">严重程度分布</h3>
              </div>
              <div className="space-y-4">
                {(['critical', 'severe', 'moderate', 'mild'] as Severity[]).map((sev) => {
                  const count = stats.bySeverity[sev];
                  const percentage = stats.totalToday > 0 ? (count / stats.totalToday) * 100 : 0;
                  const colors = severityColors[sev];
                  return (
                    <div key={sev}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-3 h-3 rounded-full', colors.dot)} />
                          <span className="text-sm font-medium text-slate-700">{severityLabels[sev]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{count}</span>
                          <span className="text-xs text-slate-500">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn('h-full rounded-full', colors.bg.replace('50', '500'))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <PieChart className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-slate-900">伤病类型分布</h3>
              </div>
              <div className="h-64">
                {stats.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stats.pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-slate-900">医护人员工作负荷</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {medicalStaff.slice(0, 8).map((staff) => {
                const assignedCount = medicalRecords.filter(
                  (r) => r.assignedMedicalId === staff.id && r.status !== 'completed'
                ).length;
                const todayTreated = medicalRecords.filter(
                  (r) =>
                    r.assignedMedicalId === staff.id &&
                    r.status === 'completed' &&
                    formatDate(r.createdAt, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd')
                ).length;
                const workload = Math.min(100, (assignedCount / 4) * 100);
                return (
                  <div key={staff.id} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{staff.name}</p>
                        <p className="text-xs text-slate-500 truncate">{staff.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">工作负荷</span>
                      <span className={cn(
                        'font-medium',
                        workload > 75 ? 'text-red-600' : workload > 50 ? 'text-orange-600' : 'text-green-600'
                      )}>
                        {workload}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          workload > 75 ? 'bg-red-500' : workload > 50 ? 'bg-orange-500' : 'bg-green-500'
                        )}
                        style={{ width: `${workload}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>处理中: {assignedCount}</span>
                      <span>今日完成: {todayTreated}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索患者姓名或伤病类型..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Filter className="w-4 h-4 text-slate-400 mt-2" />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterSeverity('all')}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      filterSeverity === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    全部
                  </button>
                  {(['critical', 'severe', 'moderate', 'mild'] as Severity[]).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setFilterSeverity(sev)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all',
                        filterSeverity === sev
                          ? `${severityColors[sev].bg.replace('50', '500')} text-white`
                          : `${severityColors[sev].bg} ${severityColors[sev].text}`
                      )}
                    >
                      {severityLabels[sev]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-slate-900">
                    {activeTab === 'pending' ? '待处理事件' : '全部记录'}
                  </h3>
                  <span className="ml-auto px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {filteredRecords.length}
                  </span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                {filteredRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>暂无记录</p>
                  </div>
                ) : (
                  filteredRecords.map((record, index) => {
                    const colors = severityColors[record.severity];
                    const overdue = isOverdue(record);
                    const countdown = countdowns[record.id] || 0;
                    const assignedStaff = assignedStaffForRecord(record);
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedRecordId(record.id)}
                        className={cn(
                          'p-4 border-l-4 cursor-pointer transition-all hover:bg-slate-50',
                          colors.border,
                          colors.bg,
                          selectedRecordId === record.id && 'bg-slate-50',
                          overdue && record.status === 'reported' && 'animate-pulse'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2.5 h-2.5 rounded-full', colors.dot, overdue && 'animate-ping')} />
                            <span className={cn('text-xs font-medium', colors.text)}>
                              {severityLabels[record.severity]}
                            </span>
                          </div>
                          {record.status === 'reported' && (
                            <div className={cn(
                              'px-2 py-0.5 rounded text-xs font-mono font-bold',
                              countdown <= 60 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            )}>
                              {formatCountdown(countdown)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{record.patientName}</span>
                          <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full text-slate-600">
                            {patientTypeLabels[record.patientType]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {injuryTypeLabels[record.injuryType] || record.injuryType}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{record.location.description || '已标记位置'}</span>
                          </div>
                          <span>{formatTime(record.createdAt)}</span>
                        </div>
                        {assignedStaff && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={assignedStaff.avatar}
                              alt={assignedStaff.name}
                              className="w-5 h-5 rounded-full"
                            />
                            <span className="text-xs text-slate-600">{assignedStaff.name} 处理中</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900">实时位置地图</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-slate-600">伤病位置</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-slate-600">医护人员</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative p-4">
                <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-auto">
                  <defs>
                    <pattern id="dispatch-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    </pattern>
                    <filter id="dispatch-glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <rect width={mapWidth} height={mapHeight} fill="#F8FAFC" />
                  <rect width={mapWidth} height={mapHeight} fill="url(#dispatch-grid)" />

                  <rect x="100" y="80" width="150" height="100" rx="8" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" opacity="0.5" />
                  <text x="175" y="135" textAnchor="middle" fill="#1E40AF" fontSize="14" fontWeight="500">主体育场</text>

                  <rect x="320" y="60" width="120" height="80" rx="8" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" opacity="0.5" />
                  <text x="380" y="105" textAnchor="middle" fill="#065F46" fontSize="14" fontWeight="500">游泳馆</text>

                  <rect x="80" y="230" width="130" height="90" rx="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
                  <text x="145" y="280" textAnchor="middle" fill="#92400E" fontSize="14" fontWeight="500">体操馆</text>

                  <rect x="350" y="220" width="140" height="100" rx="8" fill="#FCE7F3" stroke="#EC4899" strokeWidth="2" opacity="0.5" />
                  <text x="420" y="275" textAnchor="middle" fill="#9D174D" fontSize="14" fontWeight="500">球类馆</text>

                  <line x1="250" y1="180" x2="320" y2="140" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="8 4" />
                  <line x1="250" y1="180" x2="210" y2="230" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="8 4" />
                  <line x1="250" y1="180" x2="350" y2="220" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="8 4" />

                  {pendingRecords.map((record) => {
                    const pos = mapToSvg(record.location.lat, record.location.lng);
                    const colors = severityColors[record.severity];
                    return (
                      <g key={record.id} onClick={() => setSelectedRecordId(record.id)} className="cursor-pointer">
                        <motion.circle
                          cx={pos.x}
                          cy={pos.y}
                          r="25"
                          fill={colors.dot.replace('bg-', '#').replace('-500', '')}
                          opacity="0.3"
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="18"
                          fill={colors.dot.replace('bg-', '#').replace('-500', '')}
                          filter="url(#dispatch-glow)"
                          className={record.severity === 'critical' ? 'animate-pulse' : ''}
                        />
                        <circle cx={pos.x} cy={pos.y} r="10" fill="white" />
                        <HeartPulse
                          style={{ transform: `translate(${pos.x - 7}px, ${pos.y - 7}px)` }}
                          size={14}
                          fill="white"
                        />
                        {selectedRecordId === record.id && (
                          <g>
                            <rect
                              x={pos.x - 60}
                              y={pos.y - 55}
                              width="120"
                              height="30"
                              rx="6"
                              fill="white"
                              stroke={colors.dot.replace('bg-', '#').replace('-500', '')}
                              strokeWidth="2"
                            />
                            <text
                              x={pos.x}
                              y={pos.y - 35}
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="600"
                              fill="#1F2937"
                            >
                              {record.patientName}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {staffLocations.map((loc) => {
                    const staff = medicalStaff.find((s) => s.id === loc.staffId);
                    if (!staff || staff.status !== 'on-duty') return null;
                    const pos = mapToSvg(loc.lat, loc.lng);
                    const isSelected = selectedStaffId === loc.staffId;
                    return (
                      <g key={loc.staffId} className="cursor-pointer" onClick={() => setSelectedStaffId(loc.staffId)}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isSelected ? 16 : 12}
                          fill="#3B82F6"
                          filter="url(#dispatch-glow)"
                          className="transition-all"
                        />
                        <Navigation
                          style={{
                            transform: `translate(${pos.x - (isSelected ? 7 : 5)}px, ${pos.y - (isSelected ? 7 : 5)}px) rotate(45deg)`,
                          }}
                          size={isSelected ? 14 : 10}
                          color="white"
                        />
                        {isSelected && (
                          <g>
                            <rect
                              x={pos.x - 50}
                              y={pos.y - 45}
                              width="100"
                              height="25"
                              rx="6"
                              fill="white"
                              stroke="#3B82F6"
                              strokeWidth="2"
                            />
                            <text
                              x={pos.x}
                              y={pos.y - 27}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="600"
                              fill="#1F2937"
                            >
                              {staff.name}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {selectedRecord && selectedStaff && (
                    <>
                      {(() => {
                        const recordPos = mapToSvg(selectedRecord.location.lat, selectedRecord.location.lng);
                        const staffLoc = staffLocations.find((l) => l.staffId === selectedStaffId);
                        if (!staffLoc) return null;
                        const staffPos = mapToSvg(staffLoc.lat, staffLoc.lng);
                        return (
                          <line
                            x1={staffPos.x}
                            y1={staffPos.y}
                            x2={recordPos.x}
                            y2={recordPos.y}
                            stroke="#3B82F6"
                            strokeWidth="3"
                            strokeDasharray="8 4"
                            opacity="0.6"
                          />
                        );
                      })()}
                    </>
                  )}
                </svg>
              </div>
            </div>

            {selectedRecord && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-slate-900">处理进度</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRecord.status !== 'completed' && (
                      <>
                        <button
                          onClick={() => setShowMessageModal(true)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="发送消息"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowTreatmentModal(true)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="完成治疗"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowRecordModal(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="查看病历"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {getTimelineSteps(selectedRecord).map((step, index) => (
                      <div key={step.status} className="flex gap-4">
                        <div className="relative flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            {step.status === 'reported' && <AlertCircle className="w-5 h-5" />}
                            {step.status === 'dispatched' && <Ambulance className="w-5 h-5" />}
                            {step.status === 'processing' && <Stethoscope className="w-5 h-5" />}
                            {step.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                          </div>
                          {index < getTimelineSteps(selectedRecord).length - 1 && (
                            <div className="w-0.5 h-full min-h-16 bg-blue-200" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900">{step.title}</h4>
                            {step.time && (
                              <span className="text-sm text-slate-500">{step.time}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{step.description}</p>

                          {step.status === 'dispatched' && assignedStaffForRecord(selectedRecord) && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <img
                                  src={assignedStaffForRecord(selectedRecord)!.avatar}
                                  alt=""
                                  className="w-10 h-10 rounded-lg"
                                />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {assignedStaffForRecord(selectedRecord)!.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {assignedStaffForRecord(selectedRecord)!.specialty}
                                  </p>
                                </div>
                                <div className="ml-auto text-right">
                                  <p className="text-sm font-medium text-blue-600">
                                    预计 {getEstimatedTime(selectedRecord, assignedStaffForRecord(selectedRecord)!)} 分钟到达
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-slate-900">医护人员</h3>
                  </div>
                  <span className="text-xs text-slate-500">{availableStaff.length} 人在岗</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {availableStaff.map((staff, index) => {
                  const assignedCount = medicalRecords.filter(
                    (r) => r.assignedMedicalId === staff.id && r.status !== 'completed'
                  ).length;
                  const estimatedTime = selectedRecord ? getEstimatedTime(selectedRecord, staff) : 0;
                  return (
                    <motion.div
                      key={staff.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className={cn(
                        'p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50',
                        selectedStaffId === staff.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{staff.name}</p>
                          <p className="text-sm text-slate-500 truncate">{staff.specialty}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {assignedCount > 0 && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                                处理中 {assignedCount}
                              </span>
                            )}
                            {selectedRecord && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                                {estimatedTime} 分钟
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedRecord && selectedRecord.status === 'reported' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaffId(staff.id);
                              setShowConfirmDispatch(true);
                            }}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {selectedStaff && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={selectedStaff.avatar}
                    alt={selectedStaff.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-slate-900">{selectedStaff.name}</h4>
                    <p className="text-sm text-slate-500">{selectedStaff.specialty}</p>
                    <p className="text-xs text-slate-400 mt-1">执照: {selectedStaff.licenseNo}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">科室</span>
                    <span className="text-sm font-medium text-slate-900">{selectedStaff.department}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">状态</span>
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      在岗
                    </span>
                  </div>
                  {selectedRecord && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">距离</span>
                      <span className="text-sm font-medium text-blue-600">
                        {calculateDistance(
                          selectedRecord.location.lat,
                          selectedRecord.location.lng,
                          staffLocations.find((l) => l.staffId === selectedStaffId)?.lat || 39.9,
                          staffLocations.find((l) => l.staffId === selectedStaffId)?.lng || 116.4
                        ).toFixed(2)} km
                      </span>
                    </div>
                  )}
                  {selectedRecord && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-500">预计到达</span>
                      <span className="text-sm font-bold text-orange-600">
                        {getEstimatedTime(selectedRecord, selectedStaff)} 分钟
                      </span>
                    </div>
                  )}
                </div>

                {selectedRecord && selectedRecord.status === 'reported' && (
                  <button
                    onClick={() => setShowConfirmDispatch(true)}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    调度该医护人员
                  </button>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    消息
                  </button>
                  <button className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    呼叫
                  </button>
                </div>
              </motion.div>
            )}

            {selectedRecord && selectedRecord.status !== 'completed' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setSelectedStaffId(null);
                  setShowConfirmDispatch(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
              >
                <Ambulance className="w-5 h-5" />
                自动调度最近医护
              </motion.button>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title="电子病历"
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出PDF
            </button>
            <button
              onClick={() => setShowRecordModal(false)}
              className="px-5 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              关闭
            </button>
          </div>
        }
      >
        {selectedRecord && (
          <div id="medical-record" className="bg-white">
            <div className="text-center border-b-2 border-slate-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">电子病历</h2>
              <p className="text-slate-500 mt-1">病案号: {selectedRecord.id}</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500">患者姓名</p>
                  <p className="font-semibold text-slate-900">{selectedRecord.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">患者类型</p>
                  <p className="font-semibold text-slate-900">{patientTypeLabels[selectedRecord.patientType]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">年龄</p>
                  <p className="font-semibold text-slate-900">{selectedRecord.age} 岁</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">性别</p>
                  <p className="font-semibold text-slate-900">{selectedRecord.gender === 'male' ? '男' : '女'}</p>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-red-500" />
                    诊断信息
                  </h3>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    severityColors[selectedRecord.severity].bg,
                    severityColors[selectedRecord.severity].text
                  )}>
                    {severityLabels[selectedRecord.severity]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">伤病类型</p>
                    <p className="font-medium text-slate-900">
                      {injuryTypeLabels[selectedRecord.injuryType] || selectedRecord.injuryType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">发生时间</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedRecord.createdAt, 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">症状描述</p>
                  <p className="text-slate-700 leading-relaxed">{selectedRecord.symptoms}</p>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-500" />
                  发生地点
                </h3>
                <p className="text-slate-700">{selectedRecord.location.description || '已标记位置'}</p>
                <p className="text-xs text-slate-500 mt-2">
                  坐标: {selectedRecord.location.lat.toFixed(6)}, {selectedRecord.location.lng.toFixed(6)}
                </p>
              </div>

              {selectedRecord.treatment && (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-blue-500" />
                    治疗方案
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{selectedRecord.treatment}</p>
                </div>
              )}

              {selectedRecord.medications && selectedRecord.medications.length > 0 && (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Pill className="w-5 h-5 text-purple-500" />
                    用药记录
                  </h3>
                  <div className="space-y-2">
                    {selectedRecord.medications.map((med, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <Pill className="w-4 h-4 text-purple-500" />
                        <span className="text-slate-700">{med}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecord.assignedMedicalId && (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-orange-500" />
                    主治医生
                  </h3>
                  {(() => {
                    const doctor = assignedStaffForRecord(selectedRecord);
                    if (!doctor) return null;
                    return (
                      <div className="flex items-center gap-3">
                        <img src={doctor.avatar} alt={doctor.name} className="w-12 h-12 rounded-xl" />
                        <div>
                          <p className="font-medium text-slate-900">{doctor.name}</p>
                          <p className="text-sm text-slate-500">{doctor.specialty}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedRecord.status === 'completed' && selectedRecord.completedAt && (
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-green-700">治疗已完成</p>
                  <p className="text-sm text-green-600">{formatDate(selectedRecord.completedAt, 'yyyy-MM-dd HH:mm')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showConfirmDispatch}
        onClose={() => setShowConfirmDispatch(false)}
        onConfirm={() => {
          if (selectedStaffId && selectedRecordId) {
            handleManualDispatch(selectedRecordId, selectedStaffId);
          } else if (selectedRecordId) {
            handleAutoDispatch(selectedRecordId);
          }
        }}
        title={selectedStaffId ? '确认调度' : '自动调度确认'}
        content={
          selectedStaff && selectedRecord
            ? `确认调度 ${selectedStaff.name} 前往处理 ${selectedRecord.patientName} 的 ${injuryTypeLabels[selectedRecord.injuryType] || selectedRecord.injuryType}？预计 ${getEstimatedTime(selectedRecord, selectedStaff)} 分钟到达。`
            : selectedRecord
            ? `确认自动调度最近的医护人员处理 ${selectedRecord.patientName} 的伤病事件？`
            : ''
        }
        confirmText="确认调度"
        confirmButtonClass="bg-blue-500 hover:bg-blue-600 shadow-blue-500/25"
        icon={<Ambulance className="w-6 h-6 text-blue-500" />}
      />

      <Modal
        isOpen={showTreatmentModal}
        onClose={() => setShowTreatmentModal(false)}
        title="完成治疗记录"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowTreatmentModal(false)}
              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCompleteTreatment}
              className="px-5 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              确认完成
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">诊断结果</label>
            <textarea
              value={treatmentForm.diagnosis}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="请填写诊断结果..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">治疗方案</label>
            <textarea
              value={treatmentForm.treatment}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, treatment: e.target.value }))}
              placeholder="请填写治疗方案..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">用药记录（多个用逗号分隔）</label>
            <input
              type="text"
              value={treatmentForm.medications}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, medications: e.target.value }))}
              placeholder="例如：布洛芬, 阿莫西林"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">备注</label>
            <textarea
              value={treatmentForm.notes}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="其他需要记录的信息..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title="发送消息"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowMessageModal(false)}
              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!messageContent.trim()}
              className="px-5 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
        }
      >
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">消息内容</label>
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="请输入要发送给医护人员的消息..."
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
