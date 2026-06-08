import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { formatDate, exportToPDF } from '@/utils';
import { cn } from '@/lib/utils';
import type { Volunteer, AssignResult, CheckIn } from '@/types';

const skillOptions = [
  { value: 'translation', label: '翻译' },
  { value: 'guidance', label: '引导' },
  { value: 'medical', label: '医疗' },
  { value: 'technical', label: '技术' },
  { value: 'etiquette', label: '礼仪' },
  { value: 'security', label: '安保协助' },
  { value: 'photography', label: '摄影' },
  { value: 'logistics', label: '后勤' },
];

const stations = [
  { id: 'station-entrance', name: '场馆入口', requiredSkills: ['guidance', 'security'], capacity: 8 },
  { id: 'station-audience', name: '观众区', requiredSkills: ['guidance', 'etiquette'], capacity: 12 },
  { id: 'station-media', name: '媒体区', requiredSkills: ['translation', 'technical'], capacity: 6 },
  { id: 'station-athlete', name: '运动员区', requiredSkills: ['translation', 'medical'], capacity: 8 },
  { id: 'station-vip', name: 'VIP区', requiredSkills: ['etiquette', 'translation'], capacity: 4 },
  { id: 'station-medical', name: '医疗站', requiredSkills: ['medical'], capacity: 6 },
  { id: 'station-tech', name: '技术支持', requiredSkills: ['technical'], capacity: 8 },
];

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'active', label: '已激活' },
  { value: 'inactive', label: '未激活' },
];

const tabs = [
  { id: 'volunteers', label: '志愿者列表', icon: 'Users' },
  { id: 'stations', label: '岗位管理', icon: 'MapPin' },
  { id: 'checkins', label: '签到记录', icon: 'ClipboardList' },
];

