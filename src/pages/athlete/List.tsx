import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn, exportToPDF } from '@/utils';
import type { Athlete, Event } from '@/types';

export default function AthleteList() {
  const navigate = useNavigate();
  const { athletes, events, updateAthlete, deleteAthlete } = useAppStore();
  const { showToast } = useToast();

  const [searchName, setSearchName] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    athlete: Athlete | null;
  }>({ isOpen: false, athlete: null });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'delete' | 'batch-approve' | 'batch-reject' | 'batch-export';
    athleteId?: string;
    athleteName?: string;
  }>({ isOpen: false, type: 'delete' });

  const eventMap = useMemo(() => {
    const map: Record<string, Event> = {};
    events.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [events]);

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      if (searchName && !athlete.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      if (filterCountry && athlete.country !== filterCountry) {
        return false;
      }
      if (filterEvent && !athlete.events.includes(filterEvent)) {
        return false;
      }
      if (filterStatus && athlete.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [athletes, searchName, filterCountry, filterEvent, filterStatus]);

  const countryOptions = useMemo(() => {
    const countries = [...new Set(athletes.map((a) => a.country))];
    return countries.sort();
  }, [athletes]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      pending: {
        text: '待审核',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      approved: {
        text: '已通过',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      rejected: {
        text: '已拒绝',
        className: 'bg-red-100 text-red-700 border-red-200',
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAthletes.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleApprove = (athlete: Athlete) => {
    setConfirmDialog({
      isOpen: true,
      type: 'approve',
      athleteId: athlete.id,
      athleteName: athlete.name,
    });
  };

  const handleReject = (athlete: Athlete) => {
    setConfirmDialog({
      isOpen: true,
      type: 'reject',
      athleteId: athlete.id,
      athleteName: athlete.name,
    });
  };

  const handleDelete = (athlete: Athlete) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      athleteId: athlete.id,
      athleteName: athlete.name,
    });
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      showToast('warning', '请先选择要审核的运动员');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'batch-approve',
    });
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) {
      showToast('warning', '请先选择要审核的运动员');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'batch-reject',
    });
  };

  const handleBatchExport = () => {
    if (selectedIds.length === 0) {
      showToast('warning', '请先选择要导出的运动员');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'batch-export',
    });
  };

  const confirmAction = () => {
    const { type, athleteId } = confirmDialog;

    switch (type) {
      case 'approve':
        if (athleteId) {
          updateAthlete(athleteId, { status: 'approved' });
          showToast('success', '运动员注册已通过');
        }
        break;
      case 'reject':
        if (athleteId) {
          updateAthlete(athleteId, { status: 'rejected' });
          showToast('success', '运动员注册已拒绝');
        }
        break;
      case 'delete':
        if (athleteId) {
          deleteAthlete(athleteId);
          showToast('success', '运动员已删除');
        }
        break;
      case 'batch-approve':
        selectedIds.forEach((id) => {
          updateAthlete(id, { status: 'approved' });
        });
        showToast('success', `已通过 ${selectedIds.length} 名运动员的注册申请`);
        setSelectedIds([]);
        break;
      case 'batch-reject':
        selectedIds.forEach((id) => {
          updateAthlete(id, { status: 'rejected' });
        });
        showToast('success', `已拒绝 ${selectedIds.length} 名运动员的注册申请`);
        setSelectedIds([]);
        break;
      case 'batch-export':
        handleExportPDF();
        break;
    }

    setConfirmDialog({ isOpen: false, type: 'delete' });
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF('athlete-table', `运动员名单_${new Date().toISOString().split('T')[0]}`);
      showToast('success', '运动员名单已导出');
    } catch {
      showToast('error', '导出失败，请重试');
    }
    setSelectedIds([]);
  };

  const handleViewDetail = (athlete: Athlete) => {
    setDetailModal({ isOpen: true, athlete });
  };

  const columns = [
    {
      key: 'select',
      header: '',
      render: (_: unknown, row: Athlete) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => handleSelect(row.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
      ),
      width: '50px',
      align: 'center' as const,
    },
    {
      key: 'athleteId',
      header: '运动员ID',
      sortable: true,
      render: (value: unknown) => (
        <span className="font-mono text-sm text-gray-600">{value as string}</span>
      ),
    },
    {
      key: 'name',
      header: '姓名',
      sortable: true,
      render: (_: unknown, row: Athlete) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar}
            alt={row.name}
            className="w-9 h-9 rounded-xl object-cover"
          />
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">
              {row.gender === 'male' ? '男' : '女'} · {row.age}岁
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: '国籍',
      sortable: true,
      render: (_: unknown, row: Athlete) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{getFlagEmoji(row.countryCode)}</span>
          <span>{row.country}</span>
        </div>
      ),
    },
    {
      key: 'events',
      header: '参赛项目',
      render: (value: unknown) => {
        const eventIds = value as string[];
        if (eventIds.length === 0) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {eventIds.slice(0, 2).map((id) => (
              <span
                key={id}
                className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
              >
                {eventMap[id]?.name || id}
              </span>
            ))}
            {eventIds.length > 2 && (
              <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                +{eventIds.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      sortable: true,
      render: (value: unknown) => getStatusBadge(value as string),
    },
    {
      key: 'actions',
      header: '操作',
      width: '180px',
      render: (_: unknown, row: Athlete) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewDetail(row)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <LucideIcons.Eye className="w-4 h-4" />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="通过"
              >
                <LucideIcons.CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(row)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="拒绝"
              >
                <LucideIcons.XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <LucideIcons.Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const getFlagEmoji = (countryCode: string): string => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const pendingCount = athletes.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="运动员管理"
        description="管理所有注册运动员的信息和审核状态"
        icon={LucideIcons.Users}
        actions={
          <button
            onClick={() => navigate('/athlete/register')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            <LucideIcons.UserPlus className="w-4 h-4" />
            新增运动员
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="搜索姓名..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm"
                />
              </div>

              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部国籍</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>

              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部项目</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
              >
                <option value="">全部状态</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                <span className="text-sm text-primary-700 font-medium">
                  已选择 {selectedIds.length} 项
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-sm text-primary-500 hover:text-primary-700"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <LucideIcons.CheckCircle className="w-4 h-4" />
              批量通过
            </button>
            <button
              onClick={handleBatchReject}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <LucideIcons.XCircle className="w-4 h-4" />
              批量拒绝
            </button>
            <button
              onClick={handleBatchExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <LucideIcons.Download className="w-4 h-4" />
              批量导出PDF
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <LucideIcons.AlertCircle className="w-4 h-4 text-amber-500" />
                待审核: {pendingCount}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                共 <span className="font-bold text-gray-900">{filteredAthletes.length}</span> 名运动员
              </span>
            </div>
          </div>
        </div>

        <div id="athlete-table">
          <DataTable
            columns={columns}
            data={filteredAthletes}
            pageSize={10}
            onRowClick={handleViewDetail}
            rowKey="id"
          />
        </div>
      </div>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, athlete: null })}
        title="运动员详情"
        className="max-w-2xl"
      >
        {detailModal.athlete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
              <img
                src={detailModal.athlete.avatar}
                alt={detailModal.athlete.name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {detailModal.athlete.name}
                  </h3>
                  {getStatusBadge(detailModal.athlete.status)}
                </div>
                <p className="text-gray-500 flex items-center gap-2">
                  <span className="text-xl">{getFlagEmoji(detailModal.athlete.countryCode)}</span>
                  {detailModal.athlete.country} ·{' '}
                  {detailModal.athlete.gender === 'male' ? '男' : '女'} ·{' '}
                  {detailModal.athlete.age}岁
                </p>
                <p className="text-sm text-gray-400 mt-1 font-mono">
                  ID: {detailModal.athlete.athleteId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">出生日期</p>
                <p className="font-medium text-gray-900">{detailModal.athlete.birthDate}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">联系邮箱</p>
                <p className="font-medium text-gray-900">{detailModal.athlete.email}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">联系电话</p>
                <p className="font-medium text-gray-900">{detailModal.athlete.phone}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">注册时间</p>
                <p className="font-medium text-gray-900">
                  {detailModal.athlete.createdAt.split('T')[0]}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <LucideIcons.Target className="w-4 h-4 text-blue-500" />
                参赛项目
              </h4>
              <div className="flex flex-wrap gap-2">
                {detailModal.athlete.events.length === 0 ? (
                  <span className="text-gray-400 text-sm">暂无参赛项目</span>
                ) : (
                  detailModal.athlete.events.map((eventId) => (
                    <span
                      key={eventId}
                      className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {eventMap[eventId]?.name || eventId}
                    </span>
                  ))
                )}
              </div>
            </div>

            {detailModal.athlete.historicalRecords.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <LucideIcons.Trophy className="w-4 h-4 text-amber-500" />
                  历史成绩
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">项目</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">成绩</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">日期</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">赛事</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600">破纪录</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.athlete.historicalRecords.map((record, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 px-3">{record.eventName}</td>
                          <td className="py-2 px-3 font-mono">{record.result}</td>
                          <td className="py-2 px-3">{record.date}</td>
                          <td className="py-2 px-3">{record.competition}</td>
                          <td className="py-2 px-3 text-center">
                            {record.isRecord ? (
                              <LucideIcons.Award className="w-4 h-4 text-amber-500 mx-auto" />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete' })}
        onConfirm={confirmAction}
        title={
          {
            approve: '通过注册申请',
            reject: '拒绝注册申请',
            delete: '删除运动员',
            'batch-approve': '批量通过注册申请',
            'batch-reject': '批量拒绝注册申请',
            'batch-export': '批量导出运动员名单',
          }[confirmDialog.type]
        }
        content={
          {
            approve: `确定要通过运动员"${confirmDialog.athleteName}"的注册申请吗？`,
            reject: `确定要拒绝运动员"${confirmDialog.athleteName}"的注册申请吗？`,
            delete: `确定要删除运动员"${confirmDialog.athleteName}"吗？此操作不可恢复。`,
            'batch-approve': `确定要通过选中的 ${selectedIds.length} 名运动员的注册申请吗？`,
            'batch-reject': `确定要拒绝选中的 ${selectedIds.length} 名运动员的注册申请吗？`,
            'batch-export': `确定要导出选中的 ${selectedIds.length} 名运动员的名单PDF吗？`,
          }[confirmDialog.type]
        }
        confirmText={
          {
            approve: '通过',
            reject: '拒绝',
            delete: '删除',
            'batch-approve': '批量通过',
            'batch-reject': '批量拒绝',
            'batch-export': '导出',
          }[confirmDialog.type]
        }
        confirmButtonClass={
          {
            approve: 'bg-green-500 hover:bg-green-600 shadow-green-500/25',
            reject: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
            delete: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
            'batch-approve': 'bg-green-500 hover:bg-green-600 shadow-green-500/25',
            'batch-reject': 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
            'batch-export': 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
          }[confirmDialog.type]
        }
      />
    </div>
  );
}
