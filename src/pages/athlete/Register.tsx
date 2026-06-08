import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { calculateAge, generateAthleteId, formatDate } from '@/utils';
import { cn } from '@/lib/utils';
import type { Athlete, Event, HistoricalRecord, Conflict } from '@/types';

const historicalRecordSchema = z.object({
  id: z.string().optional(),
  eventName: z.string().min(1, '请输入项目名称'),
  result: z.string().min(1, '请输入成绩'),
  date: z.string().min(1, '请选择日期'),
  competition: z.string().min(1, '请输入赛事名称'),
  isRecord: z.boolean().default(false),
});

const formSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  gender: z.enum(['male', 'female'], { required_error: '请选择性别' }),
  birthDate: z.string().min(1, '请选择出生日期'),
  country: z.string().min(1, '请输入国籍'),
  countryCode: z.string().min(2, '请输入国家代码').max(3, '国家代码最多3位'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().min(1, '请输入电话号码'),
  historicalRecords: z.array(historicalRecordSchema).default([]),
  events: z.array(z.string()).min(1, '请至少选择一个参赛项目'),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: '基本信息', icon: 'User' },
  { id: 2, name: '历史成绩', icon: 'Trophy' },
  { id: 3, name: '参赛项目', icon: 'Target' },
  { id: 4, name: '确认提交', icon: 'CheckCircle' },
];

const countryOptions = [
  { code: 'CHN', name: '中国' },
  { code: 'USA', name: '美国' },
  { code: 'JPN', name: '日本' },
  { code: 'GER', name: '德国' },
  { code: 'AUS', name: '澳大利亚' },
  { code: 'FRA', name: '法国' },
  { code: 'GBR', name: '英国' },
  { code: 'KOR', name: '韩国' },
  { code: 'ITA', name: '意大利' },
  { code: 'CAN', name: '加拿大' },
];

