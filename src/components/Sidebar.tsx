/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student } from '../types';
import { 
  Users, 
  GraduationCap, 
  Plus, 
  Trash2, 
  LayoutDashboard, 
  FolderEdit, 
  BellRing, 
  FileSpreadsheet, 
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Settings,
  Lock
} from 'lucide-react';

interface SidebarProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (name: string, targetDegree: string, targetMajor: string) => void;
  onDeleteStudent: (id: string) => void;
  activeTab: 'dashboard' | 'applications' | 'checklist' | 'notifications' | 'reports' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'applications' | 'checklist' | 'notifications' | 'reports' | 'settings') => void;
}

export default function Sidebar({
  students,
  selectedStudentId,
  onSelectStudent,
  onAddStudent,
  onDeleteStudent,
  activeTab,
  setActiveTab,
}: SidebarProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentYear, setNewStudentYear] = useState('2027');
  const [newStudentSeason, setNewStudentSeason] = useState('秋季');
  const [newStudentLevel, setNewStudentLevel] = useState('硕士');
  const [newStudentMajor, setNewStudentMajor] = useState('');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentMajor.trim()) return;

    let levelSuffix = '硕士研究生';
    if (newStudentLevel === '本科') levelSuffix = '本科新生';
    else if (newStudentLevel === '博士') levelSuffix = '博士研究生';

    const combinedDegreeText = `${newStudentYear}${newStudentSeason} ${levelSuffix}`;
    onAddStudent(newStudentName, combinedDegreeText, newStudentMajor);
    
    setNewStudentName('');
    setNewStudentMajor('');
    setShowAddModal(false);
  };

  // Calculate overall application completion for a student
  const getOverallProgress = (student: Student) => {
    if (student.applications.length === 0) return 0;
    let totalPercentSum = 0;
    student.applications.forEach(app => {
      const allMaterials = [
        ...(app.materials || []),
        ...(student.globalMaterials || [])
      ];
      const required = allMaterials.filter(m => m.isRequired);
      const completed = required.filter(m => m.status === '已完成' || m.status === '已提交');
      const percent = required.length === 0 ? 0 : Math.round((completed.length / required.length) * 100);
      totalPercentSum += percent;
    });
    return Math.round(totalPercentSum / student.applications.length);
  };

  return (
    <aside className="w-80 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 h-full">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-emerald-600 rounded-lg text-white">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">网申督学系统</h1>
          <p className="text-xs text-slate-400 font-medium">Application Progress Advisor</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="px-4 py-4 border-b border-slate-800">
        <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">系统视图</p>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>学生仪表盘</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'applications'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderEdit className="h-4.5 w-4.5" />
              <span>材料要件进度</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'checklist'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="h-4.5 w-4.5 text-emerald-400" />
              <span>申请Checklist智能总库</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
              Excel/联动
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BellRing className="h-4.5 w-4.5" />
              <span>通知与督促中心</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>网申汇总报告</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4.5 w-4.5" />
              <span>系统配置后台</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => {
              try {
                localStorage.removeItem('advisor_access_granted');
                sessionStorage.removeItem('advisor_access_granted');
              } catch (e) {}
              window.location.reload();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent mt-1"
            title="锁定系统并要求重新输入访问口令"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              <span>锁定系统 (验证口令)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Student List Controller */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3 w-3" /> 学生列表 ({students.length})
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            title="添加新学生"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1 flex-1 overflow-y-auto pr-1">
          {students.map((student) => {
            const isSelected = student.id === selectedStudentId;

            return (
              <div
                key={student.id}
                className={`group relative flex items-center justify-between py-1.5 px-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/60 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                }`}
                onClick={() => onSelectStudent(student.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-full ${student.avatarColor} text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-sm shrink-0`}>
                    {student.name.substring(0, 1)}
                  </div>
                  <span className="font-semibold text-xs text-slate-100 group-hover:text-white transition-colors truncate">
                    {student.name}
                  </span>
                  <span className="bg-slate-800/90 text-slate-400 font-medium px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-slate-700/50">
                    {student.batchTag || '2026Fall'}
                  </span>
                </div>

                {/* Delete student */}
                {students.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDeleteId(student.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-all cursor-pointer z-10 shrink-0 ml-1"
                    title="删除该学生"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Student Active Indicator */}
      {selectedStudent && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
            <span>当前操作学生：</span>
            <span className="font-bold text-slate-200">{selectedStudent.name}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{selectedStudent.targetDegree}</span>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl text-left text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-4">添加新学生档案</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">学生姓名</label>
                <input
                  type="text"
                  required
                  placeholder="例如：王浩然"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider -mb-2">申请批次 & 学位层次</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">入学年份</label>
                    <select
                      value={newStudentYear}
                      onChange={(e) => setNewStudentYear(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="2025">2025年</option>
                      <option value="2026">2026年</option>
                      <option value="2027">2027年</option>
                      <option value="2028">2028年</option>
                      <option value="2029">2029年</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">入学季</label>
                    <select
                      value={newStudentSeason}
                      onChange={(e) => setNewStudentSeason(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="春季">春季</option>
                      <option value="夏季">夏季</option>
                      <option value="秋季">秋季</option>
                      <option value="冬季">冬季</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">学位层次</label>
                    <select
                      value={newStudentLevel}
                      onChange={(e) => setNewStudentLevel(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="本科">本科</option>
                      <option value="硕士">硕士</option>
                      <option value="博士">博士</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">目标专业</label>
                <input
                  type="text"
                  required
                  placeholder="例如：商业分析 (Business Analytics)"
                  value={newStudentMajor}
                  onChange={(e) => setNewStudentMajor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-2">确认删除学生档案？</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              您确定要删除学生 <span className="text-rose-400 font-extrabold">{students.find(s => s.id === confirmingDeleteId)?.name}</span> 及其所有申请院校和材料进度吗？此操作将永久抹除该学生的本地记录，且无法撤销。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmingDeleteId) {
                    onDeleteStudent(confirmingDeleteId);
                    setConfirmingDeleteId(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
