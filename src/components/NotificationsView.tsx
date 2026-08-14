/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NotificationLog, Student, ApplicationStatus } from '../types';
import CalendarSyncModal from './CalendarSyncModal';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Clock,
  User,
  MapPin,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Printer,
  Globe,
  Smartphone
} from 'lucide-react';

interface NotificationsViewProps {
  notifications: NotificationLog[];
  students: Student[];
  selectedStudentId?: string;
  onSelectStudent?: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onSendCustomNotification: (studentId: string, message: string, type: 'danger' | 'warning' | 'info' | 'success') => void;
  onToggleTodoAll: (studentId: string, todoId: string) => void;
  onUpdateMaterialAll: (studentId: string, appId: string, materialId: string, status: '未开始' | '准备中' | '待修改' | '已完成' | '已提交') => void;
  onUpdateApplicationStatusAll: (studentId: string, appId: string, status: ApplicationStatus) => void;
  onRescheduleEvent?: (
    studentId: string,
    type: 'todo' | 'feedback' | 'deadline',
    newDate: string,
    options?: {
      todoId?: string;
      appId?: string;
      materialId?: string;
      deadlineRoundId?: string;
    }
  ) => void;
  onDeleteEvent?: (
    studentId: string,
    type: 'todo' | 'feedback' | 'deadline',
    options?: {
      todoId?: string;
      appId?: string;
      materialId?: string;
      deadlineRoundId?: string;
    }
  ) => void;
}

interface CalendarEvent {
  id: string;
  type: 'deadline' | 'feedback' | 'todo';
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  studentName: string;
  studentId: string;
  isCompleted: boolean;
  appId?: string; // for deadlines & materials
  materialId?: string; // for materials
  todoId?: string; // for todos
  deadlineRoundId?: string; // for round deadlines
  schoolName?: string;
  program?: string;
}