export default function VolunteerManage() {
  const [activeTab, setActiveTab] = useState('volunteers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSkill, setFilterSkill] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignResults, setAssignResults] = useState<AssignResult[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [showServiceProofModal, setShowServiceProofModal] = useState(false);
  const [proofVolunteer, setProofVolunteer] = useState<Volunteer | null>(null);

  const {
    volunteers,
    updateVolunteer,
    autoAssignVolunteers,
    deleteVolunteer,
    getServiceHours,
  } = useAppStore();
  const { showToast } = useToast();

  const stats = useMemo(() => {
    const total = volunteers.length;
    const assigned = volunteers.filter((v) => v.assignedStation).length;
    const unassigned = total - assigned;
    const totalHours = volunteers.reduce((sum, v) => sum + getServiceHours(v.id), 0);
    return { total, assigned, unassigned, totalHours };
  }, [volunteers, getServiceHours]);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const matchSearch = !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.phone.includes(searchQuery) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSkill = filterSkill === 'all' || v.skills.includes(filterSkill);
      const matchStation = filterStation === 'all' || v.assignedStation === filterStation;
      const matchStatus = filterStatus === 'all' || v.status === filterStatus;
      return matchSearch && matchSkill && matchStation && matchStatus;
    });
  }, [volunteers, searchQuery, filterSkill, filterStation, filterStatus]);

  const stationStats = useMemo(() => {
    return stations.map((station) => {
      const assigned = volunteers.filter((v) => v.assignedStation === station.id).length;
      return { ...station, assignedCount: assigned, remaining: station.capacity - assigned };
    });
  }, [volunteers]);

  const allCheckIns = useMemo(() => {
    const checkIns: (CheckIn & { volunteerName: string })[] = [];
    volunteers.forEach((v) => {
      v.checkIns.forEach((c) => {
        checkIns.push({ ...c, volunteerName: v.name });
      });
    });
    return checkIns.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  }, [volunteers]);

  const handleSelectAll = () => {
    if (selectedVolunteers.length === filteredVolunteers.length) {
      setSelectedVolunteers([]);
    } else {
      setSelectedVolunteers(filteredVolunteers.map((v) => v.id));
    }
  };

  const handleSelectVolunteer = (id: string) => {
    if (selectedVolunteers.includes(id)) {
      setSelectedVolunteers(selectedVolunteers.filter((vid) => vid !== id));
    } else {
      setSelectedVolunteers([...selectedVolunteers, id]);
    }
  };

  const handleAutoAssign = () => {
    const toAssign = selectedVolunteers.length > 0
      ? selectedVolunteers
      : filteredVolunteers.filter((v) => !v.assignedStation).map((v) => v.id);

    if (toAssign.length === 0) {
      showToast('warning', '没有可分配的志愿者');
      return;
    }

    const results = autoAssignVolunteers(toAssign, stations);
    setAssignResults(results);
    setShowAssignModal(true);
    setSelectedVolunteers([]);
    showToast('success', `已完成 ${results.length} 名志愿者的岗位分配`);
  };

  const handleViewDetail = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowDetailModal(true);
  };

  const handleUpdateStation = (volunteerId: string, stationId: string | null) => {
    updateVolunteer(volunteerId, { assignedStation: stationId || undefined });
    showToast('success', '岗位已更新');
  };

  const handleUpdateStatus = (volunteerId: string, status: 'active' | 'inactive' | 'pending') => {
    updateVolunteer(volunteerId, { status });
    showToast('success', '状态已更新');
  };

  const handleDeleteVolunteer = (volunteerId: string) => {
    if (window.confirm('确定要删除该志愿者吗？')) {
      deleteVolunteer(volunteerId);
      setShowDetailModal(false);
      showToast('success', '志愿者已删除');
    }
  };

  const handleExportServiceProof = (volunteer: Volunteer) => {
    setProofVolunteer(volunteer);
    setShowServiceProofModal(true);
  };

  const handleDownloadProof = () => {
    if (!proofVolunteer) return;
    try {
      exportToPDF('service-proof', `志愿服务证明_${proofVolunteer.name}`);
      showToast('success', '服务证明已下载');
    } catch {
      showToast('error', '下载失败，请重试');
    }
  };

  const getSkillLabel = (value: string) => {
    return skillOptions.find((s) => s.value === value)?.label || value;
  };

  const getStationName = (id?: string) => {
    return stations.find((s) => s.id === id)?.name || '未分配';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '已激活';
      case 'pending':
        return '待审核';
      case 'inactive':
        return '未激活';
      default:
        return status;
    }
  };

  const renderVolunteerList = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索姓名、电话、邮箱..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-primary-200"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-primary-200 bg-white"
            >
              <option value="all">全部技能</option>
              {skillOptions.map((skill) => (
                <option key={skill.value} value={skill.value}>{skill.label}</option>
              ))}
            </select>
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-primary-200 bg-white"
            >
              <option value="all">全部岗位</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-primary-200 bg-white"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <button
              onClick={handleAutoAssign}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-700 transition-all shadow-md shadow-primary-500/20"
            >
              <LucideIcons.Sparkles className="w-4 h-4" />
              自动分配
            </button>
          </div>
        </div>
      </div>

      {selectedVolunteers.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-700">
              <LucideIcons.CheckSquare className="w-5 h-5" />
              <span className="font-medium">已选择 {selectedVolunteers.length} 名志愿者</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoAssign}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                批量分配
              </button>
              <button
                onClick={() => setSelectedVolunteers([])}
                className="px-4 py-2 border border-primary-300 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedVolunteers.length === filteredVolunteers.length && filteredVolunteers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">志愿者</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">技能</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分配岗位</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">服务时长</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredVolunteers.map((volunteer) => (
                <tr key={volunteer.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedVolunteers.includes(volunteer.id)}
                      onChange={() => handleSelectVolunteer(volunteer.id)}
                      className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={volunteer.avatar}
                        alt={volunteer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{volunteer.name}</p>
                        <p className="text-sm text-gray-500">{volunteer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {getSkillLabel(skill)}
                        </span>
                      ))}
                      {volunteer.skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{volunteer.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={volunteer.assignedStation || ''}
                      onChange={(e) => handleUpdateStation(volunteer.id, e.target.value || null)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200 text-sm bg-white"
                    >
                      <option value="">未分配</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>{station.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-900">
                      {getServiceHours(volunteer.id).toFixed(1)} 小时
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getStatusColor(volunteer.status))}>
                      {getStatusLabel(volunteer.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetail(volunteer)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <LucideIcons.Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportServiceProof(volunteer)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="导出服务证明"
                      >
                        <LucideIcons.Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVolunteer(volunteer.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <LucideIcons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredVolunteers.length === 0 && (
          <div className="text-center py-12">
            <LucideIcons.Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无符合条件的志愿者</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStationManagement = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stationStats.map((station, index) => (
        <motion.div
          key={station.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-2xl shadow-card border border-gray-100 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{station.name}</h3>
              <p className="text-sm text-gray-500 mt-1">岗位需求</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <LucideIcons.MapPin className="w-6 h-6" />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">所需技能</p>
            <div className="flex flex-wrap gap-1">
              {station.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full"
                >
                  {getSkillLabel(skill)}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">分配进度</span>
              <span className="font-medium text-gray-900">
                {station.assignedCount} / {station.capacity} 人
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  station.assignedCount >= station.capacity
                    ? 'bg-green-500'
                    : station.assignedCount >= station.capacity * 0.7
                    ? 'bg-primary-500'
                    : 'bg-amber-500'
                )}
                style={{ width: `${Math.min((station.assignedCount / station.capacity) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">剩余名额</p>
              <p className={cn(
                'font-bold',
                station.remaining > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {station.remaining} 人
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">已分配志愿者</p>
              <div className="flex -space-x-2">
                {volunteers
                  .filter((v) => v.assignedStation === station.id)
                  .slice(0, 5)
                  .map((v) => (
                    <img
                      key={v.id}
                      src={v.avatar}
                      alt={v.name}
                      title={v.name}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                {station.assignedCount > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    +{station.assignedCount - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderCheckInRecords = () => (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">签到记录</h3>
          <p className="text-sm text-gray-500">共 {allCheckIns.length} 条记录</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">志愿者</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">岗位</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">签到时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">签退时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">服务时长</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
            </tr>
          </thead>
          <tbody>
            {allCheckIns.map((checkIn) => (
              <tr key={checkIn.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <span className="font-medium text-gray-900">{checkIn.volunteerName}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-gray-600">{getStationName(checkIn.stationId)}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-gray-600">{formatDate(checkIn.checkInTime, 'MM-dd HH:mm')}</span>
                </td>
                <td className="px-4 py-4">
                  {checkIn.checkOutTime ? (
                    <span className="text-gray-600">{formatDate(checkIn.checkOutTime, 'MM-dd HH:mm')}</span>
                  ) : (
                    <span className="text-amber-600">服务中</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {checkIn.duration ? (
                    <span className="font-medium text-gray-900">{checkIn.duration} 小时</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {checkIn.checkOutTime ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      已完成
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      服务中
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allCheckIns.length === 0 && (
        <div className="text-center py-12">
          <LucideIcons.ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无签到记录</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="志愿者管理"
        description="管理志愿者信息、岗位分配和签到记录"
        icon={LucideIcons.Users}
        showBackButton
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<LucideIcons.Users className="w-6 h-6" />}
          value={stats.total}
          label="总人数"
          gradient="primary"
        />
        <StatCard
          icon={<LucideIcons.CheckSquare className="w-6 h-6" />}
          value={stats.assigned}
          label="已分配"
          gradient="success"
        />
        <StatCard
          icon={<LucideIcons.Clock className="w-6 h-6" />}
          value={stats.unassigned}
          label="待分配"
          gradient="orange"
        />
        <StatCard
          icon={<LucideIcons.Timer className="w-6 h-6" />}
          value={`${stats.totalHours.toFixed(1)}h`}
          label="总服务时长"
          gradient="tech"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const TabIcon = LucideIcons[tab.icon as keyof typeof LucideIcons] as typeof LucideIcons.Users;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors relative',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <TabIcon className="w-5 h-5" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'volunteers' && renderVolunteerList()}
          {activeTab === 'stations' && renderStationManagement()}
          {activeTab === 'checkins' && renderCheckInRecords()}
        </motion.div>
      </AnimatePresence>

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        className="max-w-lg"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LucideIcons.CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">分配完成</h3>
            <p className="text-gray-500 mt-1">已完成以下志愿者的岗位分配</p>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {assignResults.map((result) => {
              const volunteer = volunteers.find((v) => v.id === result.volunteerId);
              const station = stations.find((s) => s.id === result.stationId);

              return (
                <div
                  key={result.volunteerId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={volunteer?.avatar}
                      alt={volunteer?.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{volunteer?.name}</p>
                      <p className="text-sm text-gray-500">{result.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary-600">{station?.name}</p>
                    <p className="text-sm text-green-600">匹配度 {result.matchScore}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowAssignModal(false)}
            className="w-full mt-6 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            确定
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        className="max-w-2xl"
      >
        {selectedVolunteer && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedVolunteer.avatar}
                  alt={selectedVolunteer.name}
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedVolunteer.name}</h3>
                  <p className="text-gray-500 mt-1">{selectedVolunteer.email}</p>
                  <p className="text-gray-500">{selectedVolunteer.phone}</p>
                </div>
              </div>
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', getStatusColor(selectedVolunteer.status))}>
                {getStatusLabel(selectedVolunteer.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">技能</p>
                <div className="flex flex-wrap gap-1">
                  {selectedVolunteer.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                    >
                      {getSkillLabel(skill)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">分配岗位</p>
                <p className="font-medium text-gray-900">
                  {getStationName(selectedVolunteer.assignedStation)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">总服务时长</p>
                <p className="font-bold text-primary-600">
                  {getServiceHours(selectedVolunteer.id).toFixed(1)} 小时
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">签到次数</p>
                <p className="font-bold text-gray-900">
                  {selectedVolunteer.checkIns.length} 次
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">状态管理</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedVolunteer.id, 'active')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl font-medium transition-colors',
                    selectedVolunteer.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  激活
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedVolunteer.id, 'pending')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl font-medium transition-colors',
                    selectedVolunteer.status === 'pending'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  待审核
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedVolunteer.id, 'inactive')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl font-medium transition-colors',
                    selectedVolunteer.status === 'inactive'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  禁用
                </button>
              </div>
            </div>

            {selectedVolunteer.checkIns.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">近期签到记录</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedVolunteer.checkIns.slice(-5).reverse().map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {getStationName(checkIn.stationId)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(checkIn.checkInTime, 'yyyy-MM-dd HH:mm')}
                        </p>
                      </div>
                      {checkIn.duration && (
                        <span className="font-medium text-primary-600">
                          {checkIn.duration} 小时
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => handleExportServiceProof(selectedVolunteer)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                <LucideIcons.Download className="w-4 h-4" />
                导出服务证明
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showServiceProofModal}
        onClose={() => setShowServiceProofModal(false)}
        className="max-w-2xl"
      >
        {proofVolunteer && (
          <div className="p-6">
            <div id="service-proof" className="bg-white p-8 rounded-xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LucideIcons.Award className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">志愿服务证明</h1>
                <p className="text-gray-500 mt-1">Volunteer Service Certificate</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">姓名</span>
                  <span className="font-medium text-gray-900">{proofVolunteer.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">邮箱</span>
                  <span className="font-medium text-gray-900">{proofVolunteer.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">服务岗位</span>
                  <span className="font-medium text-gray-900">
                    {getStationName(proofVolunteer.assignedStation)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">总服务时长</span>
                  <span className="font-bold text-primary-600">
                    {getServiceHours(proofVolunteer.id).toFixed(1)} 小时
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">服务次数</span>
                  <span className="font-medium text-gray-900">
                    {proofVolunteer.checkIns.length} 次
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">认证日期</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(new Date(), 'yyyy年MM月dd日')}
                  </span>
                </div>
              </div>

              <div className="text-center text-gray-500 text-sm">
                <p>此证明由大型综合性运动会智慧管理系统自动生成</p>
                <p className="mt-1">本证明具有同等法律效力</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowServiceProofModal(false)}
                className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleDownloadProof}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                <LucideIcons.Download className="w-4 h-4" />
                下载PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
