/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, SchoolApplication, TodoItem, formatDeadlineDate } from '../types';
import { sortSchoolApplications } from '../utils/sorting';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  UserCheck, 
  Send,
  MessageSquareCode,
  X,
  Printer,
  Image as ImageIcon,
  Loader2,
  Users,
  GraduationCap,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Award,
  ChevronRight,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  LayoutDashboard,
  User,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { exportElementToJpg } from '../lib/exportUtils';

interface DashboardViewProps {
  student: Student;
  allStudents?: Student[];
  onSelectStudent?: (id: string) => void;
  onUpdateAdvisorNotes: (notes: string) => void;
  onUpdateIeltsScore: (score: string) => void;
  onAddTodo: (text: string, dueDate: string, associatedSchool?: string) => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onSendAlert: (message: string, type: 'danger' | 'warning' | 'info' | 'success') => void;
}

// Helper to compute overall student material stats
const getStudentMaterialStats = (s: Student) => {
  const globalReq = (s.globalMaterials || []).filter(m => m.isRequired);
  const globalDone = globalReq.filter(m => m.status === '已完成' || m.status === '已提交');

  let appReqCount = 0;
  let appDoneCount = 0;

  (s.applications || []).forEach(app => {
    const req = (app.materials || []).filter(m => m.isRequired);
    appReqCount += req.length;
    appDoneCount += req.filter(m => m.status === '已完成' || m.status === '已提交').length;
  });

  const totalRequired = globalReq.length + appReqCount;
  const totalCompleted = globalDone.length + appDoneCount;
  const percent = totalRequired === 0 ? 0 : Math.round((totalCompleted / totalRequired) * 100);

  return {
    totalRequired,
    totalCompleted,
    percent
  };
};

