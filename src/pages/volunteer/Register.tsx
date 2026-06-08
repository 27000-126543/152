import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/utils';
import { cn } from '@/lib/utils';
import type { Volunteer, AssignResult, TimeSlot } from '@/types';

const skillOptions = [
  { value: 'translation', label: '翻译', icon: 'Languages', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'guidance', label: '引导', icon: 'MapPin', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medical', label: '医疗', icon: 'Heart', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'technical', label: '技术', icon: 'Cpu', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'etiquette', label: '礼仪', icon: 'Award', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'security', label: '安保协助', icon: 'Shield', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'photography', label: '摄影', icon: 'Camera', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'logistics', label: '后勤', icon: 'Package', color: 'bg-orange-100 text-orange-700 border-orange-200' },
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

const timeSlots = [
  { value: 'morning', label: '上午 08:00-12:00' },
  { value: 'afternoon', label: '下午 12:00-18:00' },
  { value: 'evening', label: '晚间 18:00-22:00' },
];

const formSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  gender: z.enum(['male', 'female'], { required_error: '请选择性别' }),
  birthDate: z.string().min(1, '请选择出生日期'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().min(1, '请输入电话号码').regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  idCard: z.string().min(18, '身份证号必须为18位').max(18, '身份证号必须为18位'),
  skills: z.array(z.string()).min(1, '请至少选择一项技能'),
  availableDates: z.array(z.string()).min(1, '请至少选择一个服务日期'),
  availableTimeSlots: z.array(z.string()).min(1, '请至少选择一个时间段'),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: '基本信息', icon: 'User' },
  { id: 2, name: '技能特长', icon: 'Sparkles' },
  { id: 3, name: '可用时段', icon: 'Calendar' },
];

export default function VolunteerRegister() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [registeredVolunteer, setRegisteredVolunteer] = useState<Volunteer | null>(null);
  const [matchResults, setMatchResults] = useState<AssignResult[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const { registerVolunteer, matchVolunteerToStation, venues } = useAppStore();
  const { showToast } = useToast();

  const defaultValues: FormValues = {
    name: '',
    gender: 'male',
    birthDate: '',
    email: '',
    phone: '',
    idCard: '',
    skills: [],
    availableDates: [],
    availableTimeSlots: [],
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedSkills = watch('skills');
  const watchedDates = watch('availableDates');
  const watchedTimeSlots = watch('availableTimeSlots');
  const watchedGender = watch('gender');

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const handleSkillToggle = (skill: string) => {
    const currentSkills = watch('skills');
    if (currentSkills.includes(skill)) {
      setValue('skills', currentSkills.filter((s) => s !== skill), { shouldValidate: true });
    } else {
      setValue('skills', [...currentSkills, skill], { shouldValidate: true });
    }
  };

  const handleDateToggle = (date: string) => {
    const currentDates = watch('availableDates');
    if (currentDates.includes(date)) {
      setValue('availableDates', currentDates.filter((d) => d !== date), { shouldValidate: true });
    } else {
      setValue('availableDates', [...currentDates, date], { shouldValidate: true });
    }
  };

  const handleTimeSlotToggle = (slot: string) => {
    const currentSlots = watch('availableTimeSlots');
    if (currentSlots.includes(slot)) {
      setValue('availableTimeSlots', currentSlots.filter((s) => s !== slot), { shouldValidate: true });
    } else {
      setValue('availableTimeSlots', [...currentSlots, slot], { shouldValidate: true });
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['name', 'gender', 'birthDate', 'email', 'phone', 'idCard'];
        break;
      case 2:
        fieldsToValidate = ['skills'];
        break;
      case 3:
        fieldsToValidate = ['availableDates', 'availableTimeSlots'];
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      showToast('error', '请完善当前步骤的必填信息');
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const performMatching = (data: FormValues): AssignResult[] => {
    const tempVolunteer: Volunteer = {
      id: 'temp',
      username: 'temp',
      role: 'volunteer',
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: new Date().toISOString(),
      status: 'pending',
      skills: data.skills,
      availableSlots: data.availableDates.flatMap((date) =>
        data.availableTimeSlots.map((timeSlot) => {
          const timeMap: Record<string, { start: string; end: string }> = {
            morning: { start: '08:00', end: '12:00' },
            afternoon: { start: '12:00', end: '18:00' },
            evening: { start: '18:00', end: '22:00' },
          };
          return {
            date,
            startTime: timeMap[timeSlot].start,
            endTime: timeMap[timeSlot].end,
          } as TimeSlot;
        })
      ),
      checkIns: [],
      totalServiceHours: 0,
    };

    const results: AssignResult[] = [];
    for (const station of stations) {
      const matchedSkills = data.skills.filter((s) => station.requiredSkills.includes(s));
      const skillScore = station.requiredSkills.length > 0
        ? (matchedSkills.length / station.requiredSkills.length) * 70
        : 30;
      const availabilityScore = data.availableDates.length > 0 ? 30 : 10;
      const totalScore = Math.round(skillScore + availabilityScore);

      if (totalScore >= 40) {
        results.push({
          volunteerId: 'temp',
          stationId: station.id,
          matchScore: totalScore,
          reason: `匹配技能：${matchedSkills.length > 0 ? matchedSkills.map((s) => skillOptions.find((opt) => opt.value === s)?.label || s).join('、') : '通用能力'}`,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  };

  const onSubmit = (data: FormValues) => {
    const matches = performMatching(data);
    setMatchResults(matches);
    if (matches.length > 0) {
      setSelectedStation(matches[0].stationId);
    }
    setShowMatchResult(true);
  };

  const handleConfirmRegistration = (data: FormValues) => {
    const availableSlots: TimeSlot[] = data.availableDates.flatMap((date) =>
      data.availableTimeSlots.map((timeSlot) => {
        const timeMap: Record<string, { start: string; end: string }> = {
          morning: { start: '08:00', end: '12:00' },
          afternoon: { start: '12:00', end: '18:00' },
          evening: { start: '18:00', end: '22:00' },
        };
        return {
          date,
          startTime: timeMap[timeSlot].start,
          endTime: timeMap[timeSlot].end,
        };
      })
    );

    const newVolunteer = registerVolunteer({
      username: data.phone,
      role: 'volunteer',
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatar: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20friendly%20volunteer%20portrait&image_size=square`,
      status: 'pending',
      skills: data.skills,
      availableSlots,
      assignedStation: selectedStation || undefined,
      checkIns: [],
      totalServiceHours: 0,
    });

    setRegisteredVolunteer(newVolunteer);
    setShowMatchResult(false);
    setShowSuccess(true);
    showToast('success', '注册申请已提交，请等待审核');
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    return 'text-amber-600 bg-amber-100';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-white transition-colors',
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                  )}
                  placeholder="请输入姓名"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  性别 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {['male', 'female'].map((g) => (
                    <label
                      key={g}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
                        watchedGender === g
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        value={g}
                        {...register('gender')}
                        className="sr-only"
                      />
                      {g === 'male' ? (
                        <LucideIcons.Mars className="w-5 h-5" />
                      ) : (
                        <LucideIcons.Venus className="w-5 h-5" />
                      )}
                      <span className="font-medium">{g === 'male' ? '男' : '女'}</span>
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出生日期 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('birthDate')}
                    max={formatDate(new Date(), 'yyyy-MM-dd')}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-white transition-colors',
                      errors.birthDate
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                  />
                  <LucideIcons.Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.birthDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  身份证号 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('idCard')}
                    maxLength={18}
                    placeholder="请输入18位身份证号"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-white transition-colors',
                      errors.idCard
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                  />
                  <LucideIcons.CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {errors.idCard && (
                  <p className="mt-1 text-sm text-red-500">{errors.idCard.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LucideIcons.Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    {...register('email')}
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-white transition-colors',
                      errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                    placeholder="example@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  电话 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LucideIcons.Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    {...register('phone')}
                    maxLength={11}
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-white transition-colors',
                      errors.phone
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                    placeholder="请输入11位手机号码"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">选择技能特长</h3>
              <p className="text-sm text-gray-500 mb-4">
                请选择您擅长的技能，可多选。已选择 <span className="font-bold text-primary-600">{watchedSkills.length}</span> 项
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {skillOptions.map((skill) => {
                  const isSelected = watchedSkills.includes(skill.value);
                  const SkillIcon = LucideIcons[skill.icon as keyof typeof LucideIcons] as typeof LucideIcons.User;

                  return (
                    <motion.div
                      key={skill.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSkillToggle(skill.value)}
                      className={cn(
                        'relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          skill.color
                        )}>
                          <SkillIcon className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-gray-900">{skill.label}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center">
                          <LucideIcons.Check className="w-3 h-3" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {errors.skills && (
                <p className="mt-3 text-sm text-red-500">{errors.skills.message}</p>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">选择可用时段</h3>
              <p className="text-sm text-gray-500 mb-4">
                请选择您可以提供服务的日期和时间段
              </p>

              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <LucideIcons.CalendarDays className="w-5 h-5 text-primary-500" />
                  服务日期（已选 {watchedDates.length} 天）
                </h4>
                <div className="grid grid-cols-7 gap-2">
                  {availableDates.map((date) => {
                    const isSelected = watchedDates.includes(date);
                    const dateObj = new Date(date);
                    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
                    const dayNum = dateObj.getDate();

                    return (
                      <motion.button
                        key={date}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDateToggle(date)}
                        className={cn(
                          'p-2 rounded-lg border-2 text-center transition-all',
                          isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-primary-300'
                        )}
                      >
                        <div className="text-xs text-gray-500 mb-1">周{dayOfWeek}</div>
                        <div className="text-lg font-bold">{dayNum}</div>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.availableDates && (
                  <p className="mt-2 text-sm text-red-500">{errors.availableDates.message}</p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <LucideIcons.Clock className="w-5 h-5 text-primary-500" />
                  服务时段（已选 {watchedTimeSlots.length} 个时段）
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {timeSlots.map((slot) => {
                    const isSelected = watchedTimeSlots.includes(slot.value);

                    return (
                      <motion.div
                        key={slot.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTimeSlotToggle(slot.value)}
                        className={cn(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                          )}>
                            {slot.value === 'morning' && <LucideIcons.Sunrise className="w-5 h-5" />}
                            {slot.value === 'afternoon' && <LucideIcons.Sun className="w-5 h-5" />}
                            {slot.value === 'evening' && <LucideIcons.Moon className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{slot.label.split(' ')[0]}</p>
                            <p className="text-sm text-gray-500">{slot.label.split(' ')[1]}</p>
                          </div>
                          {isSelected && (
                            <LucideIcons.CheckCircle className="w-5 h-5 text-primary-500 ml-auto" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {errors.availableTimeSlots && (
                  <p className="mt-2 text-sm text-red-500">{errors.availableTimeSlots.message}</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const formData = watch();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="志愿者注册"
        description="填写个人信息，完成志愿者注册流程"
        icon={LucideIcons.HeartHandshake}
        showBackButton
      />

      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {steps.map((step, index) => {
                  const StepIcon = LucideIcons[step.icon as keyof typeof LucideIcons] as typeof LucideIcons.User;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                          isActive
                            ? 'bg-primary-100 text-primary-700'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            isActive
                              ? 'bg-primary-500 text-white'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {isCompleted ? (
                            <LucideIcons.Check className="w-4 h-4" />
                          ) : (
                            <StepIcon className="w-4 h-4" />
                          )}
                        </div>
                        <span className="hidden sm:inline font-medium text-sm">
                          {step.name}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            'w-8 sm:w-16 h-1 mx-1 rounded-full transition-colors',
                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-gray-500">
                步骤 <span className="font-bold text-primary-600">{currentStep}</span> / 3
              </div>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                  currentStep === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                )}
              >
                <LucideIcons.ChevronLeft className="w-4 h-4" />
                上一步
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  下一步
                  <LucideIcons.ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/30"
                >
                  <LucideIcons.Sparkles className="w-4 h-4" />
                  智能匹配并提交
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showMatchResult}
        onClose={() => setShowMatchResult(false)}
        className="max-w-lg"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LucideIcons.Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">智能匹配结果</h3>
            <p className="text-gray-500 mt-1">根据您的技能和可用时段，为您推荐以下岗位</p>
          </div>

          {matchResults.length > 0 ? (
            <div className="space-y-3 mb-6">
              {matchResults.map((match, index) => {
                const station = stations.find((s) => s.id === match.stationId);
                const isSelected = selectedStation === match.stationId;

                return (
                  <motion.div
                    key={match.stationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedStation(match.stationId)}
                    className={cn(
                      'p-4 rounded-xl border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                              最佳匹配
                            </span>
                          )}
                          <h4 className="font-semibold text-gray-900">{station?.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{match.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">所需技能：</span>
                          {station?.requiredSkills.map((s) => {
                            const skill = skillOptions.find((opt) => opt.value === s);
                            return (
                              <span
                                key={s}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {skill?.label || s}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className={cn(
                        'px-3 py-1.5 rounded-full font-bold text-sm',
                        getMatchColor(match.matchScore)
                      )}>
                        {match.matchScore}%
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl mb-6">
              <LucideIcons.AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无匹配的岗位，我们将在有合适岗位时通知您</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowMatchResult(false)}
              className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              返回修改
            </button>
            <button
              onClick={() => handleConfirmRegistration(formData)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-700 transition-all"
            >
              <LucideIcons.CheckCircle className="w-4 h-4" />
              确认注册
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        className="max-w-md"
      >
        <div className="text-center py-6 px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <LucideIcons.CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">注册成功！</h3>
          <p className="text-gray-500 mb-6">
            您的注册申请已提交，请等待管理员审核
          </p>

          {registeredVolunteer && (
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={registeredVolunteer.avatar}
                  alt={registeredVolunteer.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    {registeredVolunteer.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {registeredVolunteer.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">技能</p>
                  <div className="flex flex-wrap gap-1">
                    {registeredVolunteer.skills.slice(0, 3).map((s) => {
                      const skill = skillOptions.find((opt) => opt.value === s);
                      return (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {skill?.label || s}
                        </span>
                      );
                    })}
                    {registeredVolunteer.skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{registeredVolunteer.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">可服务天数</p>
                  <p className="font-bold text-primary-600">
                    {registeredVolunteer.availableSlots.length} 天
                  </p>
                </div>
              </div>

              {registeredVolunteer.assignedStation && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <LucideIcons.MapPin className="w-4 h-4" />
                    <span className="font-medium">
                      已匹配岗位：{stations.find((s) => s.id === registeredVolunteer.assignedStation)?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSuccess(false)}
            className="w-full px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            完成
          </button>
        </div>
      </Modal>
    </div>
  );
}