export default function NotificationsView({
  notifications,
  students,
  selectedStudentId: propSelectedStudentId,
  onSelectStudent,
  onMarkAsRead,
  onMarkAllRead,
  onClearNotifications,
  onSendCustomNotification,
  onToggleTodoAll,
  onUpdateMaterialAll,
  onUpdateApplicationStatusAll,
  onRescheduleEvent,
  onDeleteEvent
}: NotificationsViewProps) {
  // Tab control: 'calendar' for interactive calendar scheduler (default), 'timeline' for notifications alerts list
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'calendar'>('calendar');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Notification center states
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'danger_warning'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState(propSelectedStudentId || students[0]?.id || '');

  React.useEffect(() => {
    if (propSelectedStudentId) {
      setSelectedStudentId(propSelectedStudentId);
    }
  }, [propSelectedStudentId]);
  const [customMessage, setCustomMessage] = useState('');
  const [notifType, setNotifType] = useState<'danger' | 'warning' | 'info' | 'success'>('warning');

  // Real-time live system clock date
  const liveNow = new Date();
  const liveTodayStr = `${liveNow.getFullYear()}-${String(liveNow.getMonth() + 1).padStart(2, '0')}-${String(liveNow.getDate()).padStart(2, '0')}`;

  // Calendar scheduler states
  const [currentYear, setCurrentYear] = useState(liveNow.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(liveNow.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(liveTodayStr);

  // Drag and drop calendar rescheduling states
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      eventId: event.id,
      type: event.type,
      studentId: event.studentId,
      todoId: event.todoId,
      appId: event.appId,
      materialId: event.materialId,
      deadlineRoundId: event.deadlineRoundId,
      oldDate: event.date
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCell = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeaveCell = (e: React.DragEvent, dateStr: string) => {
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleDropCell = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setDraggedEvent(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data && data.studentId && data.type && onRescheduleEvent) {
        if (data.oldDate === targetDateStr) return;
        onRescheduleEvent(data.studentId, data.type, targetDateStr, {
          todoId: data.todoId,
          appId: data.appId,
          materialId: data.materialId,
          deadlineRoundId: data.deadlineRoundId
        });
        setSelectedDate(targetDateStr);
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  // Quick templates for notification dispatcher
  const templates = [
    {
      title: '📋 文书初稿反馈意见',
      text: '你的个人陈述 (PS) 已由导师评审。第一版结构需要优化，量化项目经历部分单薄，请根据网申督学系统中的批注，尽快修改并在 3 天内反馈第二稿。',
      type: 'warning' as const
    },
    {
      title: '✉️ 推荐信准备催缴',
      text: '目标院校截止日期正在逼近，你的推荐信 1 / 推荐信 2 仍处于未启动或草稿状态。请尽快确认推荐信提纲，并跟进推荐信教授签字进度。',
      type: 'danger' as const
    },
    {
      title: '🏫 成绩单盖章提醒',
      text: '请于本周内前往学校教务处或利用学信网开具中英文成绩单、在读证明及官方评分标准文件，并盖章扫描上传至系统。',
      type: 'info' as const
    },
    {
      title: '🎉 材料顺利完备祝贺',
      text: '恭喜！你申请的目标院校所有必填材料（包括PS、CV、推荐信及双证等）已经全部完成并成功提交，网申要件进度已达 100%。做得好！',
      type: 'success' as const
    }
  ];

  const handleGenerateSmartMessage = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    let index = 1;
    let listStr = '';

    // Gather pending universal materials
    (student.globalMaterials || []).forEach(m => {
      if (m.isRequired && m.status !== '已完成' && m.status !== '已提交') {
        listStr += `${index++}. 【通用材料】${m.name}：当前状态“${m.status}”${m.feedbackDueDate ? `，请于 ${m.feedbackDueDate} 前反馈` : ''}\n`;
      }
    });

    // Gather pending school-specific materials
    (student.applications || []).forEach(app => {
      (app.materials || []).forEach(m => {
        if (m.isRequired && m.status !== '已完成' && m.status !== '已提交') {
          listStr += `${index++}. 【${app.schoolName}专属】${m.name}：当前状态“${m.status}”${m.feedbackDueDate ? `，请于 ${m.feedbackDueDate} 前反馈` : ''}\n`;
        }
      });
    });

    // Gather uncompleted todos
    (student.todos || []).forEach(todo => {
      if (!todo.isCompleted) {
        listStr += `${index++}. 【督学待办】${todo.text}：截止日期 ${todo.dueDate}\n`;
      }
    });

    if (!listStr) {
      listStr = `恭喜！你的所有申请要件与关键待办均已 100% 全部完成！做得非常棒！继续保持！`;
    }

    const message = `Hi ${student.name}同学，我是你的网申规划导师。根据系统实时进度核对，你当前还有以下 ${index - 1} 项网申材料及督促任务处于未完备状态，请按要求抓紧准备并更新系统：\n\n${listStr}\n请合理规划时间。如有疑问或修改反馈，请及时在系统中更新进度或联系导师，加油！💪`;
    
    setCustomMessage(message);
    setNotifType(index > 3 ? 'danger' : 'warning');
  };

  useEffect(() => {
    if (selectedStudentId) {
      handleGenerateSmartMessage(selectedStudentId);
    }
  }, [selectedStudentId]);

  const handleApplyTemplate = (tpl: typeof templates[0]) => {
    setCustomMessage(tpl.text);
    setNotifType(tpl.type);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !customMessage.trim()) return;

    onSendCustomNotification(selectedStudentId, customMessage.trim(), notifType);
    setCustomMessage('');
    alert('已成功将进度通知派发至该学生的个人面板，并更新通知中心！');
  };

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'danger_warning') return n.type === 'danger' || n.type === 'warning';
    return true;
  });

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // ================= CALENDAR UTILITIES & CALCULATIONS =================

  // 1. Compile events across all students dynamically
  const calendarEvents: CalendarEvent[] = [];
  const seenKeys = new Set<string>();

  students.forEach((student) => {
    // Collect global material feedback due dates
    student.globalMaterials?.forEach((m) => {
      if (m.feedbackDueDate) {
        const cleanName = m.name
          .replace(/[\(\（].*?[\)\）]/g, '')
          .replace(/通用材料/g, '')
          .replace(/高校专属要件/g, '')
          .trim();
        const key = `${student.id}-${m.feedbackDueDate}-${cleanName.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          calendarEvents.push({
            id: `feedback-global-${student.id}-${m.id}`,
            type: 'feedback',
            date: m.feedbackDueDate,
            title: cleanName,
            description: `说明: ${m.notes || '暂无说明'} (状态: ${m.status})`,
            studentName: student.name,
            studentId: student.id,
            isCompleted: m.status === '已完成' || m.status === '已提交',
            materialId: m.id,
            appId: 'global',
          });
        }
      }
    });

    // Collect school application specific material feedback due dates
    student.applications?.forEach((app) => {
      app.materials?.forEach((m) => {
        if (m.feedbackDueDate) {
          const cleanName = m.name
            .replace(/[\(\（].*?[\)\）]/g, '')
            .replace(/通用材料/g, '')
            .replace(/高校专属要件/g, '')
            .trim();
          const key = `${student.id}-${m.feedbackDueDate}-${app.id}-${cleanName.toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            calendarEvents.push({
              id: `feedback-school-${student.id}-${app.id}-${m.id}`,
              type: 'feedback',
              date: m.feedbackDueDate,
              title: `${app.schoolName}: ${cleanName}`,
              description: `说明: ${m.notes || '暂无说明'} (状态: ${m.status})`,
              studentName: student.name,
              studentId: student.id,
              isCompleted: m.status === '已完成' || m.status === '已提交',
              materialId: m.id,
              appId: app.id,
              schoolName: app.schoolName,
              program: app.program,
            });
          }
        }
      });

      // Collect school application deadlines
      if (app.deadlines && app.deadlines.length > 0) {
        app.deadlines.forEach((round) => {
          if (round.date) {
            const key = `${student.id}-${round.date}-dl-${app.id}-${round.id}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              calendarEvents.push({
                id: `deadline-round-${student.id}-${app.id}-${round.id}`,
                type: 'deadline',
                date: round.date,
                title: `${app.schoolName}${round.roundName ? ' (' + round.roundName + ')' : ''} 截止`,
                description: `申请项目: ${app.program} • 国家地区: ${app.country} (当前状态: ${app.status})`,
                studentName: student.name,
                studentId: student.id,
                isCompleted: app.status === '已提交' || app.status === '已录取',
                appId: app.id,
                deadlineRoundId: round.id,
                schoolName: app.schoolName,
                program: app.program,
              });
            }
          }
        });
      } else if (app.deadline) {
        const key = `${student.id}-${app.deadline}-dl-${app.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          calendarEvents.push({
            id: `deadline-legacy-${student.id}-${app.id}`,
            type: 'deadline',
            date: app.deadline,
            title: `${app.schoolName} 截止日期`,
            description: `申请项目: ${app.program} • 国家地区: ${app.country} (当前状态: ${app.status})`,
            studentName: student.name,
            studentId: student.id,
            isCompleted: app.status === '已提交' || app.status === '已录取',
            appId: app.id,
            schoolName: app.schoolName,
            program: app.program,
          });
        }
      }
    });

    // Collect student todos (Skip auto-created material todos to prevent duplicate tasks)
    student.todos?.forEach((todo) => {
      if (todo.dueDate) {
        if (todo.id.startsWith('todo-mat-') || todo.text.startsWith('【要件督办】') || todo.text.includes('要件督办')) {
          return;
        }

        const cleanText = todo.text
          .replace(/【要件督办】/g, '')
          .replace(/【通用材料】/g, '')
          .replace(/【高校专属要件】/g, '')
          .replace(/通用材料/g, '')
          .replace(/高校专属要件/g, '')
          .replace(/[\(\（].*?[\)\）]/g, '')
          .trim();
        const key = `${student.id}-${todo.dueDate}-${cleanText.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          calendarEvents.push({
            id: `todo-${student.id}-${todo.id}`,
            type: 'todo',
            date: todo.dueDate,
            title: cleanText,
            description: todo.associatedSchool ? `关联高校: ${todo.associatedSchool}` : '通用待办事项',
            studentName: student.name,
            studentId: student.id,
            isCompleted: todo.isCompleted,
            todoId: todo.id,
          });
        }
      }
    });
  });

  // Handle checking/unchecking a calendar event
  const handleToggleEvent = (event: CalendarEvent) => {
    if (event.type === 'todo' && event.todoId) {
      onToggleTodoAll(event.studentId, event.todoId);
    } else if (event.type === 'feedback' && event.materialId && event.appId) {
      const nextStatus = event.isCompleted ? '准备中' : '已完成';
      onUpdateMaterialAll(event.studentId, event.appId, event.materialId, nextStatus);
    } else if (event.type === 'deadline' && event.appId) {
      const nextStatus = event.isCompleted ? '材料准备中' : '已提交';
      onUpdateApplicationStatusAll(event.studentId, event.appId, nextStatus);
    }
  };

  // Calendar month rendering helpers
  const monthNames = [
    '一月 (Jan)', '二月 (Feb)', '三月 (Mar)', '四月 (Apr)', '五月 (May)', '六月 (Jun)',
    '七月 (Jul)', '八月 (Aug)', '九月 (Sep)', '十月 (Oct)', '十一月 (Nov)', '十二月 (Dec)'
  ];

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  // Compute days in month grid
  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to Mon-Sun

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Padding days from previous month
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIndex);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      dateStr: `${prevMonthYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    cells.push({
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: true
    });
  }

  // Padding days from next month
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const remainingCells = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remainingCells; d++) {
    cells.push({
      dateStr: `${nextMonthYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false
    });
  }

  // Get events on a specific cell date
  const getEventsOnDate = (dateStr: string) => {
    return calendarEvents.filter(e => e.date === dateStr);
  };

  // Pre-defined quick jumps for testing different dates
  const quickJumps = [
    { label: `今天实时 (${liveTodayStr.slice(5)})`, date: liveTodayStr, year: liveNow.getFullYear(), month: liveNow.getMonth() },
    { label: '港大一期 (09-30)', date: '2026-09-30', year: 2026, month: 8 },
    { label: '皇艺第一轮 (10-15)', date: '2026-10-15', year: 2026, month: 9 },
    { label: '爱丁堡截止 (11-10)', date: '2026-11-10', year: 2026, month: 10 },
    { label: 'CMU常规批 (12-01)', date: '2026-12-01', year: 2026, month: 11 },
    { label: '耶鲁截止日 (12-15)', date: '2026-12-15', year: 2026, month: 11 },
  ];

  const handleQuickJump = (jump: typeof quickJumps[0]) => {
    setSelectedDate(jump.date);
    setCurrentYear(jump.year);
    setCurrentMonth(jump.month);
  };

  const selectedDateEvents = calendarEvents.filter(e => e.date === selectedDate);

  return (
    <div className="space-y-6 relative">
      {/* Print Only Header (Visible during Print-to-PDF export only) */}
      <div className="print-only-header hidden">
        <h1 className="text-2xl font-black text-slate-900">留学网申材料进度督导系统 - 督促通知与督导日程日历</h1>
        <p className="text-xs text-slate-500">出具日期：2026年7月21日 • 系统自动同步实时记录</p>
      </div>

      {/* Top Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-5.5 w-5.5 text-emerald-600 animate-pulse" />
            督办通知与督学中心
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            实时监控学生反馈与网申截止倒计时，支持日历排程待办、多轮截止日一键勾选督办
          </p>
        </div>

        {/* Global Export PDF, Sync & Print Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer"
            title="获取手机与 Google Calendar 自动同步订阅 URL"
          >
            <Globe className="h-4 w-4 text-emerald-200" />
            <span>手机 / Google 日历同步</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer"
            title="生成此板块的PDF报告供打印分享"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            导出本页 PDF
          </button>

          {activeSubTab === 'timeline' && (
            <>
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold tracking-wide cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                全部已读
              </button>
              <button
                onClick={onClearNotifications}
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg text-xs font-semibold tracking-wide cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                清空列表
              </button>
            </>
          )}
        </div>
      </div>

      {/* Switch Sub-Tabs: Interactive Scheduler Calendar (Default) vs Timeline list */}
      <div className="flex items-center border-b border-slate-200 pb-0.5 gap-2 no-print">
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`px-4 py-2 font-bold text-xs tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'calendar'
              ? 'border-emerald-600 text-slate-900 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="h-4 w-4 text-rose-500" />
          督导日程日历模块
          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded border border-emerald-200">
            默认主视图
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`px-4 py-2 font-bold text-xs tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'timeline'
              ? 'border-emerald-600 text-slate-900 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Bell className="h-4 w-4" />
          催缴通知时间线 ({notifications.length})
        </button>
      </div>

      {/* RENDER ACTIVE SUB-TAB CONTAINER */}
      <div>
        {/* ======================= TAB 1: NOTIFICATION TIMELINE ======================= */}
        {activeSubTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Notification Timeline/Logs */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
                  <Bell className="h-4.5 w-4.5 text-emerald-600" /> 通知事件时间轴
                </h3>

                {/* Filter buttons */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-bold bg-slate-50 no-print">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 cursor-pointer transition-colors ${
                      filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    全部 ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilterType('unread')}
                    className={`px-2.5 py-1 cursor-pointer border-l border-slate-200 transition-colors ${
                      filterType === 'unread' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    未读 ({notifications.filter(n => !n.isRead).length})
                  </button>
                  <button
                    onClick={() => setFilterType('danger_warning')}
                    className={`px-2.5 py-1 cursor-pointer border-l border-slate-200 transition-colors ${
                      filterType === 'danger_warning' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    预警 ⚠️
                  </button>
                </div>
              </div>

              {/* Timeline Feed */}
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {filteredNotifs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm font-medium">
                    暂无符合筛选条件的通知记录。
                  </div>
                ) : (
                  filteredNotifs.map((notif) => {
                    const isDanger = notif.type === 'danger';
                    const isWarning = notif.type === 'warning';
                    const isSuccess = notif.type === 'success';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => onMarkAsRead(notif.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          !notif.isRead 
                            ? 'bg-slate-50/70 border-emerald-500/20 shadow-xs ring-1 ring-emerald-500/5' 
                            : 'bg-white border-slate-100 hover:bg-slate-50/30'
                        }`}
                      >
                        {/* Unread Indicator Dot */}
                        {!notif.isRead && (
                          <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-600 animate-pulse no-print" />
                        )}

                        <div className="flex gap-3 items-start">
                          {/* Icon reflecting type */}
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isDanger 
                              ? 'bg-rose-50 text-rose-600' 
                              : isWarning 
                              ? 'bg-amber-50 text-amber-600' 
                              : isSuccess 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'bg-sky-50 text-sky-600'
                          }`}>
                            {isDanger && <AlertCircle className="h-4 w-4" />}
                            {isWarning && <AlertTriangle className="h-4 w-4" />}
                            {isSuccess && <CheckCircle2 className="h-4 w-4" />}
                            {notif.type === 'info' && <Info className="h-4 w-4" />}
                          </div>

                          <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                {notif.studentName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{notif.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side: Communications Dispatcher (Adviser actions) */}
            <div className="lg:col-span-5 space-y-6 no-print">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
                    <MessageSquare className="h-4.5 w-4.5 text-emerald-600" /> 学生督促提醒模拟器
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">在此直接给学生下发审核批注，模拟发送微信/微信公众号/邮件</p>
                </div>

                {/* Quick Templates Drawer */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. 推荐督学沟通模板:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <span>{tpl.title}</span>
                        <span className="text-[9px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          使用模板 &raquo;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form to submit Custom Alert */}
                <form onSubmit={handleSendSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. 编辑消息：</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">接收学生</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>选择学生</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.targetMajor})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">通知紧急程度</label>
                      <select
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="danger">红色预警 (Danger)</option>
                        <option value="warning">黄色警告 (Warning)</option>
                        <option value="info">一般提示 (Info)</option>
                        <option value="success">喜报/成功 (Success)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">消息内容 (支持自定义编辑)</label>
                      <button
                        type="button"
                        onClick={() => handleGenerateSmartMessage(selectedStudentId)}
                        disabled={!selectedStudentId}
                        className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-all"
                        title="基于当前学生尚未完成的通用/专属材料及待办，智能编写结构化的催缴短信"
                      >
                        <Sparkles className="h-2.5 w-2.5 text-indigo-600 animate-pulse" />
                        智能生成待办 (12345)
                      </button>
                    </div>
                    <textarea
                      required
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="在此输入需要发送给学生或推荐人教授的督办详情..."
                      rows={6}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:border-emerald-500 leading-relaxed font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    模拟发送进度微信/短信
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: INTERACTIVE CALENDAR SCHEDULER ======================= */}
        {activeSubTab === 'calendar' && (
          <div className="space-y-6">
            {/* Legend & Quick jump helper */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs print-card">
              {/* Event Type Legends */}
              <div className="md:col-span-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block w-full">事件类型图例:</span>
                <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> 高校申请截止
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> 文书材料反馈
                </span>
                <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> 学生督促待办
                </span>
              </div>

              {/* Quick Jump Dates Selection */}
              <div className="md:col-span-7 space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> 快速跳转定位模拟 (测试关键申请事件与截止日):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickJumps.map((jump, i) => {
                    const isCurrentSelectedMonth = currentYear === jump.year && currentMonth === jump.month;
                    const isSelected = selectedDate === jump.date;
                    return (
                      <button
                        key={i}
                        onClick={() => handleQuickJump(jump)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-black tracking-wide border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-950 text-white shadow-xs'
                            : isCurrentSelectedMonth
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {jump.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Calendar Core Grid and Selected Date Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Monthly Calendar (lg:col-span-8) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print-card">
                {/* Calendar Navigator */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        {currentYear}年 {monthNames[currentMonth]}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        APPLICATION TIMELINE SCHEDULE BOARD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 no-print">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="上个月"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        setCurrentYear(today.getFullYear());
                        setCurrentMonth(today.getMonth());
                        setSelectedDate(liveTodayStr);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black cursor-pointer transition-colors"
                      title="返回实时今天"
                    >
                      今天
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="下个月"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Week Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1.5 bg-slate-50/50 rounded-lg">
                  {weekDays.map((day, idx) => (
                    <div key={idx} className={idx >= 5 ? 'text-rose-400' : 'text-slate-500'}>
                      周{day}
                    </div>
                  ))}
                </div>

                {/* Drag and drop tip banner */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 px-3.5 text-[11px] text-emerald-950 font-bold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                    <span>💡 现已支持【拖拽排期】与【单元格任务明细】！在日历中按住具体任务卡片拖拽至任意日期，即可瞬间重排截止时间并全网同步。</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold shrink-0">
                    可拖拽重排
                  </span>
                </div>

                {/* Calendar Days Cells Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {cells.map((cell, idx) => {
                    const isSelected = cell.dateStr === selectedDate;
                    const cellEvents = getEventsOnDate(cell.dateStr);
                    const isToday = cell.dateStr === liveTodayStr;
                    const isDragTarget = dragOverDate === cell.dateStr;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(cell.dateStr)}
                        onDragOver={(e) => handleDragOverCell(e, cell.dateStr)}
                        onDragLeave={(e) => handleDragLeaveCell(e, cell.dateStr)}
                        onDrop={(e) => handleDropCell(e, cell.dateStr)}
                        className={`min-h-[160px] sm:min-h-[185px] p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                          cell.isCurrentMonth 
                            ? 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/20' 
                            : 'bg-slate-50/40 border-slate-100/80 text-slate-300'
                        } ${
                          isSelected 
                            ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50/20 shadow-md' 
                            : ''
                        } ${
                          isToday && !isSelected
                            ? 'border-emerald-500/60 bg-emerald-50/30 text-emerald-900'
                            : ''
                        } ${
                          isDragTarget
                            ? 'ring-2 ring-emerald-500 bg-emerald-100/60 border-emerald-500 scale-[1.01] shadow-lg z-10'
                            : ''
                        }`}
                      >
                        {/* Cell Header */}
                        <div className="flex justify-between items-center mb-1.5 shrink-0 border-b border-slate-100/60 pb-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                              isSelected 
                                ? 'bg-slate-900 text-white' 
                                : isToday 
                                ? 'bg-emerald-600 text-white' 
                                : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                            }`}>
                              {cell.dayNum}
                            </span>
                            {isToday && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-1 rounded">
                                今天
                              </span>
                            )}
                          </div>

                          {cellEvents.length > 0 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                              {cellEvents.length} 项
                            </span>
                          )}
                        </div>

                        {/* Task Cards Container inside Date Cell */}
                        <div className="space-y-1 mt-0.5 max-h-[135px] overflow-y-auto pr-0.5 custom-scrollbar flex-1">
                          {cellEvents.map((evt) => {
                            const isTodo = evt.type === 'todo';
                            const isFeedback = evt.type === 'feedback';
                            const isDeadline = evt.type === 'deadline';

                            return (
                              <div
                                key={evt.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, evt)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(cell.dateStr);
                                }}
                                className={`p-1.5 px-2 rounded-xl border text-[9.5px] leading-snug font-semibold cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all select-none flex flex-col gap-0.5 shadow-2xs group relative ${
                                  evt.isCompleted
                                    ? 'bg-slate-100/90 border-slate-200 text-slate-400 line-through opacity-70'
                                    : isDeadline
                                    ? 'bg-rose-50/90 border-rose-200/90 text-rose-950 hover:bg-rose-100/90 shadow-rose-100/50'
                                    : isFeedback
                                    ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950 hover:bg-emerald-100/90 shadow-emerald-100/50'
                                    : 'bg-indigo-50/90 border-indigo-200/90 text-indigo-950 hover:bg-indigo-100/90 shadow-indigo-100/50'
                                }`}
                                title={`[按住拖拽可重新排期] ${evt.studentName}: ${evt.title}\n释放至其他日期框即可自动变更截止时间！`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="font-extrabold px-1 rounded text-[8px] bg-white/90 shrink-0 border border-slate-200/60 text-slate-800 truncate max-w-[50px]">
                                      {evt.studentName}
                                    </span>
                                    <span className={`text-[8px] font-extrabold shrink-0 px-1 rounded ${
                                      isDeadline ? 'bg-rose-100 text-rose-800' : isFeedback ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {isDeadline ? '截止' : isFeedback ? '要件' : '待办'}
                                    </span>
                                  </div>

                                  {onDeleteEvent && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteEvent(evt.studentId, evt.type, {
                                          todoId: evt.todoId,
                                          appId: evt.appId,
                                          materialId: evt.materialId,
                                          deadlineRoundId: evt.deadlineRoundId
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-all shrink-0"
                                      title="删除此待办/清除限期"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-[9.5px] font-bold leading-tight break-words line-clamp-2">
                                  {evt.title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Date Checklist & Actions (lg:col-span-4) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print-card">
                  {/* Selected Date Header */}
                  <div className="border-b border-slate-100 pb-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SELECTED DATE PROGRESS TARGETS</div>
                    <h3 className="font-black text-slate-900 text-sm tracking-wide mt-0.5 flex items-center justify-between">
                      <span>📅 {selectedDate} 督学日程</span>
                      {selectedDate === liveTodayStr && (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          系统今日
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      点击复选框完成任务，拖拽或操作快捷键可快速重排/撤销任务。
                    </p>
                  </div>

                  {/* Checklist Elements */}
                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {selectedDateEvents.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-slate-200 mx-auto" />
                        <p className="text-slate-400 text-xs font-semibold">该日暂无任何催促或截止事件。</p>
                        <p className="text-[10px] text-slate-300">可以点击上方快速跳转或选择其他日期。</p>
                      </div>
                    ) : (
                      selectedDateEvents.map((event) => {
                        const isTodo = event.type === 'todo';
                        const isFeedback = event.type === 'feedback';
                        const isDeadline = event.type === 'deadline';

                        return (
                          <div
                            key={event.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              event.isCompleted
                                ? 'bg-slate-50/50 border-slate-100'
                                : isDeadline
                                ? 'bg-rose-50/30 border-rose-100/60 hover:bg-rose-50/50'
                                : isFeedback
                                ? 'bg-emerald-50/20 border-emerald-100/50 hover:bg-emerald-50/40'
                                : 'bg-indigo-50/20 border-indigo-100/50 hover:bg-indigo-50/40'
                            }`}
                          >
                            <div className="flex gap-2.5 items-start">
                              {/* Interactive Checkbox */}
                              <button
                                onClick={() => handleToggleEvent(event)}
                                className={`mt-0.5 shrink-0 transition-colors text-slate-400 hover:text-emerald-600 cursor-pointer no-print`}
                                title={event.isCompleted ? '标记为未完成' : '标记为已完成'}
                              >
                                {event.isCompleted ? (
                                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-slate-300" />
                                )}
                              </button>

                              {/* Print Only Static Checkbox Indicator */}
                              <div className="hidden print:block mt-0.5 shrink-0">
                                <span className="font-mono text-slate-800">
                                  {event.isCompleted ? '[已完成]' : '[未完成]'}
                                </span>
                              </div>

                              <div className="space-y-1.5 flex-1 min-w-0">
                                {/* Student pill + Event Type badge */}
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-md">
                                      {event.studentName}
                                    </span>

                                    {isDeadline && (
                                      <span className="text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                                        高校截止
                                      </span>
                                    )}
                                    {isFeedback && (
                                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                                        反馈到期
                                      </span>
                                    )}
                                    {isTodo && (
                                      <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.2 rounded">
                                        催缴待办
                                      </span>
                                    )}
                                  </div>

                                  {onDeleteEvent && (
                                    <button
                                      onClick={() => {
                                        onDeleteEvent(event.studentId, event.type, {
                                          todoId: event.todoId,
                                          appId: event.appId,
                                          materialId: event.materialId,
                                          deadlineRoundId: event.deadlineRoundId
                                        });
                                      }}
                                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                      title="删除/撤销此任务"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>删除任务</span>
                                    </button>
                                  )}
                                </div>

                                {/* Event Title */}
                                <h4 className={`text-xs font-black text-slate-800 leading-snug break-words ${
                                  event.isCompleted ? 'line-through text-slate-400 font-medium' : ''
                                }`}>
                                  {event.title}
                                </h4>

                                {/* Event Description details */}
                                <p className={`text-[11px] leading-relaxed break-words ${
                                  event.isCompleted ? 'text-slate-300' : 'text-slate-500 font-semibold'
                                }`}>
                                  {event.description}
                                </p>

                                {/* Quick Date Picker Rescheduler */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400 font-bold flex items-center gap-1">
                                    <span>当前排期:</span>
                                    <span className="text-slate-700 font-mono font-bold">{event.date}</span>
                                  </span>

                                  <div className="flex items-center gap-1.5 no-print">
                                    <span className="text-slate-500 font-semibold text-[10px]">改期至:</span>
                                    <input
                                      type="date"
                                      value={event.date}
                                      onChange={(e) => {
                                        if (e.target.value && onRescheduleEvent) {
                                          onRescheduleEvent(event.studentId, event.type, e.target.value, {
                                            todoId: event.todoId,
                                            appId: event.appId,
                                            materialId: event.materialId,
                                            deadlineRoundId: event.deadlineRoundId
                                          });
                                          setSelectedDate(e.target.value);
                                        }
                                      }}
                                      className="bg-white border border-slate-300 hover:border-emerald-500 rounded-lg px-2 py-0.5 text-[10px] font-mono text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Integration help tips */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1.5 no-print">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 mb-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      日历自动联动与手机同步:
                    </h4>
                    <button
                      onClick={() => setIsSyncModalOpen(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>获取 Google / 手机日历订阅链接</span>
                    </button>
                  </div>
                  <ul className="text-[10px] text-slate-500 font-semibold space-y-1 pl-4 list-disc">
                    <li>勾选【高校截止】：自动将该高校的申请状态标记为「已提交」或返回「材料准备中」；</li>
                    <li>勾选【反馈到期】：同步改变此文书材料(如PS、简历、视频)的最终状态为「已完成」；</li>
                    <li>勾选【催缴待办】：标记特定学生的待办任务为「已完成」状态，两端状态无缝同步；</li>
                    <li>【手机日历订阅】：通过订阅 URL 填入 Google 日历或 iPhone 日历，所有更新实时同步至手机系统响铃提醒！</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Sync & Subscription Modal */}
      <CalendarSyncModal
        students={students}
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </div>
  );
}
