import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatCard from '@/components/StatCard';
import { cn, formatDate } from '@/utils';
import type { DopingTest, DopingResult, DopingTestType, DopingSampleType } from '@/types';

interface TimelineStep {
  title: string;
  description: string;
  date: string;
  completed: boolean;
  icon: LucideIcons.LucideIcon;
}

interface ResultForm {
  result: DopingResult;
  notes: string;
  reportUrl: string;
}

export default function DopingResultPage() {
  const navigate = useNavigate();
  const {
    dopingTests,
    updateDopingTest,
    lockAthleteResult,
    pushNotification,
    schedules,
    athletes,
  } = useAppStore();
  const { showToast } = useToast();

  const [filterEvent, setFilterEvent] = useState<string>('');
  const [filterAthlete, setFilterAthlete] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('');
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    test: DopingTest | null;
  }>({ isOpen: false, test: null });
  const [entryModal, setEntryModal] = useState<{
    isOpen: boolean;
    test: DopingTest | null;
  }>({ isOpen: false, test: null });
  const [resultForm, setResultForm] = useState<ResultForm>({
    result: 'pending',
    notes: '',
    reportUrl: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'submit' | 'lock' | 'startReview';
    test?: DopingTest;
  }>({ isOpen: false, type: 'submit' });
  const [searchAthleteName, setSearchAthleteName] = useState<string>('');

  const eventOptions = useMemo(() => {
    const scheduleIds = [...new Set(dopingTests.map(d => d.scheduleId))];
    return scheduleIds.map(id => {
      const schedule = schedules.find(s => s.id === id);
      return {
        id,
        name: schedule?.eventName || id,
      };
    }).filter(e => e.name);
  }, [dopingTests, schedules]);

  const athleteOptions = useMemo(() => {
    const athleteIds = [...new Set(dopingTests.map(d => d.athleteId))];
    return athleteIds.map(id => {
      const athlete = athletes.find(a => a.id === id);
      return {
        id,
        name: athlete?.name || id,
      };
    }).filter(a => a.name);
  }, [dopingTests, athletes]);

  const filteredTests = useMemo(() => {
    return dopingTests.filter(test => {
      if (filterEvent && test.scheduleId !== filterEvent) return false;
      if (filterAthlete && test.athleteId !== filterAthlete) return false;
      if (filterResult && test.result !== filterResult) return false;
      if (searchAthleteName && !test.athleteName.toLowerCase().includes(searchAthleteName.toLowerCase())) return false;
      return true;
    });
  }, [dopingTests, filterEvent, filterAthlete, filterResult, searchAthleteName]);

  const stats = useMemo(() => {
    const total = dopingTests.length;
    const negative = dopingTests.filter(d => d.result === 'negative').length;
    const positive = dopingTests.filter(d => d.result === 'positive').length;
    const abnormal = dopingTests.filter(d => d.result === 'abnormal').length;
    const pending = dopingTests.filter(d => d.result === 'pending').length;

    const eventStats = eventOptions.map(event => ({
      name: event.name.length > 8 ? event.name.slice(0, 8) + '...' : event.name,
      count: dopingTests.filter(d => d.scheduleId === event.id).length,
    }));

    const pieData = [
      { name: '阴性', value: negative, color: '#10B981' },
      { name: '阳性', value: positive, color: '#EF4444' },
      { name: '异常', value: abnormal, color: '#F59E0B' },
      { name: '待检测', value: pending, color: '#6B7280' },
    ].filter(d => d.value > 0);

    return { total, negative, positive, abnormal, pending, eventStats, pieData };
  }, [dopingTests, eventOptions]);

  const getResultBadge = (result: DopingResult) => {
    const resultMap: Record<string, { text: string; className: string }> = {
      pending: {
        text: '待检测',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
      negative: {
        text: '阴性',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      positive: {
        text: '阳性',
        className: 'bg-red-100 text-red-700 border-red-200',
      },
      abnormal: {
        text: '异常',
        className: 'bg-orange-100 text-orange-700 border-orange-200',
      },
    };
    const config = resultMap[result] || resultMap.pending;
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

  const getTimeline = (test: DopingTest): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        title: '样本采集',
        description: '样本已采集并编号',
        date: test.sampleCollectedAt,
        completed: true,
        icon: LucideIcons.FlaskConical,
      },
      {
        title: '样本送检',
        description: '样本已送至检测实验室',
        date: test.sampleCollectedAt,
        completed: test.result !== 'pending',
        icon: LucideIcons.Send,
      },
      {
        title: '检测分析',
        description: '实验室正在进行检测分析',
        date: test.testedAt || test.sampleCollectedAt,
        completed: test.result !== 'pending',
        icon: LucideIcons.Microscope,
      },
    ];

    if (test.result === 'positive' || test.result === 'abnormal') {
      steps.push(
        {
          title: '结果异常',
          description: '检测结果异常，已启动异常处理流程',
          date: test.testedAt || new Date().toISOString(),
          completed: test.isLocked,
          icon: LucideIcons.AlertTriangle,
        },
        {
          title: '成绩锁定',
          description: '运动员所有成绩已被锁定',
          date: new Date().toISOString(),
          completed: test.isLocked,
          icon: LucideIcons.Lock,
        },
        {
          title: '通知委员会',
          description: '已通知反兴奋剂委员会',
          date: new Date().toISOString(),
          completed: test.isLocked,
          icon: LucideIcons.Bell,
        },
        {
          title: '启动复查',
          description: '已启动B瓶复查流程',
          date: new Date().toISOString(),
          completed: false,
          icon: LucideIcons.RefreshCw,
        }
      );
    } else if (test.result === 'negative') {
      steps.push(
        {
          title: '结果正常',
          description: '检测结果为阴性，流程结束',
          date: test.testedAt || new Date().toISOString(),
          completed: true,
          icon: LucideIcons.CheckCircle,
        }
      );
    }

    return steps;
  };

  const handleViewDetail = (test: DopingTest) => {
    setDetailModal({ isOpen: true, test });
  };

  const handleOpenEntryModal = (test: DopingTest) => {
    if (test.result !== 'pending') {
      showToast('warning', '该样本已录入检测结果');
      return;
    }
    setEntryModal({ isOpen: true, test });
    setResultForm({
      result: 'negative',
      notes: '',
      reportUrl: '',
    });
  };

  const handleSubmitResult = () => {
    if (!entryModal.test) return;

    setConfirmDialog({
      isOpen: true,
      type: 'submit',
      test: entryModal.test,
    });
  };

  const confirmSubmit = () => {
    if (!confirmDialog.test) return;

    const test = confirmDialog.test;

    updateDopingTest(test.id, {
      result: resultForm.result,
      testedAt: new Date().toISOString(),
      notes: resultForm.notes || undefined,
    });

    if (resultForm.result === 'positive' || resultForm.result === 'abnormal') {
      setConfirmDialog({
        isOpen: true,
        type: 'lock',
        test: { ...test, result: resultForm.result },
      });
    } else {
      pushNotification(
        test.athleteId,
        'doping',
        '兴奋剂检测结果',
        `您的兴奋剂检测结果为阴性，一切正常。`,
        test.id,
        'dopingTest'
      );

      showToast('success', '检测结果已提交');
      setEntryModal({ isOpen: false, test: null });
      setConfirmDialog({ isOpen: false, type: 'submit' });
    }
  };

  const confirmLock = () => {
    if (!confirmDialog.test) return;

    const test = confirmDialog.test;

    lockAthleteResult(test.athleteId);

    updateDopingTest(test.id, {
      isLocked: true,
    });

    pushNotification(
      'all',
      'doping',
      '兴奋剂检测异常',
      `运动员${test.athleteName}的兴奋剂检测结果为${resultForm.result === 'positive' ? '阳性' : '异常'}，已启动异常处理流程。`,
      test.id,
      'dopingTest'
    );

    showToast('success', '已锁定运动员成绩并通知相关人员');
    setEntryModal({ isOpen: false, test: null });
    setConfirmDialog({ isOpen: false, type: 'submit' });
  };

  const handleStartReview = (test: DopingTest) => {
    setConfirmDialog({
      isOpen: true,
      type: 'startReview',
      test,
    });
  };

  const confirmStartReview = () => {
    if (!confirmDialog.test) return;

    const test = confirmDialog.test;

    pushNotification(
      'all',
      'doping',
      '复查流程启动',
      `运动员${test.athleteName}的B瓶复查流程已启动，请相关人员跟进。`,
      test.id,
      'dopingTest'
    );

    showToast('success', '复查流程已启动');
    setConfirmDialog({ isOpen: false, type: 'submit' });
  };

  const confirmAction = () => {
    switch (confirmDialog.type) {
      case 'submit':
        confirmSubmit();
        break;
      case 'lock':
        confirmLock();
        break;
      case 'startReview':
        confirmStartReview();
        break;
    }
  };

  const columns = [
    {
      key: 'athlete',
      header: '运动员',
      render: (_: unknown, row: DopingTest) => {
        const athlete = athletes.find(a => a.id === row.athleteId);
        return (
          <div className="flex items-center gap-3">
            <img
              src={athlete?.avatar || ''}
              alt={row.athleteName}
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <p className="font-medium text-gray-900">{row.athleteName}</p>
              <p className="text-xs text-gray-500">
                {athlete?.country || '-'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'scheduleId',
      header: '比赛项目',
      render: (value: unknown) => {
        const schedule = schedules.find(s => s.id === value);
        return <span className="text-gray-700">{schedule?.eventName || value as string}</span>;
      },
    },
    {
      key: 'testType',
      header: '抽检类型',
      render: (value: unknown) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          {getTestTypeText(value as DopingTestType)}
        </span>
      ),
    },
    {
      key: 'sampleType',
      header: '样本类型',
      render: (value: unknown) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          {getSampleTypeText(value as DopingSampleType)}
        </span>
      ),
    },
    {
      key: 'sampleCollectedAt',
      header: '采集时间',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">
          {formatDate(value as string, 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'result',
      header: '检测结果',
      sortable: true,
      render: (value: unknown) => getResultBadge(value as DopingResult),
    },
    {
      key: 'isLocked',
      header: '锁定状态',
      render: (value: unknown) => (
        value ? (
          <span className="inline-flex items-center gap-1 text-red-500">
            <LucideIcons.Lock className="w-4 h-4" />
            <span className="text-xs font-medium">已锁定</span>
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      ),
    },
    {
      key: 'actions',
      header: '操作',
      width: '200px',
      render: (_: unknown, row: DopingTest) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <LucideIcons.Eye className="w-4 h-4" />
          </button>
          {row.result === 'pending' && (
            <button
              onClick={() => handleOpenEntryModal(row)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="录入结果"
            >
              <LucideIcons.Edit3 className="w-4 h-4" />
            </button>
          )}
          {(row.result === 'positive' || row.result === 'abnormal') && !row.isLocked && (
            <button
              onClick={() => handleStartReview(row)}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="启动复查"
            >
              <LucideIcons.RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} 例</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="检测结果管理"
        description="管理兴奋剂检测结果和异常处理流程"
        icon={LucideIcons.FileText}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/doping/test')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              <LucideIcons.FlaskConical className="w-4 h-4" />
              抽检管理
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<LucideIcons.FileText className="w-6 h-6" />}
          value={stats.total}
          label="总检测数"
          gradient="primary"
        />
        <StatCard
          icon={<LucideIcons.CheckCircle className="w-6 h-6" />}
          value={stats.negative}
          label="阴性"
          gradient="success"
        />
        <StatCard
          icon={<LucideIcons.AlertOctagon className="w-6 h-6" />}
          value={stats.positive}
          label="阳性"
          gradient="danger"
        />
        <StatCard
          icon={<LucideIcons.AlertTriangle className="w-6 h-6" />}
          value={stats.abnormal}
          label="异常"
          gradient="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">检测结果分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">各项目检测数量</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.eventStats} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchAthleteName}
                  onChange={(e) => setSearchAthleteName(e.target.value)}
                  placeholder="搜索运动员姓名..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
                />
              </div>

              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部项目</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>

              <select
                value={filterAthlete}
                onChange={(e) => setFilterAthlete(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部运动员</option>
                {athleteOptions.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>

              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部结果</option>
                <option value="pending">待检测</option>
                <option value="negative">阴性</option>
                <option value="positive">阳性</option>
                <option value="abnormal">异常</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                共 <span className="font-bold text-gray-900">{filteredTests.length}</span> 条记录
              </span>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredTests}
          pageSize={10}
          rowKey="id"
          rowClassName={(row: DopingTest) =>
            cn(
              row.result === 'positive' && 'bg-red-50/50 hover:bg-red-50',
              row.result === 'abnormal' && 'bg-orange-50/50 hover:bg-orange-50',
              row.result === 'positive' || row.result === 'abnormal'
                ? 'border-l-4 border-l-red-500'
                : ''
            )
          }
          emptyState={
            <div className="flex flex-col items-center justify-center text-gray-400 py-12">
              <LucideIcons.Inbox className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无检测记录</p>
              <p className="text-sm mt-1">数据列表为空</p>
            </div>
          }
        />
      </motion.div>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, test: null })}
        title="检测详情"
        className="max-w-3xl"
      >
        {detailModal.test && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={cn(
              'p-4 rounded-2xl border-2',
              detailModal.test.result === 'positive' && 'bg-red-50 border-red-200',
              detailModal.test.result === 'abnormal' && 'bg-orange-50 border-orange-200',
              detailModal.test.result === 'negative' && 'bg-green-50 border-green-200',
              detailModal.test.result === 'pending' && 'bg-gray-50 border-gray-200'
            )}>
              <div className="flex items-start gap-4">
                <img
                  src={athletes.find(a => a.id === detailModal.test!.athleteId)?.avatar || ''}
                  alt={detailModal.test.athleteName}
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-xl font-bold text-gray-900">
                      {detailModal.test.athleteName}
                    </h4>
                    {getResultBadge(detailModal.test.result)}
                    {detailModal.test.isLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <LucideIcons.Lock className="w-3 h-3" />
                        成绩已锁定
                      </span>
                    )}
                    {(detailModal.test.result === 'positive' || detailModal.test.result === 'abnormal') && (
                      <LucideIcons.AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-gray-500">
                    {athletes.find(a => a.id === detailModal.test!.athleteId)?.country || '-'} ·
                    {schedules.find(s => s.id === detailModal.test!.scheduleId)?.eventName || '-'}
                  </p>
                  {detailModal.test.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-white/50 p-2 rounded-lg">
                      备注: {detailModal.test.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">抽检类型</p>
                <p className="font-medium text-gray-900">
                  {getTestTypeText(detailModal.test.testType)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">样本类型</p>
                <p className="font-medium text-gray-900">
                  {getSampleTypeText(detailModal.test.sampleType)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">采集时间</p>
                <p className="font-medium text-gray-900 text-sm">
                  {formatDate(detailModal.test.sampleCollectedAt, 'yyyy-MM-dd HH:mm')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">检测时间</p>
                <p className="font-medium text-gray-900 text-sm">
                  {detailModal.test.testedAt
                    ? formatDate(detailModal.test.testedAt, 'yyyy-MM-dd HH:mm')
                    : '-'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LucideIcons.Clock className="w-5 h-5 text-primary-500" />
                处理进度
              </h4>
              <div className="relative">
                {getTimeline(detailModal.test).map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="relative pl-10 pb-6 last:pb-0">
                      {index < getTimeline(detailModal.test).length - 1 && (
                        <div className={cn(
                          'absolute left-[15px] top-8 w-0.5 h-full',
                          step.completed ? 'bg-primary-500' : 'bg-gray-200'
                        )} />
                      )}
                      <div className={cn(
                        'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                        step.completed
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'font-medium',
                            step.completed ? 'text-gray-900' : 'text-gray-400'
                          )}>
                            {step.title}
                          </p>
                          {step.completed && (
                            <LucideIcons.CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className={cn(
                          'text-sm mt-0.5',
                          step.completed ? 'text-gray-600' : 'text-gray-400'
                        )}>
                          {step.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(step.date, 'yyyy-MM-dd HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(detailModal.test.result === 'positive' || detailModal.test.result === 'abnormal') && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setDetailModal({ isOpen: false, test: null });
                    handleStartReview(detailModal.test!);
                  }}
                  disabled={detailModal.test.isLocked}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                    detailModal.test.isLocked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  )}
                >
                  <LucideIcons.RefreshCw className="w-5 h-5" />
                  {detailModal.test.isLocked ? '复查流程已启动' : '启动B瓶复查'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </Modal>

      <Modal
        isOpen={entryModal.isOpen}
        onClose={() => setEntryModal({ isOpen: false, test: null })}
        title="录入检测结果"
      >
        {entryModal.test && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <img
                src={athletes.find(a => a.id === entryModal.test!.athleteId)?.avatar || ''}
                alt={entryModal.test.athleteName}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">
                  {entryModal.test.athleteName}
                </h4>
                <p className="text-sm text-gray-500">
                  {schedules.find(s => s.id === entryModal.test!.scheduleId)?.eventName || '-'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {getTestTypeText(entryModal.test.testType)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {getSampleTypeText(entryModal.test.sampleType)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                检测结果 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setResultForm(prev => ({ ...prev, result: 'negative' }))}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                    resultForm.result === 'negative'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <LucideIcons.CheckCircle className="w-5 h-5 mx-auto mb-1" />
                  阴性
                </button>
                <button
                  onClick={() => setResultForm(prev => ({ ...prev, result: 'positive' }))}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                    resultForm.result === 'positive'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <LucideIcons.AlertOctagon className="w-5 h-5 mx-auto mb-1" />
                  阳性
                </button>
                <button
                  onClick={() => setResultForm(prev => ({ ...prev, result: 'abnormal' }))}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                    resultForm.result === 'abnormal'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <LucideIcons.AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                  异常
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传检测报告
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer">
                <LucideIcons.Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">点击或拖拽上传检测报告</p>
                <p className="text-xs text-gray-400 mt-1">支持 PDF, JPG, PNG 格式</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注信息
              </label>
              <textarea
                value={resultForm.notes}
                onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="请输入检测备注信息..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm resize-none"
              />
            </div>

            {(resultForm.result === 'positive' || resultForm.result === 'abnormal') && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <LucideIcons.AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">重要提示</p>
                    <p className="text-sm text-red-600 mt-1">
                      提交后将自动锁定该运动员的所有比赛成绩，并通知反兴奋剂委员会启动复查流程。此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setEntryModal({ isOpen: false, test: null })}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitResult}
                className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <LucideIcons.Save className="w-4 h-4" />
                提交结果
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'submit' })}
        onConfirm={confirmAction}
        title={
          {
            submit: '提交检测结果',
            lock: '确认锁定成绩',
            startReview: '启动复查流程',
          }[confirmDialog.type]
        }
        content={
          {
            submit: `确定要提交运动员"${confirmDialog.test?.athleteName}"的检测结果吗？`,
            lock: `检测结果为${resultForm.result === 'positive' ? '阳性' : '异常'}，确定要锁定运动员"${confirmDialog.test?.athleteName}"的所有成绩并通知反兴奋剂委员会吗？此操作不可撤销。`,
            startReview: `确定要启动运动员"${confirmDialog.test?.athleteName}"的B瓶复查流程吗？`,
          }[confirmDialog.type]
        }
        confirmText={
          {
            submit: '提交',
            lock: '确认锁定',
            startReview: '启动复查',
          }[confirmDialog.type]
        }
        confirmButtonClass={
          {
            submit: 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25',
            lock: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
            startReview: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25',
          }[confirmDialog.type]
        }
      />
    </div>
  );
}