export default function DashboardView({
  student,
  allStudents = [],
  onSelectStudent,
  onUpdateAdvisorNotes,
  onUpdateIeltsScore,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onSendAlert,
}: DashboardViewProps) {
  // Navigation mode toggle: 'overview' (全员汇总) vs 'single' (单生专属)
  const [dashboardMode, setDashboardMode] = useState<'overview' | 'single'>('overview');

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(student.advisorNotes);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoSchool, setNewTodoSchool] = useState('通用');
  const [newTodoDate, setNewTodoDate] = useState('2026-07-25');
  const [isEditingIelts, setIsEditingIelts] = useState(false);
  const [editedIelts, setEditedIelts] = useState(student.ieltsScore || '');

  // Sync state if student changes
  React.useEffect(() => {
    setEditedNotes(student.advisorNotes);
    setIsEditingNotes(false);
    setEditedIelts(student.ieltsScore || '');
    setIsEditingIelts(false);
  }, [student]);

  // Real-time live system clock date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const today = new Date(year, now.getMonth(), now.getDate());

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      target = new Date(dateStr);
    }
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Ensure allStudents includes at least current student
  const studentsList = allStudents.length > 0 ? allStudents : [student];

  // ----------------------------------------------------
  // ALL STUDENTS OVERVIEW COMPUTATIONS & CHART DATA
  // ----------------------------------------------------
  const totalStudentsCount = studentsList.length;
  const totalApplicationsCount = studentsList.reduce((sum, s) => sum + (s.applications?.length || 0), 0);
  
  const allStudentStats = studentsList.map(s => {
    const mStats = getStudentMaterialStats(s);
    return {
      student: s,
      stats: mStats
    };
  });

  const avgOverallPercent = totalStudentsCount === 0 ? 0 : Math.round(
    allStudentStats.reduce((acc, curr) => acc + curr.stats.percent, 0) / totalStudentsCount
  );

  const totalOffersCount = studentsList.reduce((sum, s) => {
    return sum + (s.applications || []).filter(a => a.status === '已录取').length;
  }, 0);

  const totalSubmittedAppsCount = studentsList.reduce((sum, s) => {
    return sum + (s.applications || []).filter(a => a.status === '已提交').length;
  }, 0);

  // 1. Completion Tier Distribution Data for Bar Chart
  let tier030 = 0;
  let tier3060 = 0;
  let tier6090 = 0;
  let tier90100 = 0;

  allStudentStats.forEach(st => {
    const p = st.stats.percent;
    if (p < 30) tier030++;
    else if (p < 60) tier3060++;
    else if (p < 90) tier6090++;
    else tier90100++;
  });

  const completionTierData = [
    { range: '< 30% (严重落后)', count: tier030, fill: '#ef4444' },
    { range: '30%-60% (正常推进)', count: tier3060, fill: '#f59e0b' },
    { range: '60%-90% (良好备战)', count: tier6090, fill: '#0d9488' },
    { range: '90%-100% (具备递交条件)', count: tier90100, fill: '#10b981' }
  ];

  // 2. Country Distribution Data for Pie Chart
  const countryCounts: Record<string, number> = {};
  studentsList.forEach(s => {
    (s.applications || []).forEach(a => {
      const c = a.country || '其他';
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
  });

  const countryChartData = Object.entries(countryCounts).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];

  // 3. Application Status Distribution Data
  const statusCounts: Record<string, number> = {};
  studentsList.forEach(s => {
    (s.applications || []).forEach(a => {
      const st = a.status || '未分类';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });
  });

  const statusChartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

  // 4. IELTS Scores Distribution
  let ieltsNone = 0;
  let ieltsLow = 0; // < 6.5
  let ieltsMid = 0; // 6.5 - 7.0
  let ieltsHigh = 0; // 7.0+

  studentsList.forEach(s => {
    const sc = parseFloat(s.ieltsScore || '0');
    if (!s.ieltsScore || isNaN(sc) || sc === 0) ieltsNone++;
    else if (sc < 6.5) ieltsLow++;
    else if (sc < 7.5) ieltsMid++;
    else ieltsHigh++;
  });

  const ieltsChartData = [
    { band: '未考/待更新', count: ieltsNone, fill: '#94a3b8' },
    { band: '6.0分及以下', count: ieltsLow, fill: '#f43f5e' },
    { band: '6.5 - 7.0分', count: ieltsMid, fill: '#3b82f6' },
    { band: '7.5分及以上', count: ieltsHigh, fill: '#10b981' }
  ];

  // ----------------------------------------------------
  // SINGLE STUDENT COMPUTATIONS
  // ----------------------------------------------------
  const currentMaterialStats = getStudentMaterialStats(student);
  const overallPercent = currentMaterialStats.percent;
  const totalRequired = currentMaterialStats.totalRequired;
  const totalCompleted = currentMaterialStats.totalCompleted;

  // Single student school completion breakdown for horizontal BarChart
  const singleStudentSchoolBarData = (student.applications || []).map(app => {
    const materials = app.materials || [];
    const req = materials.filter(m => m.isRequired);
    const done = req.filter(m => m.status === '已完成' || m.status === '已提交');
    const pct = req.length === 0 ? 0 : Math.round((done.length / req.length) * 100);
    return {
      schoolName: app.schoolName,
      program: app.program,
      completionRate: pct,
      completedCount: done.length,
      totalCount: req.length
    };
  });

  // Helper for active deadline
  const getAppActiveDeadline = (app: SchoolApplication) => {
    if (app.deadlines && app.deadlines.length > 0) {
      const upcoming = app.deadlines
        .filter(d => d.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      return upcoming.length > 0
        ? upcoming[0]
        : [...app.deadlines].sort((a, b) => a.date.localeCompare(b.date))[app.deadlines.length - 1];
    }
    return { id: 'legacy', roundName: app.deadlineRound || '第一轮', date: app.deadline };
  };

  // Find nearest deadline
  const sortedAppsByDeadline = [...student.applications]
    .map(app => ({
      app,
      activeDl: getAppActiveDeadline(app)
    }))
    .filter(item => {
      if (!item.activeDl || !item.activeDl.date) return false;
      const days = getDaysRemaining(item.activeDl.date);
      return item.activeDl.date >= '2026-07-01' && days >= 0;
    })
    .sort((a, b) => {
      return new Date(a.activeDl.date).getTime() - new Date(b.activeDl.date).getTime();
    });

  const nearestAppItem = sortedAppsByDeadline[0];
  const nearestApp = nearestAppItem ? nearestAppItem.app : null;
  const nearestActiveDl = nearestAppItem ? nearestAppItem.activeDl : null;
  const nearestDays = nearestActiveDl ? getDaysRemaining(nearestActiveDl.date) : null;
  const hasValidCountdown = nearestDays !== null && nearestDays >= 0 && nearestActiveDl && nearestActiveDl.date >= '2026-07-01';

  // Pending feedback stats
  let totalPendingFeedback = 0;
  let overdueFeedback = 0;

  student.applications.forEach(app => {
    (app.materials || []).forEach(m => {
      if (m.isRequired && m.status !== '已完成' && m.status !== '已提交' && m.feedbackDueDate) {
        totalPendingFeedback++;
        if (new Date(m.feedbackDueDate) < today) {
          overdueFeedback++;
        }
      }
    });
  });

  (student.globalMaterials || []).forEach(m => {
    if (m.isRequired && m.status !== '已完成' && m.status !== '已提交' && m.feedbackDueDate) {
      totalPendingFeedback++;
      if (new Date(m.feedbackDueDate) < today) {
        overdueFeedback++;
      }
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSaveNotes = () => {
    onUpdateAdvisorNotes(editedNotes);
    setIsEditingNotes(false);
  };

  const handleAddTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    onAddTodo(newTodoText, newTodoDate, newTodoSchool === '通用' ? undefined : newTodoSchool);
    setNewTodoText('');
  };

  const triggerWeChatReminder = () => {
    let materialAlerts: string[] = [];

    (student.globalMaterials || []).forEach(m => {
      if (m.isRequired && (m.status === '未开始' || m.status === '准备中' || m.status === '待修改')) {
        materialAlerts.push(`【通用】“${m.name}”(${m.status})`);
      }
    });

    student.applications.forEach(app => {
      (app.materials || []).forEach(m => {
        if (m.isRequired && (m.status === '未开始' || m.status === '准备中' || m.status === '待修改')) {
          materialAlerts.push(`【${app.schoolName}】“${m.name}”(${m.status})`);
        }
      });
    });

    let msg = `尊敬的【${student.name}】同学/家长您好：\n截至${todayStr}，为您整理的申请进度与待补全要件如下：\n`;
    if (materialAlerts.length > 0) {
      msg += `以下 ${materialAlerts.length} 项必填申请材料急需跟进：\n` + materialAlerts.slice(0, 5).map(item => `• ${item}`).join('\n') + '\n';
      if (materialAlerts.length > 5) msg += `...及其他 ${materialAlerts.length - 5} 项。\n`;
    } else {
      msg += `🎉 恭喜！您当前所有的必填申请材料均已完成就绪！\n`;
    }

    if (nearestApp && nearestActiveDl && hasValidCountdown) {
      msg += `⚠️ 最近临近截止校方：${nearestApp.schoolName}（${nearestActiveDl.roundName}截止日：${nearestActiveDl.date}，倒计时仅剩 ${nearestDays} 天）\n`;
    }

    msg += `请登录留学系统查阅并按时上传。如有疑问请及时与老师沟通！`;

    onSendAlert(msg, 'warning');
  };

  return (
    <div id="dashboard-view-container" className="space-y-6 pb-12">
      {/* ---------------------------------------------------- */}
      {/* TOP DASHBOARD MODE CONTROLLER (OVERVIEW vs SINGLE)  */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shrink-0">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">智能仪表盘与数据分析中心</h2>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                实时连线
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              支持全员学生综合进度可视化图表分析与单生专属精细化管理
            </p>
          </div>
        </div>

        {/* Segmented Control Buttons */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setDashboardMode('overview')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>全员学生汇总看板 ({totalStudentsCount}人)</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardMode('single')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'single'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <User className="h-4 w-4" />
            <span>单生专属看板 ({student.name})</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODE 1: ALL STUDENTS OVERVIEW DASHBOARD             */}
      {/* ==================================================== */}
      {dashboardMode === 'overview' && (
        <div className="space-y-6">
          {/* Overview Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">在管学生总数</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{totalStudentsCount} 位</span>
                <span className="text-[10px] text-slate-500 font-medium block">包含全部在研申请批次</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">项目志愿选校总数</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{totalApplicationsCount} 个</span>
                <span className="text-[10px] text-emerald-600 font-medium block">已递交 {totalSubmittedAppsCount} 项志愿</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">全员平均材料完成率</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{avgOverallPercent}%</span>
                <span className="text-[10px] text-slate-500 font-medium block">通算通用+专属必填要件</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">成功斩获 Offer</span>
                <span className="text-2xl font-black text-amber-600 tracking-tight">{totalOffersCount} 份</span>
                <span className="text-[10px] text-amber-700 font-medium block">录取捷报持续增加中</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Visualizations Grid (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Material Completion Tiers Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">全员材料完成度分布 (分段警示)</h3>
                    <p className="text-[11px] text-slate-400">快速定位进度滞后需要优先催促办学的学生</p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionTierData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`${val} 人`, '学生数量']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {completionTierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Target Country Distribution Donut Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <PieChartIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">全员申请国家 / 地区分布</h3>
                    <p className="text-[11px] text-slate-400">统计全校学生填报的目标留学国家及地区数量</p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {countryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`${val} 个志愿`, '申请数量']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Application Status Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">选校志愿状态分布统计</h3>
                    <p className="text-[11px] text-slate-400">按状态追踪全员志愿推进沉淀阶段</p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`${val} 所`, '志愿数量']}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: IELTS Score Bands */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">学生语言雅思考分分布</h3>
                    <p className="text-[11px] text-slate-400">监控语言成绩达成情况，提防出分受阻</p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ieltsChartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`${val} 人`, '学生人数']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {ieltsChartData.map((entry, index) => (
                        <Cell key={`cell-ielts-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* All Students Detailed Summary Diagnostic Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">全员学生进度诊断与快速切换表</h3>
                  <p className="text-[11px] text-slate-400">按材料完成进度一览学生实时状态，点击右侧可直接进入专属看板</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-4 py-3">学生姓名</th>
                    <th className="px-4 py-3">申请批次 / 目标专业</th>
                    <th className="px-4 py-3">雅思成绩</th>
                    <th className="px-4 py-3 text-center">院校数</th>
                    <th className="px-4 py-3">申请材料完成进度</th>
                    <th className="px-4 py-3">系统评估诊断</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentsList.map((s) => {
                    const stats = getStudentMaterialStats(s);
                    const pct = stats.percent;

                    let rating = '落后 (急需催促)';
                    let ratingClass = 'text-rose-600 bg-rose-50 border-rose-100';
                    if (pct >= 80) {
                      rating = '良好 (具备递交条件)';
                      ratingClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                    } else if (pct >= 50) {
                      rating = '正常 (稳步推进中)';
                      ratingClass = 'text-amber-600 bg-amber-50 border-amber-100';
                    }

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${s.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                              {s.name.substring(0, 1)}
                            </div>
                            <span className="font-bold text-slate-900">{s.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 block">{s.targetMajor}</span>
                            <span className="text-[10px] text-slate-400 block">{s.batchTag || '2026Fall'} • {s.targetDegree}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {s.ieltsScore ? `雅思 ${s.ieltsScore}` : <span className="text-slate-400">未填写</span>}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          {s.applications?.length || 0} 所
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold text-slate-800">{pct}%</span>
                            <span className="text-[10px] text-slate-400 font-mono">({stats.totalCompleted}/{stats.totalRequired})</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ratingClass}`}>
                            {rating}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectStudent) onSelectStudent(s.id);
                              setDashboardMode('single');
                            }}
                            className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            <span>查看专属看板</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 2: SINGLE STUDENT DETAILED DASHBOARD           */}
      {/* ==================================================== */}
      {dashboardMode === 'single' && (
        <div className="space-y-6">
          {/* Header Bar with Student Identity & Export Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${student.avatarColor} text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0`}>
                {student.name.substring(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-slate-900">{student.name} 的专属管理仪表盘</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    {student.batchTag || '2026Fall'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                  <span>意向专业：<strong className="text-slate-800">{student.targetMajor}</strong></span>
                  <span>•</span>
                  <span>申请层次：<strong className="text-slate-800">{student.targetDegree}</strong></span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span>雅思成绩：</span>
                    {isEditingIelts ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={editedIelts} 
                          onChange={(e) => setEditedIelts(e.target.value)}
                          className="w-16 px-1.5 py-0.5 border border-emerald-500 rounded text-xs font-bold bg-white text-slate-800 focus:outline-none"
                          placeholder="如 7.0"
                        />
                        <button 
                          onClick={() => {
                            onUpdateIeltsScore(editedIelts);
                            setIsEditingIelts(false);
                          }}
                          className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsEditingIelts(true)}
                        className="font-bold text-emerald-700 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs"
                      >
                        {student.ieltsScore || '点击填写'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="打印或保存页面为PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>打印页面</span>
              </button>

              <button
                onClick={triggerWeChatReminder}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="一键生成面向微信沟通的催办文案"
              >
                <Send className="h-3.5 w-3.5" />
                <span>一键催交通知</span>
              </button>
            </div>
          </div>

          {/* Adviser Notes & Overview KPI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Adviser Notes Card */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <MessageSquareCode className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">导师督学审阅意见与规划备忘</h3>
                </div>

                {isEditingNotes ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-2.5 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditedNotes(student.advisorNotes);
                        setIsEditingNotes(false);
                      }}
                      className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-500 font-bold cursor-pointer"
                  >
                    编辑意见
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:border-emerald-500"
                  rows={3}
                  placeholder="请输入对该学生的审核意见、重点催交项或备忘内容..."
                />
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 whitespace-pre-wrap">
                  {student.advisorNotes || '暂无导师督学意见。点击右上角“编辑意见”添加督促和指导备忘。'}
                </p>
              )}
            </div>

            {/* Quick KPI Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">申请材料完成进度</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">{overallPercent}%</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    已完成 {totalCompleted} / {totalRequired} 项
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallPercent}%` }} 
                />
              </div>

              {/* Dedicated IELTS score entry directly in Material Progress Card */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>雅思/语言要件:</span>
                </div>
                {isEditingIelts ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={editedIelts} 
                      onChange={(e) => setEditedIelts(e.target.value)}
                      className="w-24 px-2 py-0.5 border border-emerald-500 rounded text-xs font-bold bg-white text-slate-800 focus:outline-none"
                      placeholder="如 7.0"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        onUpdateIeltsScore(editedIelts);
                        setIsEditingIelts(false);
                      }}
                      className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingIelts(true)}
                    className="font-extrabold text-emerald-700 hover:bg-emerald-100 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs transition-all flex items-center gap-1.5"
                    title="点击快捷输入/更新雅思成绩"
                  >
                    <span>{student.ieltsScore ? `雅思 ${student.ieltsScore}` : '⚠️ 尚未录入(点击填写)'}</span>
                    <Edit3 className="h-3 w-3 text-emerald-600" />
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                包含通用常规材料、语言要件与申报专业的定制要件
              </p>
            </div>
          </div>

          {/* Visual Bar Chart comparing material completion for each application of this student */}
          {singleStudentSchoolBarData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">各申请院校与专业材料准备进度对比</h3>
                    <p className="text-[11px] text-slate-400">直观展示该学生各个志愿独立要件的备齐比例</p>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={singleStudentSchoolBarData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                    <YAxis dataKey="schoolName" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: number) => [`${val}%`, '完成比例']}
                    />
                    <Bar dataKey="completionRate" fill="#059669" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Interactive Todo List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">学生专属待办事项与催办提醒清单</h3>
                  <p className="text-[11px] text-slate-400">设定明确的截止日期与关联项目，保障进度按时交付</p>
                </div>
              </div>
            </div>

            {/* Add Todo Form */}
            <form onSubmit={handleAddTodoSubmit} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="新增跟进待办事项（如：催领盖章成绩单、修改PS初稿）..."
                className="flex-1 min-w-[200px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <select
                value={newTodoSchool}
                onChange={(e) => setNewTodoSchool(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="通用">关联项目: 通用</option>
                {student.applications.map(app => (
                  <option key={app.id} value={app.schoolName}>关联项目: {app.schoolName}</option>
                ))}
              </select>
              <input
                type="date"
                value={newTodoDate}
                onChange={(e) => setNewTodoDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>添加待办</span>
              </button>
            </form>

            {/* Todo Item List */}
            <div className="space-y-2 pt-1">
              {(!student.todos || student.todos.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  暂无待办事项，可在上方表单快速新建跟进提醒。
                </div>
              ) : (
                student.todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      todo.isCompleted
                        ? 'bg-slate-50/60 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleTodo(todo.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          todo.isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-emerald-500 bg-white'
                        }`}
                      >
                        {todo.isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-semibold ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {todo.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {todo.associatedSchool && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {todo.associatedSchool}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {todo.dueDate}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteTodo(todo.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="删除待办"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
