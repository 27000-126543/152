import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Move,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  Wallet,
  QrCode,
  Flame,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PageHeader } from '@/components/PageHeader';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProgressBar from '@/components/ProgressBar';
import { useAppStore } from '@/store/useAppStore';
import { cn, calculateDynamicPrice, formatDate } from '@/utils';
import type { Schedule, Seat, PriceTier, TicketOrder } from '@/types';

interface SeatWithUI extends Seat {
  uiStatus: 'available' | 'sold' | 'selected' | 'maintenance';
}

interface ScheduleWithHeat extends Schedule {
  heat: number;
  remainingSeats: number;
  totalSeats: number;
  basePrices: Record<PriceTier, number>;
}

const basePrices: Record<PriceTier, number> = {
  VIP: 2000,
  A: 1200,
  B: 800,
  C: 400,
};

const seatTierColors: Record<PriceTier, string> = {
  VIP: 'bg-amber-400',
  A: 'bg-blue-400',
  B: 'bg-green-400',
  C: 'bg-gray-400',
};

const seatStatusColors: Record<string, string> = {
  available: 'hover:ring-2 hover:ring-offset-2 hover:ring-primary-500 cursor-pointer',
  sold: 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60',
  selected: 'ring-4 ring-offset-2 ring-primary-500 scale-110 cursor-pointer',
  maintenance: 'bg-red-200 dark:bg-red-900/50 cursor-not-allowed opacity-50',
};

const seatStatusFills: Record<string, string> = {
  available: '#10B981',
  sold: '#9CA3AF',
  selected: '#3B82F6',
  maintenance: '#EF4444',
  VIP: '#F59E0B',
  A: '#3B82F6',
  B: '#10B981',
  C: '#6B7280',
};

