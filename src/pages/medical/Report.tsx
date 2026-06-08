import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  User,
  Calendar,
  AlertCircle,
  HeartPulse,
  Send,
  Clock,
  CheckCircle2,
  Activity,
  Ambulance,
  Stethoscope,
  FileText,
  Navigation,
  AlertTriangle,
  Flame,
  Thermometer,
  Bone,
  Droplets,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store/useAppStore';
import { cn, formatTime } from '@/utils';
import type { PatientType, Severity, MedicalRecord, MedicalStatus } from '@/types';

interface FormData {
  patientType: PatientType;
  patientName: string;
  age: string;
  gender: 'male' | 'female' | '';
  injuryType: string;
  severity: Severity;
  symptoms: string;
  location: { lat: number; lng: number; description: string };
}

interface TimelineStep {
  status: MedicalStatus;
  title: string;
  description: string;
  time?: string;
  completed: boolean;
  current: boolean;
}

const injuryTypes = [
  { value: 'sprain', label: '扭伤', icon: Bone, color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: 'strain', label: '拉伤', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
  { value: 'abrasion', label: '擦伤', icon: Droplets, color: 'text-red-400', bg: 'bg-red-50' },
  { value: 'heatstroke', label: '中暑', icon: Thermometer, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { value: 'cardiac', label: '心脏不适', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'other', label: '其他', icon: MoreHorizontal, color: 'text-slate-500', bg: 'bg-slate-50' },
];

const severityLevels = [
  { value: 'mild' as Severity, label: '轻度', color: 'bg-green-500', hoverColor: 'hover:bg-green-600', borderColor: 'border-green-500', textColor: 'text-green-500', bgLight: 'bg-green-50', icon: CheckCircle2, responseTime: '预约就诊' },
  { value: 'moderate' as Severity, label: '中度', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', borderColor: 'border-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-50', icon: AlertCircle, responseTime: '30分钟内响应' },
  { value: 'severe' as Severity, label: '重度', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600', borderColor: 'border-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-50', icon: AlertTriangle, responseTime: '10分钟内响应' },
  { value: 'critical' as Severity, label: '危急', color: 'bg-red-600', hoverColor: 'hover:bg-red-700', borderColor: 'border-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50', icon: Flame, responseTime: '立即调度' },
];

const patientTypes: { value: PatientType; label: string }[] = [
  { value: 'athlete', label: '运动员' },
  { value: 'audience', label: '观众' },
  { value: 'staff', label: '工作人员' },
  { value: 'volunteer', label: '志愿者' },
];

const mapWidth = 600;
const mapHeight = 400;

export default function Report() {
  const { reportInjury, dispatchNearestMedical, medicalStaff } = useAppStore();

  const [formData, setFormData] = useState<FormData>({
    patientType: 'athlete',
    patientName: '',
    age: '',
    gender: '',
    injuryType: '',
    severity: 'mild',
    symptoms: '',
    location: { lat: 39.9042, lng: 116.4074, description: '' },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<MedicalRecord | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<{ name: string; specialty: string; avatar: string; estimatedTime: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapMarker, setMapMarker] = useState<{ x: number; y: number } | null>(null);
  const [currentStep, setCurrentStep] = useState<MedicalStatus>('reported');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (submittedRecord) {
      const steps: MedicalStatus[] = ['reported', 'dispatched', 'processing', 'completed'];
      let stepIndex = 0;

      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < steps.length) {
          setCurrentStep(steps[stepIndex]);
        } else {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [submittedRecord]);

  const handleGetCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setTimeout(() => {
      const lat = 39.9 + (Math.random() - 0.5) * 0.02;
      const lng = 116.4 + (Math.random() - 0.5) * 0.02;
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, lat, lng },
      }));
      const x = ((lng - 116.38) / 0.06) * mapWidth;
      const y = ((39.92 - lat) / 0.04) * mapHeight;
      setMapMarker({ x: Math.max(20, Math.min(mapWidth - 20, x)), y: Math.max(20, Math.min(mapHeight - 20, y)) });
      setIsGettingLocation(false);
    }, 1000);
  }, []);

  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = mapWidth / rect.width;
    const scaleY = mapHeight / rect.height;
    const svgX = x * scaleX;
    const svgY = y * scaleY;
    setMapMarker({ x: svgX, y: svgY });
    const lng = 116.38 + (svgX / mapWidth) * 0.06;
    const lat = 39.92 - (svgY / mapHeight) * 0.04;
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, lat, lng },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.patientName || !formData.age || !formData.gender || !formData.injuryType || !formData.symptoms) {
      return;
    }

    setIsSubmitting(true);

    try {
      const record = reportInjury({
        patientId: `PAT-${Date.now()}`,
        patientType: formData.patientType,
        patientName: formData.patientName,
        age: parseInt(formData.age),
        gender: formData.gender,
        location: formData.location,
        injuryType: formData.injuryType,
        severity: formData.severity,
        symptoms: formData.symptoms,
        treatment: '',
        medications: [],
      });

      setSubmittedRecord(record);

      setTimeout(() => {
        const result = dispatchNearestMedical(record.id);
        if (result) {
          setAssignedStaff({
            name: result.staff.name,
            specialty: result.staff.specialty,
            avatar: result.staff.avatar,
            estimatedTime: result.estimatedTime,
          });
        }
        setIsSubmitting(false);
        setShowSuccess(true);
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
    }
  }, [formData, reportInjury, dispatchNearestMedical]);

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    const steps: { status: MedicalStatus; title: string; description: string }[] = [
      { status: 'reported', title: '已上报', description: '伤病信息已提交' },
      { status: 'dispatched', title: '已调度', description: '医护人员已派出' },
      { status: 'processing', title: '处理中', description: '医护人员正在救治' },
      { status: 'completed', title: '已完成', description: '处理完成' },
    ];

    const statusOrder: MedicalStatus[] = ['reported', 'dispatched', 'processing', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStep);

    return steps.map((step, index) => ({
      ...step,
      time: index <= currentIndex ? formatTime(new Date()) : undefined,
      completed: index < currentIndex,
      current: index === currentIndex,
    }));
  }, [currentStep]);

  const currentSeverity = severityLevels.find((s) => s.value === formData.severity)!;

  return (
    <div className="min-h-screen pb-8">
      <PageHeader
        title="伤病上报"
        description="快速上报伤病信息，智能调度医疗资源"
        icon={HeartPulse}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">患者信息</h3>
              </div>
              <p className="text-sm text-slate-500">请填写患者基本信息</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">患者类型</label>
                <div className="grid grid-cols-4 gap-3">
                  {patientTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData((prev) => ({ ...prev, patientType: type.value }))}
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                        formData.patientType === type.value
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">患者姓名</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
                    placeholder="请输入患者姓名"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={!!submittedRecord}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> 年龄
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="年龄"
                    min="1"
                    max="120"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={!!submittedRecord}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">性别</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, gender: 'male' }))}
                    className={cn(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                      formData.gender === 'male'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    )}
                    disabled={!!submittedRecord}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    男
                  </button>
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, gender: 'female' }))}
                    className={cn(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                      formData.gender === 'female'
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    )}
                    disabled={!!submittedRecord}
                  >
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    女
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Stethoscope className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">伤病信息</h3>
              </div>
              <p className="text-sm text-slate-500">请详细描述伤病情况</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-3 block">伤病类型</label>
                <div className="grid grid-cols-3 gap-3">
                  {injuryTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData((prev) => ({ ...prev, injuryType: type.value }))}
                        className={cn(
                          'p-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2',
                          formData.injuryType === type.value
                            ? `${type.bg} ${type.color} ring-2 ring-current ring-offset-2`
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        )}
                        disabled={!!submittedRecord}
                      >
                        <Icon className="w-6 h-6" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-3 block">严重程度</label>
                <div className="grid grid-cols-4 gap-3">
                  {severityLevels.map((level) => {
                    const Icon = level.icon;
                    return (
                      <button
                        key={level.value}
                        onClick={() => setFormData((prev) => ({ ...prev, severity: level.value }))}
                        className={cn(
                          'p-4 rounded-xl transition-all flex flex-col items-center gap-2 border-2',
                          formData.severity === level.value
                            ? `${level.color} text-white border-transparent shadow-lg`
                            : `bg-white ${level.textColor} ${level.borderColor} hover:${level.bgLight}`
                        )}
                        disabled={!!submittedRecord}
                      >
                        <Icon
                          className={cn(
                            'w-6 h-6',
                            formData.severity === level.value && level.value === 'critical' && 'animate-pulse'
                          )}
                        />
                        <span className="text-sm font-bold">{level.label}</span>
                        <span className={cn(
                          'text-xs',
                          formData.severity === level.value ? 'text-white/80' : 'text-slate-400'
                        )}>
                          {level.responseTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">症状描述</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="请详细描述患者的症状，如疼痛部位、持续时间、是否有外伤等..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  disabled={!!submittedRecord}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">位置信息</h3>
                  </div>
                  <p className="text-sm text-slate-500">标记伤病发生位置</p>
                </div>
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation || !!submittedRecord}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGettingLocation ? (
                    <>
                      <Navigation className="w-4 h-4 animate-spin" />
                      获取中...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      获取当前位置
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <svg
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                  className="w-full h-auto cursor-crosshair"
                  onClick={handleMapClick}
                >
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    </pattern>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <rect width={mapWidth} height={mapHeight} fill="#F8FAFC" />
                  <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

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

                  {mapMarker && (
                    <g>
                      <motion.circle
                        cx={mapMarker.x}
                        cy={mapMarker.y}
                        r="20"
                        fill={currentSeverity.color}
                        opacity="0.3"
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <circle
                        cx={mapMarker.x}
                        cy={mapMarker.y}
                        r="16"
                        fill={currentSeverity.color}
                        filter="url(#glow)"
                        className={formData.severity === 'critical' ? 'animate-pulse' : ''}
                      />
                      <circle cx={mapMarker.x} cy={mapMarker.y} r="8" fill="white" />
                      <MapPin
                        style={{
                          transform: `translate(${mapMarker.x - 8}px, ${mapMarker.y - 24}px)`,
                        }}
                        size={16}
                        color="white"
                      />
                    </g>
                  )}

                  {!mapMarker && (
                    <text x={mapWidth / 2} y={mapHeight / 2} textAnchor="middle" fill="#94A3B8" fontSize="16">
                      点击地图标记位置
                    </text>
                  )}
                </svg>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">位置描述</label>
                <input
                  type="text"
                  value={formData.location.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: { ...prev.location, description: e.target.value },
                    }))
                  }
                  placeholder="例如：主体育场A区看台3排"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  disabled={!!submittedRecord}
                />
              </div>

              {formData.location.lat && formData.location.lng && (
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>纬度: {formData.location.lat.toFixed(6)}</span>
                  <span>经度: {formData.location.lng.toFixed(6)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {!submittedRecord && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-end gap-3"
            >
              <button
                onClick={() => {
                  setFormData({
                    patientType: 'athlete',
                    patientName: '',
                    age: '',
                    gender: '',
                    injuryType: '',
                    severity: 'mild',
                    symptoms: '',
                    location: { lat: 39.9042, lng: 116.4074, description: '' },
                  });
                  setMapMarker(null);
                }}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                重置
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.patientName || !formData.age || !formData.gender || !formData.injuryType || !formData.symptoms || !mapMarker}
                className={cn(
                  'px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg',
                  formData.severity === 'critical'
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30'
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    提交上报
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {showSuccess && submittedRecord && (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  'rounded-2xl border shadow-sm overflow-hidden',
                  formData.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : `bg-white border-slate-100`
                )}
              >
                <div className={cn(
                  'p-6 border-b',
                  formData.severity === 'critical' ? 'border-red-200' : 'border-slate-100'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-3 rounded-xl',
                      formData.severity === 'critical' ? 'bg-red-500' : currentSeverity.color
                    )}>
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">上报成功</h3>
                      <p className="text-sm text-slate-500">
                        病案号: {submittedRecord.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">预计响应时间</p>
                        <p className={cn(
                          'text-xl font-bold',
                          formData.severity === 'critical' ? 'text-red-600' : 'text-blue-600'
                        )}>
                          {assignedStaff ? `${assignedStaff.estimatedTime} 分钟` : '计算中...'}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      currentSeverity.bgLight,
                      currentSeverity.textColor,
                      formData.severity === 'critical' && 'animate-pulse'
                    )}>
                      {currentSeverity.responseTime}
                    </div>
                  </div>

                  {assignedStaff && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white/80 rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Ambulance className="w-5 h-5 text-green-500" />
                        <p className="text-sm font-medium text-slate-700">已调度医护人员</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <img
                          src={assignedStaff.avatar}
                          alt={assignedStaff.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{assignedStaff.name}</p>
                          <p className="text-sm text-slate-500">{assignedStaff.specialty}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-white/80 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-5 h-5 text-purple-500" />
                      <p className="text-sm font-medium text-slate-700">处理进度</p>
                    </div>
                    <div className="space-y-4">
                      {timelineSteps.map((step, index) => (
                        <div key={step.status} className="flex gap-4">
                          <div className="relative flex flex-col items-center">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                              step.completed
                                ? 'bg-green-500 text-white'
                                : step.current
                                ? `${currentSeverity.color} text-white`
                                : 'bg-slate-200 text-slate-400'
                            )}>
                              {step.completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : step.current ? (
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="w-3 h-3 bg-white rounded-full"
                                />
                              ) : (
                                <span className="text-xs font-medium">{index + 1}</span>
                              )}
                            </div>
                            {index < timelineSteps.length - 1 && (
                              <div className={cn(
                                'w-0.5 h-full min-h-12',
                                step.completed ? 'bg-green-500' : 'bg-slate-200'
                              )} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <p className={cn(
                                'font-medium',
                                step.completed || step.current ? 'text-slate-900' : 'text-slate-400'
                              )}>
                                {step.title}
                              </p>
                              {step.time && (
                                <span className="text-xs text-slate-400">{step.time}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!submittedRecord && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.2 }}
              >
                <div className={cn(
                  'rounded-2xl border-2 p-6 mb-6',
                  currentSeverity.borderColor,
                  currentSeverity.bgLight,
                  formData.severity === 'critical' && 'animate-pulse'
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-xl', currentSeverity.color)}>
                      {(() => {
                        const Icon = currentSeverity.icon;
                        return <Icon className="w-6 h-6 text-white" />;
                      })()}
                    </div>
                    <div>
                      <h4 className={cn('font-bold text-lg', currentSeverity.textColor)}>
                        {currentSeverity.label}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {currentSeverity.responseTime}
                      </p>
                      <div className="mt-3 p-3 bg-white/60 rounded-lg">
                        <p className="text-xs text-slate-500">响应等级说明</p>
                        <p className="text-sm text-slate-700 mt-1">
                          {formData.severity === 'critical' && '立即启动急救流程，调度急救车和急救人员，通知上级医生'}
                          {formData.severity === 'severe' && '紧急调度，医护人员10分钟内到达现场，做好抢救准备'}
                          {formData.severity === 'moderate' && '安排医护人员30分钟内到达，进行现场处理'}
                          {formData.severity === 'mild' && '预约就诊时间，可到医疗站进行简单处理'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900">上报须知</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                      请准确填写患者信息，以便医护人员提前做好准备
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                      详细描述症状，包括疼痛部位、持续时间等
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                      在地图上准确标记位置，便于医护人员快速到达
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                      危急情况请立即拨打急救电话，并在现场等候
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">5</span>
                      提交后请保持电话畅通，医护人员可能与您联系
                    </li>
                  </ul>
                </div>

                <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-slate-900">值班医护人员</h3>
                  </div>
                  <div className="space-y-3">
                    {medicalStaff.filter((s) => s.status === 'on-duty').slice(0, 4).map((staff) => (
                      <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{staff.name}</p>
                          <p className="text-xs text-slate-500 truncate">{staff.specialty}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          在岗
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
