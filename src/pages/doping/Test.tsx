import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn, exportToPDF, formatDate } from '@/utils';
import type { Athlete, DopingTest, DopingTestType, DopingSampleType } from '@/types';

interface SelectedAthlete {
  athlete: Athlete;
  testType: DopingTestType;
  sampleType: DopingSampleType;
  status: 'pending' | 'collected' | 'sent';
  sampleNumber?: string;
  collectedAt?: string;
  credentialUrl?: string;
}

interface RollAnimationState {
  isAnimating: boolean;
  currentName: string;
  finalAthlete: Athlete | null;
}

export default function DopingTestPage() {
  const navigate = useNavigate();
  const {
    athletes,
    schedules,
    results,
    events,
    addDopingTest,
    pushNotification,
  } = useAppStore();
  const { showToast } = useToast();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [topNCount, setTopNCount] = useState<number>(3);
  const [randomCount, setRandomCount] = useState<number>(2);
  const [testType, setTestType] = useState<DopingTestType>('random');
  const [sampleType, setSampleType] = useState<DopingSampleType>('urine');
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [rollAnimation, setRollAnimation] = useState<RollAnimationState>({
    isAnimating: false,
    currentName: '',
    finalAthlete: null,
  });
  const [collectModal, setCollectModal] = useState<{
    isOpen: boolean;
    selectedAthlete: SelectedAthlete | null;
  }>({ isOpen: false, selectedAthlete: null });
  const [collectForm, setCollectForm] = useState({
    sampleNumber: '',
    collectedAt: '',
    credentialUrl: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'generate' | 'remove' | 'export' | 'print' | 'notify' | 'saveAll' | 'markSent';
    athleteId?: string;
    athleteName?: string;
  }>({ isOpen: false, type: 'generate' });
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    selectedAthlete: SelectedAthlete | null;
  }>({ isOpen: false, selectedAthlete: null });
  const [addAthleteModal, setAddAthleteModal] = useState<boolean>(false);
  const [searchAthleteName, setSearchAthleteName] = useState<string>('');
  const [addTestType, setAddTestType] = useState<DopingTestType>('targeted');
  const [addSampleType, setAddSampleType] = useState<DopingSampleType>('urine');

  const rollIntervalRef = useRef<number | null>(null);

  const filteredSchedules = useMemo(() => {
    if (!selectedEventId) return schedules.filter(s => s.status === 'completed');
    return schedules.filter(s => s.eventId === selectedEventId && s.status === 'completed');
  }, [schedules, selectedEventId]);

  const availableAthletes = useMemo(() => {
    if (!selectedScheduleId) return [];
    const schedule = schedules.find(s => s.id === selectedScheduleId);
    if (!schedule) return [];
    return athletes.filter(a => schedule.athletes.includes(a.id));
  }, [selectedScheduleId, schedules, athletes]);

  const eventResults = useMemo(() => {
    if (!selectedScheduleId) return [];
    return results
      .filter(r => r.scheduleId === selectedScheduleId)
      .sort((a, b) => a.rank - b.rank);
  }, [selectedScheduleId, results]);

  const eventOptions = useMemo(() => {
    const completedScheduleEventIds = new Set(
      schedules.filter(s => s.status === 'completed').map(s => s.eventId)
    );
    return events.filter(e => completedScheduleEventIds.has(e.id));
  }, [events, schedules]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      pending: {
        text: '待采样',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      collected: {
        text: '已采样',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      sent: {
        text: '已送检',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
          config.className
        )}
      >
        {config.text}
      </span>
    );
  };

  const getTestTypeText = (type: DopingTestType) => {
    return type === 'random' ? '随机抽检' : '目标抽检';
  };

  const getSampleTypeText = (type: DopingSampleType) => {
    return type === 'blood' ? '血液' : '尿液';
  };

  const startRollAnimation = (candidates: Athlete[], finalAthlete: Athlete, onComplete: () => void) => {
    let index = 0;
    setRollAnimation({
      isAnimating: true,
      currentName: candidates[0].name,
      finalAthlete: null,
    });

    rollIntervalRef.current = window.setInterval(() => {
      index = (index + 1) % candidates.length;
      setRollAnimation(prev => ({
        ...prev,
        currentName: candidates[index].name,
      }));
    }, 80);

    setTimeout(() => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setRollAnimation({
        isAnimating: false,
        currentName: finalAthlete.name,
        finalAthlete,
      });
      onComplete();
    }, 2000);
  };

  const generateTestList = () => {
    if (!selectedScheduleId) {
      showToast('warning', '请先选择比赛项目');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'generate',
    });
  };

  const confirmGenerate = () => {
    const schedule = schedules.find(s => s.id === selectedScheduleId);
    if (!schedule) return;

    const topAthletes: Athlete[] = [];
    for (let i = 0; i < Math.min(topNCount, eventResults.length); i++) {
      const result = eventResults[i];
      const athlete = athletes.find(a => a.id === result.athleteId);
      if (athlete) {
        topAthletes.push(athlete);
      }
    }

    const remainingAthletes = availableAthletes.filter(
      a => !topAthletes.some(ta => ta.id === a.id)
    );

    const shuffled = [...remainingAthletes].sort(() => Math.random() - 0.5);
    const randomAthletes = shuffled.slice(0, randomCount);

    const allSelected = [...topAthletes, ...randomAthletes];

    const animationCandidates = availableAthletes.length > 5 
      ? availableAthletes.slice(0, 10) 
      : availableAthletes;

    const processNext = (index: number) => {
      if (index >= allSelected.length) {
        const newSelectedAthletes: SelectedAthlete[] = allSelected.map((athlete, idx) => ({
          athlete,
          testType: idx < topNCount ? 'targeted' : testType,
          sampleType,
          status: 'pending',
        }));
        setSelectedAthletes(newSelectedAthletes);
        setConfirmDialog({ isOpen: false, type: 'generate' });
        showToast('success', `已生成 ${newSelectedAthletes.length} 名运动员的抽检名单`);
        return;
      }

      const athlete = allSelected[index];
      startRollAnimation(animationCandidates, athlete, () => {
        setTimeout(() => processNext(index + 1), 300);
      });
    };

    processNext(0);
  };

  const handleRemoveAthlete = (athleteId: string, athleteName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'remove',
      athleteId,
      athleteName,
    });
  };

  const confirmRemove = () => {
    if (confirmDialog.athleteId) {
      setSelectedAthletes(prev => prev.filter(sa => sa.athlete.id !== confirmDialog.athleteId));
      showToast('success', '已从抽检名单中移除');
    }
    setConfirmDialog({ isOpen: false, type: 'generate' });
  };

  const handleAddAthlete = () => {
    setAddAthleteModal(true);
  };

  const confirmAddAthlete = (athlete: Athlete) => {
    if (selectedAthletes.some(sa => sa.athlete.id === athlete.id)) {
      showToast('warning', '该运动员已在抽检名单中');
      return;
    }

    setSelectedAthletes(prev => [...prev, {
      athlete,
      testType: addTestType,
      sampleType: addSampleType,
      status: 'pending',
    }]);

    setAddAthleteModal(false);
    setSearchAthleteName('');
    showToast('success', '已添加到抽检名单');
  };

  const handleOpenCollectModal = (selectedAthlete: SelectedAthlete) => {
    setCollectModal({ isOpen: true, selectedAthlete });
    setCollectForm({
      sampleNumber: `SAMPLE-${Date.now().toString().slice(-8)}`,
      collectedAt: new Date().toISOString().slice(0, 16),
      credentialUrl: '',
    });
  };

  const handleSaveCollection = () => {
    if (!collectModal.selectedAthlete || !collectForm.sampleNumber || !collectForm.collectedAt) {
      showToast('warning', '请填写完整的采样信息');
      return;
    }

    setSelectedAthletes(prev => prev.map(sa => {
      if (sa.athlete.id === collectModal.selectedAthlete!.athlete.id) {
        return {
          ...sa,
          status: 'collected' as const,
          sampleNumber: collectForm.sampleNumber,
          collectedAt: collectForm.collectedAt,
          credentialUrl: collectForm.credentialUrl || undefined,
        };
      }
      return sa;
    }));

    setCollectModal({ isOpen: false, selectedAthlete: null });
    showToast('success', '样本采集记录已保存');
  };

  const handleMarkAsSent = (selectedAthlete: SelectedAthlete) => {
    setConfirmDialog({
      isOpen: true,
      type: 'markSent',
      athleteId: selectedAthlete.athlete.id,
      athleteName: selectedAthlete.athlete.name,
    });
  };

  const confirmMarkSent = () => {
    if (confirmDialog.athleteId) {
      setSelectedAthletes(prev => prev.map(sa => {
        if (sa.athlete.id === confirmDialog.athleteId) {
          return { ...sa, status: 'sent' as const };
        }
        return sa;
      }));
      showToast('success', '样本已标记为送检');
    }
    setConfirmDialog({ isOpen: false, type: 'generate' });
  };

  const handleViewDetail = (selectedAthlete: SelectedAthlete) => {
    setDetailModal({ isOpen: true, selectedAthlete });
  };

  const handleExportPDF = () => {
    if (selectedAthletes.length === 0) {
      showToast('warning', '抽检名单为空，无法导出');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'export',
    });
  };

  const confirmExport = async () => {
    try {
      await exportToPDF('doping-test-table', `兴奋剂抽检名单_${formatDate(new Date())}`);
      showToast('success', '抽检名单已导出');
    } catch {
      showToast('error', '导出失败，请重试');
    }
    setConfirmDialog({ isOpen: false, type: 'generate' });
  };

  const handlePrintNotice = () => {
    if (selectedAthletes.length === 0) {
      showToast('warning', '抽检名单为空，无法打印');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'print',
    });
  };

  const confirmPrint = () => {
    window.print();
    setConfirmDialog({ isOpen: false, type: 'generate' });
    showToast('success', '通知单已发送至打印机');
  };

  const handleSendNotification = () => {
    if (selectedAthletes.length === 0) {
      showToast('warning', '抽检名单为空，无法发送通知');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'notify',
    });
  };

  const confirmNotify = () => {
    const schedule = schedules.find(s => s.id === selectedScheduleId);
    selectedAthletes.forEach(sa => {
      pushNotification(
        sa.athlete.id,
        'doping',
        '兴奋剂检测通知',
        `您已被选中参加${schedule?.eventName || '比赛'}的兴奋剂检测，请于赛后1小时内到检测中心报到`,
        sa.athlete.id,
        'athlete'
      );
    });

    pushNotification(
      'all',
      'doping',
      '抽检名单已生成',
      `本次${schedule?.eventName || '比赛'}共抽检${selectedAthletes.length}名运动员`,
      undefined,
      'dopingTest'
    );

    showToast('success', `已向 ${selectedAthletes.length} 名运动员发送通知`);
    setConfirmDialog({ isOpen: false, type: 'generate' });
  };

  const handleSaveAllTests = () => {
    const collectedTests = selectedAthletes.filter(sa => sa.status !== 'pending');
    if (collectedTests.length === 0) {
      showToast('warning', '没有已采集的样本可保存');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'saveAll',
    });
  };

  const confirmSaveAll = () => {
    selectedAthletes.forEach(sa => {
      if (sa.status !== 'pending') {
        const test: Omit<DopingTest, 'id'> = {
          athleteId: sa.athlete.id,
          athleteName: sa.athlete.name,
          scheduleId: selectedScheduleId,
          testType: sa.testType,
          sampleType: sa.sampleType,
          sampleCollectedAt: sa.collectedAt || new Date().toISOString(),
          result: 'pending',
          isLocked: false,
          notes: sa.sampleNumber ? `样本编号: ${sa.sampleNumber}` : undefined,
        };
        addDopingTest(test);
      }
    });

    showToast('success', `已保存 ${selectedAthletes.filter(sa => sa.status !== 'pending').length} 条检测记录`);
    setConfirmDialog({ isOpen: false, type: 'generate' });
  };

  const confirmAction = () => {
    switch (confirmDialog.type) {
      case 'generate':
        confirmGenerate();
        break;
      case 'remove':
        confirmRemove();
        break;
      case 'export':
        confirmExport();
        break;
      case 'print':
        confirmPrint();
        break;
      case 'notify':
        confirmNotify();
        break;
      case 'saveAll':
        confirmSaveAll();
        break;
      case 'markSent':
        confirmMarkSent();
        break;
    }
  };

  const filteredAddAthletes = useMemo(() => {
    const selectedIds = new Set(selectedAthletes.map(sa => sa.athlete.id));
    return athletes.filter(a =>
      !selectedIds.has(a.id) &&
      a.name.toLowerCase().includes(searchAthleteName.toLowerCase())
    ).slice(0, 20);
  }, [athletes, selectedAthletes, searchAthleteName]);

  const columns: Array<import('@/components/DataTable').Column<SelectedAthlete>> = [
    {
      key: 'index',
      header: '序号',
      width: '60px',
      align: 'center' as const,
      render: (_value, _row, index) => (
        <span className="text-gray-500 font-mono">{index + 1}</span>
      ),
    },
    {
      key: 'athlete',
      header: '运动员信息',
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.athlete.avatar}
            alt={row.athlete.name}
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <p className="font-medium text-gray-900">{row.athlete.name}</p>
            <p className="text-xs text-gray-500">
              {row.athlete.country} · {row.athlete.gender === 'male' ? '男' : '女'} · {row.athlete.age}岁
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'testType',
      header: '抽检类型',
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          <LucideIcons.Shuffle className="w-3 h-3" />
          {getTestTypeText(value as DopingTestType)}
        </span>
      ),
    },
    {
      key: 'sampleType',
      header: '样本类型',
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          {value === 'blood' ? (
            <LucideIcons.Droplet className="w-3 h-3" />
          ) : (
            <LucideIcons.FlaskConical className="w-3 h-3" />
          )}
          {getSampleTypeText(value as DopingSampleType)}
        </span>
      ),
    },
    {
      key: 'sampleNumber',
      header: '样本编号',
      render: (value) => (
        <span className={cn(
          'font-mono text-sm',
          value ? 'text-gray-700' : 'text-gray-400'
        )}>
          {value as string || '-'}
        </span>
      ),
    },
    {
      key: 'collectedAt',
      header: '采集时间',
      render: (value) => (
        <span className={cn(
          'text-sm',
          value ? 'text-gray-700' : 'text-gray-400'
        )}>
          {value ? formatDate(value as string, 'yyyy-MM-dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
    },
    {
      key: 'actions',
      header: '操作',
      width: '240px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <LucideIcons.Eye className="w-4 h-4" />
          </button>
          {row.status === 'pending' && (
            <button
              onClick={() => handleOpenCollectModal(row)}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="记录采样"
            >
              <LucideIcons.FlaskConical className="w-4 h-4" />
            </button>
          )}
          {row.status === 'collected' && (
            <button
              onClick={() => handleMarkAsSent(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="标记送检"
            >
              <LucideIcons.Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleRemoveAthlete(row.athlete.id, row.athlete.name)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="移除"
          >
            <LucideIcons.UserMinus className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="兴奋剂抽检"
        description="管理比赛兴奋剂抽检名单和样本采集记录"
        icon={LucideIcons.FlaskConical}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/doping/result')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              <LucideIcons.FileText className="w-4 h-4" />
              检测结果
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LucideIcons.Settings className="w-5 h-5 text-primary-500" />
              抽检设置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  比赛项目
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setSelectedScheduleId('');
                    setSelectedAthletes([]);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
                >
                  <option value="">请选择比赛项目</option>
                  {eventOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  比赛场次
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => {
                    setSelectedScheduleId(e.target.value);
                    setSelectedAthletes([]);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
                  disabled={!selectedEventId}
                >
                  <option value="">请选择比赛场次</option>
                  {filteredSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.date} {schedule.startTime} - {schedule.round}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    前N名
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={topNCount}
                    onChange={(e) => setTopNCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    随机抽取
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={randomCount}
                    onChange={(e) => setRandomCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  抽检类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTestType('random')}
                    className={cn(
                      'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      testType === 'random'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <LucideIcons.Shuffle className="w-4 h-4 inline mr-1.5" />
                    随机抽检
                  </button>
                  <button
                    onClick={() => setTestType('targeted')}
                    className={cn(
                      'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      testType === 'targeted'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <LucideIcons.Target className="w-4 h-4 inline mr-1.5" />
                    目标抽检
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  样本类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSampleType('urine')}
                    className={cn(
                      'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      sampleType === 'urine'
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <LucideIcons.FlaskConical className="w-4 h-4 inline mr-1.5" />
                    尿液
                  </button>
                  <button
                    onClick={() => setSampleType('blood')}
                    className={cn(
                      'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      sampleType === 'blood'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <LucideIcons.Droplet className="w-4 h-4 inline mr-1.5" />
                    血液
                  </button>
                </div>
              </div>

              <button
                onClick={generateTestList}
                disabled={!selectedScheduleId || rollAnimation.isAnimating}
                className={cn(
                  'w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-primary-500 to-purple-600 text-white',
                  'hover:from-primary-600 hover:to-purple-700 shadow-lg shadow-primary-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <LucideIcons.Sparkles className="w-5 h-5" />
                {rollAnimation.isAnimating ? '随机抽选中...' : '生成抽检名单'}
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {rollAnimation.isAnimating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white text-center"
              >
                <LucideIcons.Shuffle className="w-8 h-8 mx-auto mb-3 animate-pulse" />
                <p className="text-sm opacity-80 mb-2">正在随机抽选</p>
                <motion.p
                  key={rollAnimation.currentName}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl font-bold"
                >
                  {rollAnimation.currentName}
                </motion.p>
              </motion.div>
            )}
            {!rollAnimation.isAnimating && rollAnimation.finalAthlete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white text-center"
              >
                <LucideIcons.CheckCircle className="w-8 h-8 mx-auto mb-3" />
                <p className="text-sm opacity-80 mb-2">抽中</p>
                <p className="text-2xl font-bold">{rollAnimation.finalAthlete.name}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LucideIcons.BarChart3 className="w-5 h-5 text-primary-500" />
              统计信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">总抽检人数</span>
                <span className="text-xl font-bold text-gray-900">{selectedAthletes.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <span className="text-amber-700">待采样</span>
                <span className="text-xl font-bold text-amber-700">
                  {selectedAthletes.filter(sa => sa.status === 'pending').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <span className="text-green-700">已采样</span>
                <span className="text-xl font-bold text-green-700">
                  {selectedAthletes.filter(sa => sa.status === 'collected').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-700">已送检</span>
                <span className="text-xl font-bold text-blue-700">
                  {selectedAthletes.filter(sa => sa.status === 'sent').length}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">抽检名单</h3>
                {selectedScheduleId && (
                  <p className="text-sm text-gray-500">
                    {schedules.find(s => s.id === selectedScheduleId)?.eventName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddAthlete}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  <LucideIcons.UserPlus className="w-4 h-4" />
                  手动添加
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <LucideIcons.Download className="w-4 h-4" />
                  导出PDF
                </button>
                <button
                  onClick={handlePrintNotice}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  <LucideIcons.Printer className="w-4 h-4" />
                  打印通知单
                </button>
                <button
                  onClick={handleSendNotification}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <LucideIcons.Send className="w-4 h-4" />
                  发送通知
                </button>
                <button
                  onClick={handleSaveAllTests}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                >
                  <LucideIcons.Save className="w-4 h-4" />
                  保存记录
                </button>
              </div>
            </div>

            <div id="doping-test-table">
              <DataTable
                columns={columns}
                data={selectedAthletes}
                pageSize={10}
                rowKey={(row) => row.athlete.id}
                emptyState={
                  <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                    <LucideIcons.Inbox className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">暂无抽检名单</p>
                    <p className="text-sm mt-1">请先设置抽检条件并生成名单</p>
                  </div>
                }
              />
            </div>
          </motion.div>
        </div>
      </div>

      <Modal
        isOpen={collectModal.isOpen}
        onClose={() => setCollectModal({ isOpen: false, selectedAthlete: null })}
        title="记录样本采集"
      >
        {collectModal.selectedAthlete && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <img
                src={collectModal.selectedAthlete.athlete.avatar}
                alt={collectModal.selectedAthlete.athlete.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">
                  {collectModal.selectedAthlete.athlete.name}
                </h4>
                <p className="text-sm text-gray-500">
                  {collectModal.selectedAthlete.athlete.country}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {getTestTypeText(collectModal.selectedAthlete.testType)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {getSampleTypeText(collectModal.selectedAthlete.sampleType)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                样本编号
              </label>
              <input
                type="text"
                value={collectForm.sampleNumber}
                onChange={(e) => setCollectForm(prev => ({ ...prev, sampleNumber: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm font-mono"
                placeholder="请输入样本编号"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                采集时间
              </label>
              <input
                type="datetime-local"
                value={collectForm.collectedAt}
                onChange={(e) => setCollectForm(prev => ({ ...prev, collectedAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传采样凭证
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer">
                <LucideIcons.Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">点击或拖拽上传采样凭证照片</p>
                <p className="text-xs text-gray-400 mt-1">支持 JPG, PNG 格式</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setCollectModal({ isOpen: false, selectedAthlete: null })}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCollection}
                className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <LucideIcons.Check className="w-4 h-4" />
                保存采样记录
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, selectedAthlete: null })}
        title="抽检详情"
        className="max-w-lg"
      >
        {detailModal.selectedAthlete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
              <img
                src={detailModal.selectedAthlete.athlete.avatar}
                alt={detailModal.selectedAthlete.athlete.name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-bold text-gray-900">
                    {detailModal.selectedAthlete.athlete.name}
                  </h4>
                  {getStatusBadge(detailModal.selectedAthlete.status)}
                </div>
                <p className="text-gray-500">
                  {detailModal.selectedAthlete.athlete.country} ·
                  {detailModal.selectedAthlete.athlete.gender === 'male' ? '男' : '女'} ·
                  {detailModal.selectedAthlete.athlete.age}岁
                </p>
                <p className="text-sm text-gray-400 mt-1 font-mono">
                  ID: {detailModal.selectedAthlete.athlete.athleteId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">抽检类型</p>
                <p className="font-medium text-gray-900">
                  {getTestTypeText(detailModal.selectedAthlete.testType)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">样本类型</p>
                <p className="font-medium text-gray-900">
                  {getSampleTypeText(detailModal.selectedAthlete.sampleType)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">样本编号</p>
                <p className="font-medium text-gray-900 font-mono">
                  {detailModal.selectedAthlete.sampleNumber || '-'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">采集时间</p>
                <p className="font-medium text-gray-900">
                  {detailModal.selectedAthlete.collectedAt
                    ? formatDate(detailModal.selectedAthlete.collectedAt, 'yyyy-MM-dd HH:mm')
                    : '-'}
                </p>
              </div>
            </div>

            {detailModal.selectedAthlete.status === 'pending' && (
              <button
                onClick={() => {
                  setDetailModal({ isOpen: false, selectedAthlete: null });
                  handleOpenCollectModal(detailModal.selectedAthlete!);
                }}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <LucideIcons.FlaskConical className="w-5 h-5" />
                记录样本采集
              </button>
            )}
          </motion.div>
        )}
      </Modal>

      <Modal
        isOpen={addAthleteModal}
        onClose={() => setAddAthleteModal(false)}
        title="手动添加运动员"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                抽检类型
              </label>
              <select
                value={addTestType}
                onChange={(e) => setAddTestType(e.target.value as DopingTestType)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="random">随机抽检</option>
                <option value="targeted">目标抽检</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                样本类型
              </label>
              <select
                value={addSampleType}
                onChange={(e) => setAddSampleType(e.target.value as DopingSampleType)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="urine">尿液</option>
                <option value="blood">血液</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              搜索运动员
            </label>
            <div className="relative">
              <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchAthleteName}
                onChange={(e) => setSearchAthleteName(e.target.value)}
                placeholder="输入运动员姓名搜索..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredAddAthletes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <LucideIcons.Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>没有找到匹配的运动员</p>
              </div>
            ) : (
              filteredAddAthletes.map((athlete) => (
                <motion.div
                  key={athlete.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={athlete.avatar}
                      alt={athlete.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{athlete.name}</p>
                      <p className="text-xs text-gray-500">
                        {athlete.country} · {athlete.gender === 'male' ? '男' : '女'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmAddAthlete(athlete)}
                    className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    添加
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'generate' })}
        onConfirm={confirmAction}
        title={
          {
            generate: '生成抽检名单',
            remove: '移除运动员',
            export: '导出抽检名单',
            print: '打印通知单',
            notify: '发送抽检通知',
            saveAll: '保存检测记录',
            markSent: '标记为送检',
          }[confirmDialog.type]
        }
        content={
          {
            generate: `确定要根据当前设置生成抽检名单吗？将选择前${topNCount}名和随机${randomCount}名运动员。`,
            remove: `确定要将运动员"${confirmDialog.athleteName}"从抽检名单中移除吗？`,
            export: `确定要导出当前抽检名单的PDF文件吗？`,
            print: `确定要打印抽检通知单吗？`,
            notify: `确定要向 ${selectedAthletes.length} 名运动员发送抽检通知吗？`,
            saveAll: `确定要保存当前 ${selectedAthletes.filter(sa => sa.status !== 'pending').length} 条检测记录吗？`,
            markSent: `确定要将运动员"${confirmDialog.athleteName}"的样本标记为已送检吗？`,
          }[confirmDialog.type]
        }
        confirmText={
          {
            generate: '生成',
            remove: '移除',
            export: '导出',
            print: '打印',
            notify: '发送',
            saveAll: '保存',
            markSent: '确认',
          }[confirmDialog.type]
        }
        confirmButtonClass={
          {
            generate: 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25',
            remove: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
            export: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
            print: 'bg-green-500 hover:bg-green-600 shadow-green-500/25',
            notify: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
            saveAll: 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25',
            markSent: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
          }[confirmDialog.type]
        }
      />
    </div>
  );
}