export default function Buy() {
  const { schedules, venues, ticketOrders, currentUser, purchaseTicket } = useAppStore();
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithHeat | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatWithUI[]>([]);
  const [seats, setSeats] = useState<SeatWithUI[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [venueFilter, setVenueFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('alipay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [completedOrder, setCompletedOrder] = useState<TicketOrder | null>(null);
  const [animatedPrice, setAnimatedPrice] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const schedulesWithHeat = useMemo((): ScheduleWithHeat[] => {
    return schedules.map((schedule) => {
      const venue = venues.find((v) => v.id === schedule.venueId);
      const totalSeats = venue?.capacity || 10000;
      const soldSeats = ticketOrders.filter(
        (t) => t.scheduleId === schedule.id && t.status === 'paid'
      ).length;
      const remainingSeats = totalSeats - soldSeats;
      const baseHeat = Math.floor(Math.random() * 40) + 30;
      const salesRatio = soldSeats / totalSeats;
      const heat = Math.min(100, Math.floor(baseHeat + salesRatio * 50));

      return {
        ...schedule,
        heat,
        remainingSeats,
        totalSeats,
        basePrices,
      };
    });
  }, [schedules, venues, ticketOrders]);

  const filteredSchedules = useMemo(() => {
    return schedulesWithHeat.filter((schedule) => {
      const matchesDate = !dateFilter || schedule.date === dateFilter;
      const matchesVenue = !venueFilter || schedule.venueId === venueFilter;
      const matchesSearch =
        !searchQuery ||
        schedule.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.venueName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesVenue && matchesSearch;
    });
  }, [schedulesWithHeat, dateFilter, venueFilter, searchQuery]);

  const uniqueDates = useMemo(() => {
    return [...new Set(schedules.map((s) => s.date))].sort();
  }, [schedules]);

  const categories = useMemo(() => {
    return [...new Set(schedules.map((s) => s.eventName.split(' ')[0]))];
  }, [schedules]);

  const totalPrice = useMemo(() => {
    if (!selectedSchedule) return 0;
    return selectedSeats.reduce((sum, seat) => {
      const price = calculateDynamicPrice(
        selectedSchedule.basePrices[seat.priceTier],
        selectedSchedule.heat,
        selectedSchedule.remainingSeats,
        selectedSchedule.totalSeats
      );
      return sum + price;
    }, 0);
  }, [selectedSeats, selectedSchedule]);

  const originalPrice = useMemo(() => {
    if (!selectedSchedule) return 0;
    return selectedSeats.reduce((sum, seat) => {
      return sum + selectedSchedule.basePrices[seat.priceTier];
    }, 0);
  }, [selectedSeats, selectedSchedule]);

  const priceChangePercent = useMemo(() => {
    if (originalPrice === 0) return 0;
    return Math.round(((totalPrice - originalPrice) / originalPrice) * 100);
  }, [totalPrice, originalPrice]);

  useEffect(() => {
    let start = animatedPrice;
    const end = totalPrice;
    const duration = 500;
    const startTime = performance.now();

    if (start === end) return;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeProgress);
      setAnimatedPrice(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalPrice]);

  useEffect(() => {
    if (selectedSchedule) {
      generateSeats(selectedSchedule);
    }
  }, [selectedSchedule]);

  const generateSeats = (schedule: ScheduleWithHeat) => {
    const newSeats: SeatWithUI[] = [];
    const rows = 15;
    const cols = 20;
    const soldCount = Math.floor((schedule.totalSeats - schedule.remainingSeats) / 50);
    const maintenanceCount = 5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let tier: PriceTier;
        if (row < 3) tier = 'VIP';
        else if (row < 7) tier = 'A';
        else if (row < 11) tier = 'B';
        else tier = 'C';

        const seatId = `${schedule.id}-${row}-${col}`;
        const isSold = Math.random() < soldCount / (rows * cols);
        const isMaintenance = Math.random() < maintenanceCount / (rows * cols);

        newSeats.push({
          id: seatId,
          venueId: schedule.venueId,
          section: String.fromCharCode(65 + row),
          row: String(row + 1),
          number: String(col + 1),
          status: isSold ? 'sold' : 'available',
          priceTier: tier,
          dynamicPrice: calculateDynamicPrice(
            basePrices[tier],
            schedule.heat,
            schedule.remainingSeats,
            schedule.totalSeats
          ),
          uiStatus: isMaintenance ? 'maintenance' : isSold ? 'sold' : 'available',
        });
      }
    }

    setSeats(newSeats);
    setSelectedSeats([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleSeatClick = (seat: SeatWithUI) => {
    if (seat.uiStatus === 'sold' || seat.uiStatus === 'maintenance') return;

    if (selectedSeats.find((s) => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
      setSeats(
        seats.map((s) => (s.id === seat.id ? { ...s, uiStatus: 'available' } : s))
      );
    } else {
      if (selectedSeats.length >= 6) {
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
      setSeats(
        seats.map((s) => (s.id === seat.id ? { ...s, uiStatus: 'selected' } : s))
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.5, Math.min(2, zoom + delta)));
  };

  const handleConfirmOrder = () => {
    if (selectedSeats.length === 0 || !currentUser) return;
    setShowOrderModal(false);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedSchedule || !currentUser || selectedSeats.length === 0) return;

    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const orders: TicketOrder[] = [];
    for (const seat of selectedSeats) {
      const dynamicPrice = calculateDynamicPrice(
        selectedSchedule.basePrices[seat.priceTier],
        selectedSchedule.heat,
        selectedSchedule.remainingSeats,
        selectedSchedule.totalSeats
      );
      const order = purchaseTicket(
        currentUser.id,
        selectedSchedule.id,
        seat.id,
        `${seat.priceTier}区 ${seat.section}排${seat.number}座`,
        dynamicPrice,
        selectedSchedule.basePrices[seat.priceTier]
      );
      orders.push(order);
    }

    if (orders.length > 0) {
      const qrData = JSON.stringify({
        orderId: orders[0].id,
        scheduleId: selectedSchedule.id,
        seats: selectedSeats.map((s) => s.id),
        timestamp: Date.now(),
      });
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setCompletedOrder(orders[0]);
    }

    setIsProcessing(false);
    setShowPaymentModal(false);
    setShowSuccessModal(true);
  };

  const handleZoomIn = () => setZoom(Math.min(2, zoom + 0.2));
  const handleZoomOut = () => setZoom(Math.max(0.5, zoom - 0.2));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getSeatPosition = (seat: SeatWithUI) => {
    const row = parseInt(seat.row) - 1;
    const col = parseInt(seat.number) - 1;
    const seatWidth = 28;
    const seatHeight = 20;
    const gapX = 4;
    const gapY = 6;
    const startX = 50;
    const startY = 80;

    return {
      x: startX + col * (seatWidth + gapX),
      y: startY + row * (seatHeight + gapY),
      width: seatWidth,
      height: seatHeight,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="购票选座"
        description="选择比赛，挑选心仪座位，享受精彩赛事"
        icon={Ticket}
      />

      <div className="flex flex-col lg:flex-row gap-6 pb-28">
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索比赛名称或场馆..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  日期
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">全部日期</option>
                  {uniqueDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date, 'MM月dd日 EEEE')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  场馆
                </label>
                <select
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">全部场馆</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                热门比赛
                <span className="text-sm font-normal text-gray-500">
                  ({filteredSchedules.length}场)
                </span>
              </h3>
            </div>
            <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
              {filteredSchedules.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>没有找到匹配的比赛</p>
                </div>
              ) : (
                filteredSchedules.map((schedule) => (
                  <motion.div
                    key={schedule.id}
                    whileHover={{ x: 4 }}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={cn(
                      'p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all',
                      selectedSchedule?.id === schedule.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white flex-1">
                        {schedule.eventName}
                      </h4>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          schedule.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : schedule.status === 'ongoing'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        )}
                      >
                        {schedule.status === 'scheduled'
                          ? '即将开始'
                          : schedule.status === 'ongoing'
                          ? '进行中'
                          : '已结束'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(schedule.date, 'MM-dd')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {schedule.startTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {schedule.venueName}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <Flame className="w-3.5 h-3.5" />
                          热度 {schedule.heat}%
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          剩余 {schedule.remainingSeats.toLocaleString()} 座
                        </span>
                      </div>
                      <ProgressBar
                        value={schedule.heat}
                        color={schedule.heat > 70 ? 'danger' : schedule.heat > 40 ? 'orange' : 'success'}
                        showLabel={false}
                        size="sm"
                        className="!mb-0"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">¥</span>
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          {basePrices.C}
                        </span>
                        <span className="text-xs text-gray-500">起</span>
                      </div>
                      {schedule.heat > 70 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          价格上浮
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {selectedSchedule ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedSchedule.eventName}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedSchedule.date, 'yyyy年MM月dd日 EEEE')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedSchedule.startTime} - {selectedSchedule.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedSchedule.venueName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-orange-500 mb-1">
                      <Flame className="w-4 h-4" />
                      <span className="font-semibold">热度 {selectedSchedule.heat}%</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      剩余 {selectedSchedule.remainingSeats.toLocaleString()} /{' '}
                      {selectedSchedule.totalSeats.toLocaleString()} 座
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      座位等级:
                    </span>
                    {(['VIP', 'A', 'B', 'C'] as PriceTier[]).map((tier) => (
                      <div key={tier} className="flex items-center gap-2">
                        <div
                          className={cn('w-4 h-4 rounded', seatTierColors[tier])}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {tier}区 ¥
                          {calculateDynamicPrice(
                            basePrices[tier],
                            selectedSchedule.heat,
                            selectedSchedule.remainingSeats,
                            selectedSchedule.totalSeats
                          ).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      状态:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">可选</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">已售</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500 ring-2 ring-offset-1 ring-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">已选</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-300" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">维修</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <button
                      onClick={handleZoomIn}
                      className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="放大"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="缩小"
                    >
                      <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="重置视图"
                    >
                      <Move className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  <div
                    className="relative bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                    style={{ height: '500px' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                  >
                    <svg
                      ref={svgRef}
                      viewBox="0 0 700 500"
                      className="w-full h-full"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                      }}
                    >
                      <defs>
                        <linearGradient id="stageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#4F46E5" />
                        </linearGradient>
                        <filter id="seatShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="1" floodOpacity="0.2" />
                        </filter>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <rect
                        x="250"
                        y="20"
                        width="200"
                        height="40"
                        rx="8"
                        fill="url(#stageGradient)"
                        filter="url(#seatShadow)"
                      />
                      <text
                        x="350"
                        y="47"
                        textAnchor="middle"
                        fill="white"
                        fontSize="16"
                        fontWeight="bold"
                      >
                        舞台 / 比赛场地
                      </text>

                      {seats.map((seat) => {
                        const pos = getSeatPosition(seat);
                        const isSelected = selectedSeats.find((s) => s.id === seat.id);
                        const fillColor =
                          seat.uiStatus === 'sold'
                            ? seatStatusFills.sold
                            : seat.uiStatus === 'maintenance'
                            ? seatStatusFills.maintenance
                            : isSelected
                            ? seatStatusFills.selected
                            : seatStatusFills[seat.priceTier];

                        return (
                          <g
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            className={cn(
                              seat.uiStatus === 'available' || seat.uiStatus === 'selected'
                                ? 'cursor-pointer'
                                : 'cursor-not-allowed'
                            )}
                          >
                            <rect
                              x={pos.x}
                              y={pos.y}
                              width={pos.width}
                              height={pos.height}
                              rx="4"
                              fill={fillColor}
                              filter={isSelected ? 'url(#glow)' : 'url(#seatShadow)'}
                              className={cn(
                                'transition-all duration-200',
                                isSelected && 'scale-110 origin-center'
                              )}
                              style={{
                                transform: isSelected
                                  ? `translate(${pos.width * -0.05}px, ${pos.height * -0.05}px) scale(1.1)`
                                  : 'none',
                              }}
                            />
                            {isSelected && (
                              <text
                                x={pos.x + pos.width / 2}
                                y={pos.y + pos.height / 2 + 4}
                                textAnchor="middle"
                                fill="white"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                ✓
                              </text>
                            )}
                          </g>
                        );
                      })}

                      <g transform="translate(30, 100)">
                        {['VIP', 'A', 'B', 'C'].map((tier, i) => (
                          <text
                            key={tier}
                            x="0"
                            y={i * 100 + 50}
                            fill="#6B7280"
                            fontSize="12"
                            fontWeight="bold"
                            transform="rotate(-90, 0, 0)"
                          >
                            {tier}区
                          </text>
                        ))}
                      </g>

                      <g transform="translate(50, 450)">
                        {Array.from({ length: 20 }, (_, i) => (
                          <text
                            key={i}
                            x={i * 32 + 14}
                            y="0"
                            fill="#6B7280"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {i + 1}
                          </text>
                        ))}
                      </g>
                    </svg>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      拖拽可平移座位图，滚轮可缩放，最多可选6个座位
                    </span>
                    <span>当前缩放: {Math.round(zoom * 100)}%</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                请选择比赛
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                从左侧列表中选择一场比赛，然后在座位图中挑选您喜欢的座位
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-40"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">已选座位</span>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedSeats.map((seat) => (
                      <motion.span
                        key={seat.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium"
                      >
                        {seat.priceTier}区 {seat.section}排{seat.number}座
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />

                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">总价</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500">¥</span>
                    <motion.span
                      key={animatedPrice}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-3xl font-bold text-primary-600 dark:text-primary-400"
                    >
                      {animatedPrice.toLocaleString()}
                    </motion.span>
                    {originalPrice !== totalPrice && (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          ¥{originalPrice.toLocaleString()}
                        </span>
                        <span
                          className={cn(
                            'flex items-center gap-0.5 text-sm font-medium',
                            priceChangePercent > 0
                              ? 'text-red-500'
                              : 'text-green-500'
                          )}
                        >
                          {priceChangePercent > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {priceChangePercent > 0 ? '+' : ''}
                          {priceChangePercent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowOrderModal(true)}
                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                确认选座 ({selectedSeats.length}张)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="确认订单信息"
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowOrderModal(false)}
              className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              返回修改
            </button>
            <button
              onClick={handleConfirmOrder}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              确认订单
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      >
        {selectedSchedule && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {selectedSchedule.eventName}
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedSchedule.date, 'yyyy-MM-dd')} {selectedSchedule.startTime}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {selectedSchedule.venueName}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">已选座位</h5>
              <div className="space-y-2">
                {selectedSeats.map((seat) => {
                  const dynamicPrice = calculateDynamicPrice(
                    selectedSchedule.basePrices[seat.priceTier],
                    selectedSchedule.heat,
                    selectedSchedule.remainingSeats,
                    selectedSchedule.totalSeats
                  );
                  const original = selectedSchedule.basePrices[seat.priceTier];
                  const diff = Math.round(((dynamicPrice - original) / original) * 100);

                  return (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                            seatTierColors[seat.priceTier]
                          )}
                        >
                          {seat.priceTier}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {seat.section}排{seat.number}座
                          </p>
                          <p className="text-xs text-gray-500">
                            {seat.priceTier}等座
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ¥{dynamicPrice.toFixed(0)}
                        </p>
                        {diff !== 0 && (
                          <p
                            className={cn(
                              'text-xs flex items-center justify-end gap-0.5',
                              diff > 0 ? 'text-red-500' : 'text-green-500'
                            )}
                          >
                            {diff > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {diff > 0 ? '+' : ''}
                            {diff}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">原价合计</span>
                <span className="text-gray-600 dark:text-gray-300 line-through">
                  ¥{originalPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">动态定价调整</span>
                <span
                  className={cn(
                    'font-medium',
                    priceChangePercent > 0 ? 'text-red-500' : 'text-green-500'
                  )}
                >
                  {priceChangePercent > 0 ? '+' : ''}¥
                  {(totalPrice - originalPrice).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-primary-200 dark:border-primary-800">
                <span className="font-semibold text-gray-900 dark:text-white">应付金额</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  ¥{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {selectedSchedule.heat > 70 && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    热门赛事提示
                  </p>
                  <p className="text-orange-600 dark:text-orange-300 mt-1">
                    该比赛热度较高，价格已上浮{priceChangePercent}%。建议尽快完成支付锁定座位。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => !isProcessing && setShowPaymentModal(false)}
        title="选择支付方式"
        className="max-w-md"
        maskClosable={!isProcessing}
      >
        <div className="space-y-6">
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400 mb-2">支付金额</p>
            <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              ¥{totalPrice.toLocaleString()}
            </p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'alipay', name: '支付宝', icon: Wallet, color: 'text-blue-500' },
              { id: 'wechat', name: '微信支付', icon: Smartphone, color: 'text-green-500' },
              { id: 'card', name: '银行卡支付', icon: CreditCard, color: 'text-purple-500' },
            ].map((method) => (
              <motion.div
                key={method.id}
                whileHover={{ x: 4 }}
                onClick={() => !isProcessing && setPaymentMethod(method.id)}
                className={cn(
                  'p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4',
                  paymentMethod === method.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-xl bg-gray-100 dark:bg-gray-700',
                    method.color
                  )}
                >
                  <method.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    paymentMethod === method.id
                      ? 'border-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {paymentMethod === method.id && (
                    <div className="w-3 h-3 rounded-full bg-primary-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2',
              isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30'
            )}
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                处理中...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                立即支付 ¥{totalPrice.toLocaleString()}
              </>
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSelectedSeats([]);
          setSeats([]);
          setSelectedSchedule(null);
        }}
        title="购票成功"
        className="max-w-md"
      >
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              购票成功！
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              您的门票已购买成功，请在入场时出示二维码
            </p>
          </div>

          {qrCodeDataUrl && (
            <div className="p-6 bg-white rounded-xl shadow-inner">
              <img
                src={qrCodeDataUrl}
                alt="门票二维码"
                className="w-48 h-48 mx-auto"
              />
              <p className="mt-3 text-sm text-gray-500">
                订单号: {completedOrder?.id}
              </p>
            </div>
          )}

          {selectedSchedule && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-left">
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                {selectedSchedule.eventName}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {formatDate(selectedSchedule.date, 'yyyy-MM-dd')}{' '}
                  {selectedSchedule.startTime}
                </p>
                <p>
                  <MapPin className="w-4 h-4 inline mr-2" />
                  {selectedSchedule.venueName}
                </p>
                <p>
                  <Star className="w-4 h-4 inline mr-2" />
                  {selectedSeats
                    .map((s) => `${s.priceTier}区${s.section}排${s.number}座`)
                    .join('、')}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSelectedSeats([]);
                setSeats([]);
                setSelectedSchedule(null);
              }}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              返回首页
            </button>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSelectedSeats([]);
                setSeats([]);
                setSelectedSchedule(null);
                window.location.href = '/ticket/order';
              }}
              className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              查看订单
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