export default function AthleteRegister() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredAthlete, setRegisteredAthlete] = useState<Athlete | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);

  const { events, registerAthlete, checkAgeAndEventConflict, athletes } = useAppStore();
  const { showToast } = useToast();

  const defaultValues: FormValues = {
    name: '',
    gender: 'male',
    birthDate: '',
    country: '',
    countryCode: '',
    email: '',
    phone: '',
    historicalRecords: [],
    events: [],
  };

  const {
    register,
    control,
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'historicalRecords',
  });

  const watchedBirthDate = watch('birthDate');
  const watchedGender = watch('gender');
  const watchedCountry = watch('country');
  const watchedCountryCode = watch('countryCode');
  const watchedEvents = watch('events');

  const age = useMemo(() => {
    if (!watchedBirthDate) return 0;
    return calculateAge(watchedBirthDate);
  }, [watchedBirthDate]);

  const athleteId = useMemo(() => {
    if (!watchedCountryCode) return '';
    return generateAthleteId(watchedCountryCode);
  }, [watchedCountryCode]);

  useEffect(() => {
    if (watchedCountry) {
      const country = countryOptions.find((c) => c.name === watchedCountry);
      if (country) {
        setValue('countryCode', country.code, { shouldValidate: true });
      }
    }
  }, [watchedCountry, setValue]);

  useEffect(() => {
    const allConflicts: Conflict[] = [];
    const tempAthleteId = 'temp-check-id';

    watchedEvents.forEach((eventId) => {
      const eventConflicts = checkAgeAndEventConflict(tempAthleteId, eventId);
      eventConflicts.forEach((conflict) => {
        const event = events.find((e) => e.id === eventId);
        if (conflict.type === 'age' && age > 0) {
          allConflicts.push({
            ...conflict,
            description: `项目"${event?.name}"年龄要求${event?.ageMin}-${event?.ageMax}岁，当前年龄${age}岁`,
          });
        } else if (conflict.type === 'athlete' && watchedGender) {
          allConflicts.push({
            ...conflict,
            description: `项目"${event?.name}"仅限${event?.gender === 'male' ? '男性' : event?.gender === 'female' ? '女性' : '混合'}参加`,
          });
        } else if (conflict.type === 'time') {
          allConflicts.push(conflict);
        }
      });
    });

    setConflicts(allConflicts);

    const filteredEvents = events.filter((event) => {
      if (event.gender !== 'mixed' && event.gender !== watchedGender) return false;
      if (age > 0 && (age < event.ageMin || age > event.ageMax)) return false;
      if (watchedEvents.includes(event.id)) return false;
      return true;
    });

    setRecommendedEvents(filteredEvents.slice(0, 5));
  }, [watchedEvents, watchedGender, age, events, checkAgeAndEventConflict]);

  const handleCountryChange = (countryName: string) => {
    setValue('country', countryName, { shouldValidate: true });
  };

  const handleAddRecord = () => {
    append({
      eventName: '',
      result: '',
      date: '',
      competition: '',
      isRecord: false,
    });
  };

  const handleEventToggle = (eventId: string) => {
    const currentEvents = watch('events');
    if (currentEvents.includes(eventId)) {
      setValue(
        'events',
        currentEvents.filter((id) => id !== eventId),
        { shouldValidate: true }
      );
    } else {
      setValue('events', [...currentEvents, eventId], { shouldValidate: true });
    }
  };

  const handleReplaceEvent = (oldEventId: string, newEventId: string) => {
    const currentEvents = watch('events');
    setValue(
      'events',
      currentEvents.map((id) => (id === oldEventId ? newEventId : id)),
      { shouldValidate: true }
    );
    showToast('success', '已替换为推荐项目');
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['name', 'gender', 'birthDate', 'country', 'countryCode', 'email', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['historicalRecords'];
        break;
      case 3:
        fieldsToValidate = ['events'];
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      showToast('error', '请完善当前步骤的必填信息');
      return;
    }

    if (currentStep === 3 && conflicts.length > 0) {
      const hasErrors = conflicts.some((c) => c.severity === 'error');
      if (hasErrors) {
        showToast('error', '存在冲突问题，请解决后再继续');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    const historicalRecords: HistoricalRecord[] = data.historicalRecords.map((record) => ({
      id: record.id || Math.random().toString(36).substr(2, 9),
      eventId: Math.random().toString(36).substr(2, 9),
      eventName: record.eventName,
      result: record.result,
      date: record.date,
      competition: record.competition,
      isRecord: record.isRecord,
    }));

    const newAthlete = registerAthlete({
      athleteId,
      username: athleteId,
      role: 'athlete',
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatar: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20athlete%20portrait&image_size=square`,
      birthDate: data.birthDate,
      age,
      gender: data.gender,
      country: data.country,
      countryCode: data.countryCode,
      events: data.events,
      historicalRecords,
      status: 'pending',
    });

    setRegisteredAthlete(newAthlete);
    setShowSuccess(true);
    showToast('success', '注册申请已提交，请等待审核');
  };

  const handleDownloadCertificate = () => {
    showToast('info', '参赛凭证下载功能开发中');
  };

  const getConflictIcon = (type: string) => {
    const iconMap: Record<string, typeof LucideIcons.AlertTriangle> = {
      age: LucideIcons.CalendarX,
      athlete: LucideIcons.UserX,
      time: LucideIcons.Clock,
      venue: LucideIcons.MapPin,
    };
    return iconMap[type] || LucideIcons.AlertTriangle;
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
                    'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors',
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
                      'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors',
                      errors.birthDate
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                  />
                  {age > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      <LucideIcons.Cake className="w-4 h-4" />
                      {age}岁
                    </div>
                  )}
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.birthDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  国籍 <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('country')}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors',
                    errors.country
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                  )}
                >
                  <option value="">请选择国籍</option>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  国家代码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('countryCode')}
                  placeholder="如 CHN、USA"
                  maxLength={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors uppercase',
                    errors.countryCode
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                  )}
                />
                {errors.countryCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.countryCode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  运动员ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={athleteId}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                    placeholder="自动生成"
                  />
                  <LucideIcons.Copy className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500">系统自动生成，格式：国家代码-年份-序号</p>
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
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors',
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
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-900 transition-colors',
                      errors.phone
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                    )}
                    placeholder="请输入电话号码"
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">历史比赛成绩</h3>
                <p className="text-sm text-gray-500 mt-1">请填写您的重要比赛成绩（选填）</p>
              </div>
              <button
                type="button"
                onClick={handleAddRecord}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
              >
                <LucideIcons.Plus className="w-4 h-4" />
                添加成绩
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <LucideIcons.Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无历史成绩</p>
                <p className="text-sm text-gray-400 mt-1">点击上方按钮添加您的比赛成绩</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gray-50 rounded-2xl border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        成绩记录
                      </h4>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LucideIcons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          项目名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(`historicalRecords.${index}.eventName` as const)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200"
                          placeholder="如：男子100米自由泳"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          成绩 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(`historicalRecords.${index}.result` as const)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200"
                          placeholder="如：47.58"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          比赛日期 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...register(`historicalRecords.${index}.date` as const)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          赛事名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register(`historicalRecords.${index}.competition` as const)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-primary-200"
                          placeholder="如：世界游泳锦标赛"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register(`historicalRecords.${index}.isRecord` as const)}
                          className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          <LucideIcons.Award className="w-4 h-4 text-amber-500" />
                          该成绩是否破纪录
                        </span>
                      </label>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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
            {conflicts.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                <h4 className="font-medium text-red-800 flex items-center gap-2 mb-3">
                  <LucideIcons.AlertCircle className="w-5 h-5" />
                  检测到 {conflicts.length} 个冲突问题
                </h4>
                <div className="space-y-2">
                  {conflicts.map((conflict, idx) => {
                    const ConflictIcon = getConflictIcon(conflict.type);
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-red-100"
                      >
                        <ConflictIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-700 font-medium">{conflict.description}</p>
                          {recommendedEvents.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1.5">推荐替换项目：</p>
                              <div className="flex flex-wrap gap-2">
                                {recommendedEvents.map((event) => (
                                  <button
                                    key={event.id}
                                    onClick={() =>
                                      handleReplaceEvent(conflict.affectedEntities[1], event.id)
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                                  >
                                    <LucideIcons.RefreshCw className="w-3 h-3" />
                                    {event.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">选择参赛项目</h3>
              <p className="text-sm text-gray-500 mb-4">
                已选择 <span className="font-bold text-primary-600">{watchedEvents.length}</span> 个项目
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {events.map((event) => {
                  const isSelected = watchedEvents.includes(event.id);
                  const hasConflict = conflicts.some(
                    (c) => c.affectedEntities.includes(event.id) && c.severity === 'error'
                  );
                  const isAgeValid = age === 0 || (age >= event.ageMin && age <= event.ageMax);
                  const isGenderValid = event.gender === 'mixed' || event.gender === watchedGender;
                  const isDisabled = !isAgeValid || !isGenderValid;

                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                      onClick={() => !isDisabled && handleEventToggle(event.id)}
                      className={cn(
                        'relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                        isSelected && !hasConflict
                          ? 'border-primary-500 bg-primary-50'
                          : hasConflict
                          ? 'border-red-300 bg-red-50'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{event.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.category} ·{' '}
                            {event.gender === 'male'
                              ? '男子'
                              : event.gender === 'female'
                              ? '女子'
                              : '混合'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              年龄: {event.ageMin}-{event.ageMax}岁
                            </span>
                            {!isAgeValid && age > 0 && (
                              <span className="text-xs text-red-500">年龄不符</span>
                            )}
                            {!isGenderValid && (
                              <span className="text-xs text-red-500">性别不符</span>
                            )}
                          </div>
                        </div>
                        {isSelected && !hasConflict && (
                          <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center">
                            <LucideIcons.Check className="w-4 h-4" />
                          </div>
                        )}
                        {hasConflict && (
                          <LucideIcons.AlertTriangle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {errors.events && (
                <p className="mt-2 text-sm text-red-500">{errors.events.message}</p>
              )}
            </div>

            {recommendedEvents.length > 0 && watchedEvents.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                <h4 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                  <LucideIcons.Sparkles className="w-5 h-5" />
                  为您推荐以下项目
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendedEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventToggle(event.id)}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                    >
                      <LucideIcons.Plus className="w-4 h-4" />
                      {event.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );

      case 4:
        const formData = watch();
        const selectedEvents = events.filter((e) => formData.events.includes(e.id));
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LucideIcons.FileCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">确认注册信息</h3>
              <p className="text-gray-500 mt-1">请仔细核对以下信息，确认无误后提交</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-5">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <LucideIcons.User className="w-5 h-5 text-primary-500" />
                  基本信息
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">运动员ID</p>
                    <p className="font-medium text-gray-900">{athleteId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">姓名</p>
                    <p className="font-medium text-gray-900">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">性别</p>
                    <p className="font-medium text-gray-900">
                      {formData.gender === 'male' ? '男' : '女'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">出生日期</p>
                    <p className="font-medium text-gray-900">{formData.birthDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">年龄</p>
                    <p className="font-medium text-gray-900">{age}岁</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">国籍</p>
                    <p className="font-medium text-gray-900">{formData.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">邮箱</p>
                    <p className="font-medium text-gray-900">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">电话</p>
                    <p className="font-medium text-gray-900">{formData.phone}</p>
                  </div>
                </div>
              </div>

              {formData.historicalRecords.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <LucideIcons.Trophy className="w-5 h-5 text-amber-500" />
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
                        {formData.historicalRecords.map((record, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-3 px-3">{record.eventName}</td>
                            <td className="py-3 px-3 font-mono">{record.result}</td>
                            <td className="py-3 px-3">{record.date}</td>
                            <td className="py-3 px-3">{record.competition}</td>
                            <td className="py-3 px-3 text-center">
                              {record.isRecord ? (
                                <LucideIcons.CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <LucideIcons.XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-5">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <LucideIcons.Target className="w-5 h-5 text-blue-500" />
                  参赛项目 ({selectedEvents.length}项)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvents.map((event) => (
                    <span
                      key={event.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {event.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="运动员注册"
        description="填写运动员信息，完成注册流程"
        icon={LucideIcons.UserPlus}
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
                步骤 <span className="font-bold text-primary-600">{currentStep}</span> / 4
              </div>
            </div>
          </div>

          <div className="p-6">{renderStepContent()}</div>

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

              {currentStep < 4 ? (
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
                  <LucideIcons.Send className="w-4 h-4" />
                  提交注册
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        className="max-w-md"
      >
        <div className="text-center py-6">
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

          {registeredAthlete && (
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={registeredAthlete.avatar}
                  alt={registeredAthlete.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    {registeredAthlete.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {registeredAthlete.country} · {registeredAthlete.gender === 'male' ? '男' : '女'} · {registeredAthlete.age}岁
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">参赛ID</p>
                  <p className="font-mono font-bold text-primary-600">
                    {registeredAthlete.athleteId}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">参赛项目</p>
                  <p className="font-bold text-gray-900">
                    {registeredAthlete.events.length}项
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowSuccess(false)}
              className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleDownloadCertificate}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <LucideIcons.Download className="w-4 h-4" />
              下载凭证
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
