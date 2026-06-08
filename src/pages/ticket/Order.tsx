import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Calendar,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  QrCode,
  Download,
  Share2,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  CreditCard,
  BarChart3,
  TrendingUp,
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/useAppStore';
import { cn, formatDate, exportToPDF } from '@/utils';
import type { TicketOrder, Schedule } from '@/types';

interface OrderWithSchedule extends TicketOrder {
  schedule?: Schedule;
}

type TabType = 'all' | 'upcoming' | 'completed' | 'refunded';

const statusConfig = {
  paid: { label: '已支付', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  refunded: { label: '已退票', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function Order() {
  const { ticketOrders, schedules, currentUser, refundTicket } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithSchedule | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const myOrders = useMemo((): OrderWithSchedule[] => {
    if (!currentUser) return [];
    return ticketOrders
      .filter((order) => order.audienceId === currentUser.id)
      .map((order) => ({
        ...order,
        schedule: schedules.find((s) => s.id === order.scheduleId),
      }))
      .sort(
        (a, b) =>
          new Date(b.purchaseTime).getTime() - new Date(a.purchaseTime).getTime()
      );
  }, [ticketOrders, schedules, currentUser]);

  const filteredOrders = useMemo(() => {
    return myOrders.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.schedule?.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.seatInfo.toLowerCase().includes(searchQuery.toLowerCase());

      const now = new Date();
      const eventDate = order.schedule
        ? new Date(`${order.schedule.date}T${order.schedule.startTime}`)
        : new Date();

      let matchesTab = true;
      switch (activeTab) {
        case 'upcoming':
          matchesTab = order.status === 'paid' && eventDate > now;
          break;
        case 'completed':
          matchesTab = order.status === 'paid' && eventDate <= now;
          break;
        case 'refunded':
          matchesTab = order.status === 'refunded';
          break;
      }

      return matchesSearch && matchesTab;
    });
  }, [myOrders, searchQuery, activeTab]);

  const statistics = useMemo(() => {
    const now = new Date();
    const total = myOrders.length;
    const paid = myOrders.filter((o) => o.status === 'paid');
    const upcoming = paid.filter((o) => {
      const eventDate = o.schedule
        ? new Date(`${o.schedule.date}T${o.schedule.startTime}`)
        : new Date();
      return eventDate > now;
    }).length;
    const completed = paid.length - upcoming;
    const refunded = myOrders.filter((o) => o.status === 'refunded').length;
    const totalSpent = paid.reduce((sum, o) => sum + o.price, 0);

    return { total, upcoming, completed, refunded, totalSpent };
  }, [myOrders]);

  const trendData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date, 'MM-dd');

      const dayOrders = myOrders.filter((o) => {
        const orderDate = new Date(o.purchaseTime);
        return (
          orderDate.getDate() === date.getDate() &&
          orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === date.getFullYear()
        );
      });

      last7Days.push({
        date: dateStr,
        订单数: dayOrders.length,
        金额: dayOrders.reduce((sum, o) => sum + (o.status === 'paid' ? o.price : 0), 0),
      });
    }
    return last7Days;
  }, [myOrders]);

  const handleRefundClick = (orderId: string) => {
    setRefundOrderId(orderId);
    setShowRefundDialog(true);
  };

  const handleConfirmRefund = async () => {
    if (!refundOrderId) return;

    setIsRefunding(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    refundTicket(refundOrderId);

    setIsRefunding(false);
    setShowRefundDialog(false);
    setRefundOrderId(null);
  };

  const handleViewTicket = async (order: OrderWithSchedule) => {
    setSelectedOrder(order);

    const qrData = JSON.stringify({
      orderId: order.id,
      scheduleId: order.scheduleId,
      seatId: order.seatId,
      timestamp: Date.now(),
      secureHash: order.qrCode,
    });

    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1F2937',
        light: '#FFFFFF',
      },
    });
    setQrCodeDataUrl(dataUrl);
    setShowTicketModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    try {
      await exportToPDF('ticket-content', `门票-${selectedOrder.id}`);
    } catch (error) {
      console.error('PDF导出失败:', error);
    }
  };

  const handleTransfer = async () => {
    setIsTransferring(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsTransferring(false);
    setShowTransferModal(false);
    setTransferEmail('');
  };

  const canRefund = (order: OrderWithSchedule) => {
    if (order.status !== 'paid') return false;
    if (!order.schedule) return false;
    const eventDate = new Date(`${order.schedule.date}T${order.schedule.startTime}`);
    const now = new Date();
    const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const getTabCount = (tab: TabType) => {
    const now = new Date();
    switch (tab) {
      case 'all':
        return myOrders.length;
      case 'upcoming':
        return myOrders.filter((o) => {
          const eventDate = o.schedule
            ? new Date(`${o.schedule.date}T${o.schedule.startTime}`)
            : new Date();
          return o.status === 'paid' && eventDate > now;
        }).length;
      case 'completed':
        return myOrders.filter((o) => {
          const eventDate = o.schedule
            ? new Date(`${o.schedule.date}T${o.schedule.startTime}`)
            : new Date();
          return o.status === 'paid' && eventDate <= now;
        }).length;
      case 'refunded':
        return myOrders.filter((o) => o.status === 'refunded').length;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <PageHeader
        title="我的订单"
        description="查看和管理您的所有门票订单"
        icon={Ticket}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Ticket className="w-6 h-6" />}
          value={statistics.total}
          label="购票总数"
          gradient="primary"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          value={statistics.upcoming}
          label="待观看"
          gradient="orange"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          value={statistics.completed}
          label="已观看"
          gradient="success"
        />
        <StatCard
          icon={<CreditCard className="w-6 h-6" />}
          value={`¥${statistics.totalSpent.toLocaleString()}`}
          label="总花费"
          gradient="tech"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          购票趋势
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="金额"
                stroke="#6366F1"
                fill="url(#colorAmount)"
                strokeWidth={2}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="订单数"
                stroke="#10B981"
                fill="url(#colorCount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(['all', 'upcoming', 'completed', 'refunded'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    activeTab === tab
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {tab === 'all'
                    ? '全部'
                    : tab === 'upcoming'
                    ? '待观看'
                    : tab === 'completed'
                    ? '已观看'
                    : '退票'}
                  <span className="ml-1 opacity-70">({getTabCount(tab)})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索比赛或订单号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无订单
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? '没有找到匹配的订单，请尝试其他搜索词'
                  : activeTab === 'refunded'
                  ? '您还没有退票记录'
                  : '快去选购心仪的比赛门票吧'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {order.schedule?.eventName || '未知比赛'}
                        </h4>
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-medium',
                            statusConfig[order.status].color
                          )}
                        >
                          {statusConfig[order.status].label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {order.schedule
                            ? `${formatDate(order.schedule.date, 'yyyy-MM-dd')} ${order.schedule.startTime}`
                            : '时间未知'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {order.schedule?.venueName || '场馆未知'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ticket className="w-4 h-4" />
                          {order.seatInfo}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          订单号: {order.id}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          购票时间: {formatDate(order.purchaseTime, 'yyyy-MM-dd HH:mm')}
                        </span>
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          ¥{order.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedOrder === order.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              原价
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ¥{order.originalPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              实付
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ¥{order.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              价格变动
                            </p>
                            <p
                              className={cn(
                                'font-semibold',
                                order.price > order.originalPrice
                                  ? 'text-red-500'
                                  : order.price < order.originalPrice
                                  ? 'text-green-500'
                                  : 'text-gray-900 dark:text-white'
                              )}
                            >
                              {order.price > order.originalPrice
                                ? `+¥${(order.price - order.originalPrice).toLocaleString()}`
                                : order.price < order.originalPrice
                                ? `-¥${(order.originalPrice - order.price).toLocaleString()}`
                                : '无变动'}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              支付状态
                            </p>
                            <p
                              className={cn(
                                'font-semibold flex items-center gap-1',
                                order.status === 'paid'
                                  ? 'text-green-500'
                                  : order.status === 'refunded'
                                  ? 'text-gray-500'
                                  : 'text-red-500'
                              )}
                            >
                              {order.status === 'paid' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              {order.status === 'paid'
                                ? '已支付'
                                : order.status === 'refunded'
                                ? '已退款'
                                : '未支付'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {order.status === 'paid' && (
                            <>
                              <button
                                onClick={() => handleViewTicket(order)}
                                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
                              >
                                <QrCode className="w-4 h-4" />
                                查看门票
                              </button>
                              <button
                                onClick={() => handleViewTicket(order)}
                                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                下载门票
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowTransferModal(true);
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
                              >
                                <Share2 className="w-4 h-4" />
                                转赠门票
                              </button>
                              {canRefund(order) && (
                                <button
                                  onClick={() => handleRefundClick(order.id)}
                                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  申请退票
                                </button>
                              )}
                            </>
                          )}
                          {order.status === 'refunded' && (
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                              <Info className="w-4 h-4" />
                              <span className="text-sm">
                                退款已于 {formatDate(order.purchaseTime, 'yyyy-MM-dd')} 原路返回
                              </span>
                            </div>
                          )}
                        </div>

                        {order.status === 'paid' && !canRefund(order) && (
                          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              距离比赛开始不足24小时，根据退票规则，此订单已无法退票。
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showRefundDialog}
        onClose={() => !isRefunding && setShowRefundDialog(false)}
        onConfirm={handleConfirmRefund}
        title="确认退票"
        icon={<Trash2 className="w-6 h-6 text-red-500" />}
        confirmText="确认退票"
        confirmButtonClass="bg-red-500 hover:bg-red-600 shadow-red-500/25"
        isLoading={isRefunding}
      >
        <div className="mt-4 space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            您确定要申请退票吗？退票后座位将被释放，款项将在3-5个工作日内原路返回。
          </p>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2">
            <h5 className="font-medium text-gray-900 dark:text-white">退票规则</h5>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>• 比赛开始前24小时以上可全额退票</li>
              <li>• 比赛开始前24小时内退票收取30%手续费</li>
              <li>• 比赛开始后不予退票</li>
              <li>• 退款将在3-5个工作日内原路返回</li>
            </ul>
          </div>
        </div>
      </ConfirmDialog>

      <Modal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="电子门票"
        className="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div
              id="ticket-content"
              className="relative bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 rounded-3xl p-1 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full">
                  <pattern
                    id="security-pattern"
                    patternUnits="userSpaceOnUse"
                    width="40"
                    height="40"
                  >
                    <circle cx="20" cy="20" r="1" fill="white" />
                    <path
                      d="M0 20 L40 20 M20 0 L20 40"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#security-pattern)" />
                </svg>
              </div>

              <div className="relative bg-white dark:bg-gray-900 rounded-[22px] overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{
                    background:
                      'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899, #F59E0B, #6366F1)',
                    backgroundSize: '200% 100%',
                    animation: 'gradient 3s linear infinite',
                  }}
                />

                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        大型综合性运动会
                      </p>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedOrder.schedule?.eventName}
                      </h3>
                    </div>
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                      <Ticket className="w-6 h-6 text-primary-500" />
                    </div>
                  </div>

                  <div className="relative py-4 mb-6">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-900 -ml-8 border-r border-dashed border-gray-200 dark:border-gray-700" />
                      <div className="flex-1 h-0 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
                      <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-900 -mr-8 border-l border-dashed border-gray-200 dark:border-gray-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">日期</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.schedule
                          ? formatDate(selectedOrder.schedule.date, 'yyyy年MM月dd日')
                          : '未知'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">时间</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.schedule?.startTime || '未知'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">场馆</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.schedule?.venueName || '未知'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">座位</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedOrder.seatInfo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">票价</p>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        ¥{selectedOrder.price.toLocaleString()}
                      </p>
                    </div>
                    {qrCodeDataUrl && (
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-inner">
                        <img
                          src={qrCodeDataUrl}
                          alt="门票二维码"
                          className="w-24 h-24"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span>订单号: {selectedOrder.id}</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      防伪验证
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    入场须知
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• 请在比赛开始前60分钟到场，配合安检入场</li>
                    <li>• 一人一票，凭二维码入场，转发无效</li>
                    <li>• 禁止携带易燃易爆物品、专业摄像设备入场</li>
                    <li>• 请勿在观赛时使用闪光灯拍照</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                下载PDF
              </button>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setShowTransferModal(true);
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                转赠门票
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showTransferModal}
        onClose={() => !isTransferring && setShowTransferModal(false)}
        title="转赠门票"
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                转赠说明
              </p>
              <p className="text-blue-600 dark:text-blue-300">
                转赠后，门票使用权将转移至接收方，您将无法再使用此门票入场。
              </p>
            </div>
          </div>

          {selectedOrder && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                {selectedOrder.schedule?.eventName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedOrder.seatInfo} | ¥{selectedOrder.price.toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              接收方邮箱
            </label>
            <input
              type="email"
              placeholder="请输入接收方的注册邮箱"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowTransferModal(false);
                setTransferEmail('');
              }}
              disabled={isTransferring}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleTransfer}
              disabled={isTransferring || !transferEmail}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTransferring ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  转赠中...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  确认转赠
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
