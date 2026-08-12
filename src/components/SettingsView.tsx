/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialItem, SchoolApplicationTemplate, Student } from '../types';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  X, 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  ClipboardCheck, 
  Calendar,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Printer,
  GraduationCap,
  Search,
  BookOpen,
  Bookmark,
  Flame
} from 'lucide-react';

interface SettingsViewProps {
  students?: Student[];
  globalTemplates: MaterialItem[];
  schoolTemplates: MaterialItem[];
  roundOptions: string[];
  applicationTemplates: SchoolApplicationTemplate[];
  onSaveGlobalTemplates: (templates: MaterialItem[]) => void;
  onSaveSchoolTemplates: (templates: MaterialItem[]) => void;
  onSaveRoundOptions: (options: string[]) => void;
  onSyncAllStudents: () => void;
  onSaveApplicationTemplates: (templates: SchoolApplicationTemplate[]) => void;
  onSyncSingleTemplate?: (template: SchoolApplicationTemplate) => void;
}

export default function SettingsView({
  students = [],
  globalTemplates,
  schoolTemplates,
  roundOptions,
  applicationTemplates,
  onSaveGlobalTemplates,
  onSaveSchoolTemplates,
  onSaveRoundOptions,
  onSyncAllStudents,
  onSaveApplicationTemplates,
  onSyncSingleTemplate
}: SettingsViewProps) {
  // Local state for Universal Materials
  const [localGlobals, setLocalGlobals] = useState<MaterialItem[]>([...globalTemplates]);
  const [newGlobalName, setNewGlobalName] = useState('');
  const [newGlobalRequired, setNewGlobalRequired] = useState(true);

  // Local state for School Specific Materials
  const [localSchools, setLocalSchools] = useState<MaterialItem[]>([...schoolTemplates]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolRequired, setNewSchoolRequired] = useState(false);

  // Local state for Round Options
  const [localRounds, setLocalRounds] = useState<string[]>([...roundOptions]);
  const [newRoundName, setNewRoundName] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Form error states
  const [globalError, setGlobalError] = useState('');
  const [schoolError, setSchoolError] = useState('');
  const [roundError, setRoundError] = useState('');

  // Custom confirmation modal states
  const [deleteConfirmGlobalId, setDeleteConfirmGlobalId] = useState<string | null>(null);
  const [deleteConfirmSchoolId, setDeleteConfirmSchoolId] = useState<string | null>(null);
  const [deleteConfirmRoundIndex, setDeleteConfirmRoundIndex] = useState<number | null>(null);

  // Sync state & last synced time
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    const saved = localStorage.getItem('advisor_last_synced_time');
    if (saved) return saved;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const initial = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    localStorage.setItem('advisor_last_synced_time', initial);
    return initial;
  });

  const handleStartSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncAllStudents();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setLastSyncedTime(timeStr);
      localStorage.setItem('advisor_last_synced_time', timeStr);
      setIsSyncing(false);
    }, 500);
  };

  // Helper to calculate student heat/popularity for a scheme template
  const getTemplatePopularity = (tpl: SchoolApplicationTemplate): number => {
    if (!students || students.length === 0) return 0;
    const tplSchool = tpl.schoolName.trim().toLowerCase();
    const tplProg = tpl.program.trim().toLowerCase();

    let count = 0;
    students.forEach(s => {
      (s.applications || []).forEach(app => {
        const appSchool = app.schoolName.trim().toLowerCase();
        const appProg = app.program.trim().toLowerCase();

        const isSchoolMatch = appSchool === tplSchool || appSchool.includes(tplSchool) || tplSchool.includes(appSchool);
        const isProgMatch = appProg === tplProg || appProg.includes(tplProg) || tplProg.includes(appProg);

        if (isSchoolMatch && isProgMatch) {
          count++;
        }
      });
    });
    return count;
  };
  const [showAddTplForm, setShowAddTplForm] = useState(false);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [settingsTplSearch, setSettingsTplSearch] = useState('');
  const [autoSyncOnSave, setAutoSyncOnSave] = useState(true);
  const [tplFormName, setTplFormName] = useState('');
  const [tplFormSchool, setTplFormSchool] = useState('');
  const [tplFormProgram, setTplFormProgram] = useState('');
  const [tplFormCountry, setTplFormCountry] = useState('美国');
  const [tplFormLang, setTplFormLang] = useState('');
  const [tplFormDeadlines, setTplFormDeadlines] = useState<{ id: string; roundName: string; date: string }[]>([
    { id: '1', roundName: '第一轮', date: '2026-12-15' }
  ]);
  const [tplSelectedMaterials, setTplSelectedMaterials] = useState<string[]>([]);
  const [tplError, setTplError] = useState('');
  const [deleteConfirmTplId, setDeleteConfirmTplId] = useState<string | null>(null);

  // Pre-fill form for editing existing template
  const handleStartEditTemplate = (tpl: SchoolApplicationTemplate) => {
    setEditingTplId(tpl.id);
    setTplFormName(tpl.templateName);
    setTplFormSchool(tpl.schoolName);
    setTplFormProgram(tpl.program);
    setTplFormCountry(tpl.country || '美国');
    setTplFormLang(tpl.languageRequirement || '');
    setTplFormDeadlines(
      tpl.deadlines && tpl.deadlines.length > 0
        ? tpl.deadlines.map(d => ({ ...d }))
        : [{ id: '1', roundName: '第一轮', date: '2026-12-15' }]
    );
    // Find pre-selected required material IDs
    const reqIds = (tpl.materials || []).filter(m => m.isRequired).map(m => m.id);
    setTplSelectedMaterials(reqIds);
    setTplError('');
    setShowAddTplForm(true);
  };

  // Handle direct template creation or update
  const handleAddTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTplError('');
    if (!tplFormSchool.trim() || !tplFormProgram.trim()) {
      setTplError('学校名称和专业项目不能为空。');
      return;
    }

    const finalTplName = tplFormName.trim() || `${tplFormSchool.trim()} - ${tplFormProgram.trim()}`;

    // Verify duplication if creating new
    if (!editingTplId && applicationTemplates.some(t => t.templateName.toLowerCase() === finalTplName.toLowerCase())) {
      setTplError('该方案名称已被占用，请换个独特名称（如：CMU - CS (首轮强推班)）。');
      return;
    }

    // Build the template
    const savedTpl: SchoolApplicationTemplate = {
      id: editingTplId || `tpl-${Date.now()}`,
      templateName: finalTplName,
      schoolName: tplFormSchool.trim(),
      program: tplFormProgram.trim(),
      country: tplFormCountry,
      languageRequirement: tplFormLang.trim() || undefined,
      deadlines: tplFormDeadlines.map((d, index) => ({
        id: d.id || `dl-${Date.now()}-${index}`,
        roundName: d.roundName.trim() || `第 ${index + 1} 轮`,
        date: d.date
      })),
      materials: schoolTemplates.map(m => ({
        id: m.id,
        name: m.name,
        isRequired: tplSelectedMaterials.includes(m.id),
        notes: ''
      }))
    };

    let updated: SchoolApplicationTemplate[];
    if (editingTplId) {
      updated = applicationTemplates.map(t => t.id === editingTplId ? savedTpl : t);
    } else {
      updated = [savedTpl, ...applicationTemplates];
    }
    onSaveApplicationTemplates(updated);

    // Auto-sync to students if enabled
    if (autoSyncOnSave && onSyncSingleTemplate) {
      onSyncSingleTemplate(savedTpl);
    }

    // Reset Form
    setEditingTplId(null);
    setTplFormName('');
    setTplFormSchool('');
    setTplFormProgram('');
    setTplFormCountry('美国');
    setTplFormLang('');
    setTplFormDeadlines([{ id: '1', roundName: '第一轮', date: '2026-12-15' }]);
    setTplSelectedMaterials([]);
    setShowAddTplForm(false);
  };

  const handleDeleteTemplate = (tplId: string) => {
    const updated = applicationTemplates.filter(t => t.id !== tplId);
    onSaveApplicationTemplates(updated);
    setDeleteConfirmTplId(null);
  };

  // Universal: Add new
  const handleAddGlobal = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!newGlobalName.trim()) return;
    
    // Check for duplicate names
    if (localGlobals.some(g => g.name.toLowerCase() === newGlobalName.trim().toLowerCase())) {
      setGlobalError('材料名称已存在，请换一个名称。');
      return;
    }

    const newItem: MaterialItem = {
      id: `global-custom-${Date.now()}`,
      name: newGlobalName.trim(),
      isRequired: newGlobalRequired,
      status: '未开始',
      feedbackDueDate: '',
      notes: ''
    };

    const updated = [...localGlobals, newItem];
    setLocalGlobals(updated);
    onSaveGlobalTemplates(updated);
    setNewGlobalName('');
  };

  // Universal: Delete
  const handleDeleteGlobal = (id: string) => {
    setDeleteConfirmGlobalId(id);
  };

  const confirmDeleteGlobal = (id: string) => {
    const updated = localGlobals.filter(g => g.id !== id);
    setLocalGlobals(updated);
    onSaveGlobalTemplates(updated);
    setDeleteConfirmGlobalId(null);
  };

  // Universal: Toggle IsRequired
  const handleToggleGlobalRequired = (id: string) => {
    const updated = localGlobals.map(g => {
      if (g.id === id) {
        return { ...g, isRequired: !g.isRequired };
      }
      return g;
    });
    setLocalGlobals(updated);
    onSaveGlobalTemplates(updated);
  };

  // School Specific: Add new
  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolError('');
    if (!newSchoolName.trim()) return;

    if (localSchools.some(s => s.name.toLowerCase() === newSchoolName.trim().toLowerCase())) {
      setSchoolError('材料名称已存在，请换一个名称。');
      return;
    }

    const newItem: MaterialItem = {
      id: `school-custom-${Date.now()}`,
      name: newSchoolName.trim(),
      isRequired: newSchoolRequired,
      status: '未开始',
      feedbackDueDate: '',
      notes: ''
    };

    const updated = [...localSchools, newItem];
    setLocalSchools(updated);
    onSaveSchoolTemplates(updated);
    setNewSchoolName('');
  };

  // School Specific: Delete
  const handleDeleteSchool = (id: string) => {
    setDeleteConfirmSchoolId(id);
  };

  const confirmDeleteSchool = (id: string) => {
    const updated = localSchools.filter(s => s.id !== id);
    setLocalSchools(updated);
    onSaveSchoolTemplates(updated);
    setDeleteConfirmSchoolId(null);
  };

  // School Specific: Toggle IsRequired
  const handleToggleSchoolRequired = (id: string) => {
    const updated = localSchools.map(s => {
      if (s.id === id) {
        return { ...s, isRequired: !s.isRequired };
      }
      return s;
    });
    setLocalSchools(updated);
    onSaveSchoolTemplates(updated);
  };

  // Round Options: Add new
  const handleAddRound = (e: React.FormEvent) => {
    e.preventDefault();
    setRoundError('');
    if (!newRoundName.trim()) return;

    if (localRounds.some(r => r.toLowerCase() === newRoundName.trim().toLowerCase())) {
      setRoundError('该轮次选项已存在。');
      return;
    }

    const updated = [...localRounds, newRoundName.trim()];
    setLocalRounds(updated);
    onSaveRoundOptions(updated);
    setNewRoundName('');
  };

  // Round Options: Delete
  const handleDeleteRound = (index: number) => {
    setDeleteConfirmRoundIndex(index);
  };

  const confirmDeleteRound = (index: number) => {
    const updated = localRounds.filter((_, i) => i !== index);
    setLocalRounds(updated);
    onSaveRoundOptions(updated);
    setDeleteConfirmRoundIndex(null);
  };

  // Edit general names helper
  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const saveEditingName = (type: 'global' | 'school') => {
    if (!editingName.trim()) return;

    if (type === 'global') {
      const updated = localGlobals.map(g => {
        if (g.id === editingId) {
          return { ...g, name: editingName.trim() };
        }
        return g;
      });
      setLocalGlobals(updated);
      onSaveGlobalTemplates(updated);
    } else {
      const updated = localSchools.map(s => {
        if (s.id === editingId) {
          return { ...s, name: editingName.trim() };
        }
        return s;
      });
      setLocalSchools(updated);
      onSaveSchoolTemplates(updated);
    }

    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Print Only Header */}
      <div className="print-only-header hidden">
        <h1 className="text-2xl font-black text-slate-900">留学网申材料进度督导系统 - 系统配置报告表</h1>
        <p className="text-xs text-slate-500">
          出具日期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} • 顾问配置参数存档
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-800 tracking-tight sm:text-2xl">⚙️ 系统材料要件与轮次配置中心</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            可在此处根据学校、学段和年度差异，随需增删或改名申请材料选项、网申截止轮次，一键全局热同步，无需编程人员修改代码。
          </p>
        </div>

        {/* Sync & Export helpers */}
        <div className="flex items-center gap-2.5 no-print">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
            title="导出系统参数配置为PDF备忘"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            导出本页 PDF
          </button>
          <button
            onClick={onSyncAllStudents}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 shadow-md shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            应用并同步当前设置至所有学生
          </button>
        </div>
      </div>

      {/* Sync Warning and Guidance */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">💡 操作与同步规则说明：</p>
          <p>
            1. <strong>新增要件：</strong> 在下方新增要件后，可通过上方“<strong>应用并同步当前设置至所有学生</strong>”按钮将该要件即刻绑定至所有已有学生。
          </p>
          <p>
            2. <strong>修改或删除：</strong> 删除某个模板材料或将其重命名后，同步操作可以自动清理或对应更新所有已有学生的记录（不丢弃其他正常录入的成绩单或进度数据）。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Universal Material Option Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">📂 通用申请材料模板管理 (Global)</h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
              {localGlobals.length} 个项目
            </span>
          </div>

          {/* Form to add item */}
          <form onSubmit={handleAddGlobal} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 block">新材料名称</label>
              <input
                type="text"
                required
                placeholder="例如：雅思成绩单 (IELTS)"
                value={newGlobalName}
                onChange={(e) => setNewGlobalName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-slate-400 block">是否必需</label>
              <div className="flex items-center h-8">
                <button
                  type="button"
                  onClick={() => setNewGlobalRequired(!newGlobalRequired)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    newGlobalRequired 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {newGlobalRequired ? '必须件' : '自备选件'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer whitespace-nowrap h-8 flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </form>

          {globalError && (
            <p className="text-xs text-rose-500 font-medium -mt-3 pl-1">{globalError}</p>
          )}

          {/* Material templates list */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {localGlobals.map((g) => (
              <div 
                key={g.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors gap-2"
              >
                {editingId === g.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEditingName('global')}
                      className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 bg-slate-200 text-slate-500 rounded hover:bg-slate-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate" title={g.name}>
                        {g.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(g.id, g.name)}
                        className="text-[10px] text-slate-400 hover:text-emerald-600 font-bold"
                      >
                        改名
                      </button>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">ID: {g.id}</div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* IsRequired toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleGlobalRequired(g.id)}
                    className={`inline-flex rounded-full text-[9px] font-black px-1.5 py-0.5 tracking-wide ${
                      g.isRequired 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {g.isRequired ? '必需件' : '自选件'}
                  </button>

                  {/* Delete template button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteGlobal(g.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="删除此选项"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. School-Specific Material Option Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">🏫 校本专属材料模板管理 (Specific)</h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
              {localSchools.length} 个项目
            </span>
          </div>

          {/* Form to add item */}
          <form onSubmit={handleAddSchool} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 block">新专属材料名称</label>
              <input
                type="text"
                required
                placeholder="例如：面试准备/Writing Sample"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-slate-400 block">是否必需</label>
              <div className="flex items-center h-8">
                <button
                  type="button"
                  onClick={() => setNewSchoolRequired(!newSchoolRequired)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    newSchoolRequired 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {newSchoolRequired ? '必须件' : '自备选件'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer whitespace-nowrap h-8 flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </form>

          {schoolError && (
            <p className="text-xs text-rose-500 font-medium -mt-3 pl-1">{schoolError}</p>
          )}

          {/* School material templates list */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {localSchools.map((s) => (
              <div 
                key={s.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors gap-2"
              >
                {editingId === s.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEditingName('school')}
                      className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 bg-slate-200 text-slate-500 rounded hover:bg-slate-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate" title={s.name}>
                        {s.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(s.id, s.name)}
                        className="text-[10px] text-slate-400 hover:text-emerald-600 font-bold"
                      >
                        改名
                      </button>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">ID: {s.id}</div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* IsRequired toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleSchoolRequired(s.id)}
                    className={`inline-flex rounded-full text-[9px] font-black px-1.5 py-0.5 tracking-wide ${
                      s.isRequired 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {s.isRequired ? '必需件' : '自选件'}
                  </button>

                  {/* Delete template button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSchool(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="删除此选项"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Application Rounds Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">📅 申请轮次管理 (Round Options)</h3>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
            {localRounds.length} 个备选项
          </span>
        </div>

        {/* Explain */}
        <p className="text-xs text-slate-400">
          此列表为网申多轮截止日期设置时，下拉菜单可供选择的申请轮次选项。可自行追加如“EA早申、主轮、补录轮、滚动招生等”。
        </p>

        {/* Form */}
        <form onSubmit={handleAddRound} className="flex gap-3 max-w-md items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">新增轮次选项</label>
            <input
              type="text"
              required
              placeholder="例如：早申EA1 / 本科主申"
              value={newRoundName}
              onChange={(e) => setNewRoundName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer whitespace-nowrap h-9 flex items-center justify-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
        </form>

        {roundError && (
          <p className="text-xs text-rose-500 font-medium mt-1.5 pl-1">{roundError}</p>
        )}

        {/* Tags List */}
        <div className="flex flex-wrap gap-2.5 pt-2">
          {localRounds.map((round, index) => (
            <div 
              key={`${round}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              <span>{round}</span>
              <button
                type="button"
                onClick={() => handleDeleteRound(index)}
                className="text-slate-400 hover:text-rose-500 focus:outline-none transition-colors"
                title="删除该选项"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Professional Scheme Templates Management Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">🎓 常用专业方案库管理后台 (Application Schemes)</h3>
              <p className="text-[11px] text-slate-400 font-medium">我在此处管理所有已保存的专业方案模板（包含对应的必选材料、多轮截止日期和语言要求）。</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTplForm(!showAddTplForm)}
            className="self-start sm:self-center flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddTplForm ? '收起表单' : '录入全新专业方案'}
          </button>
        </div>

        {/* Add Template Form */}
        {showAddTplForm && (
          <form onSubmit={handleAddTemplateSubmit} className="bg-slate-50 border border-emerald-200/40 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
              🆕 录入新的专业志愿方案模板
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">方案模板简称</label>
                <input
                  type="text"
                  placeholder="例如：CMU - MS in CS (首轮班)"
                  value={tplFormName}
                  onChange={(e) => setTplFormName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">学校名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例如：Carnegie Mellon University"
                  value={tplFormSchool}
                  onChange={(e) => setTplFormSchool(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">专业/项目名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例如：Master of Science in Computer Science"
                  value={tplFormProgram}
                  onChange={(e) => setTplFormProgram(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">国家/地区</label>
                <select
                  value={tplFormCountry}
                  onChange={(e) => setTplFormCountry(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="美国">美国</option>
                  <option value="英国">英国</option>
                  <option value="中国香港">中国香港</option>
                  <option value="中国澳门">中国澳门</option>
                  <option value="新加坡">新加坡</option>
                  <option value="加拿大">加拿大</option>
                  <option value="澳大利亚">澳大利亚</option>
                  <option value="新西兰">新西兰</option>
                  <option value="意大利">意大利</option>
                  <option value="欧洲">欧洲</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">最低语言成绩要求</label>
                <input
                  type="text"
                  placeholder="例如：雅思 7.5 (单项 6.5)"
                  value={tplFormLang}
                  onChange={(e) => setTplFormLang(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Deadlines list */}
            <div className="space-y-2 border-t border-slate-200/60 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">截止日轮次配置 (可多轮)</span>
                <button
                  type="button"
                  onClick={() => {
                    setTplFormDeadlines([
                      ...tplFormDeadlines,
                      { id: String(tplFormDeadlines.length + 1), roundName: `第${tplFormDeadlines.length + 1}轮`, date: '2026-12-15' }
                    ]);
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> 增设轮次
                </button>
              </div>

              <div className="space-y-2">
                {tplFormDeadlines.map((dl, index) => (
                  <div key={dl.id || index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100">
                    <input
                      type="text"
                      placeholder="轮次名称 (第一轮、Round 1)"
                      value={dl.roundName}
                      onChange={(e) => {
                        const updated = [...tplFormDeadlines];
                        updated[index].roundName = e.target.value;
                        setTplFormDeadlines(updated);
                      }}
                      className="w-1/3 bg-slate-50/50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="date"
                      value={dl.date}
                      onChange={(e) => {
                        const updated = [...tplFormDeadlines];
                        updated[index].date = e.target.value;
                        setTplFormDeadlines(updated);
                      }}
                      className="w-1/3 bg-slate-50/50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    {tplFormDeadlines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTplFormDeadlines(tplFormDeadlines.filter((_, idx) => idx !== index));
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Materials configuration */}
            <div className="space-y-2 border-t border-slate-200/60 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">绑定校本必选材料要件</span>
              <p className="text-[10px] text-slate-500">勾选本专业方案必须上传的校本特异材料：</p>
              <div className="flex flex-wrap gap-2">
                {schoolTemplates.map(m => {
                  const isChecked = tplSelectedMaterials.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setTplSelectedMaterials(tplSelectedMaterials.filter(id => id !== m.id));
                        } else {
                          setTplSelectedMaterials([...tplSelectedMaterials, m.id]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}{m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {tplError && (
              <p className="text-xs text-rose-500 font-medium pl-1">{tplError}</p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoSyncCheck"
                  checked={autoSyncOnSave}
                  onChange={(e) => setAutoSyncOnSave(e.target.checked)}
                  className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="autoSyncCheck" className="text-xs text-slate-700 font-bold cursor-pointer">
                  🔄 保存时自动更新并同步该专业最新截止日期、语言要求与材料规范至选报学生
                </label>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTplId(null);
                    setShowAddTplForm(false);
                  }}
                  className="px-4 py-1.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                >
                  {editingTplId ? '保存修改并同步更新' : '保存此专业方案至云端后台'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Templates List and Search */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 搜索方案模板（输入学校、专业或国家...）"
              value={settingsTplSearch}
              onChange={(e) => setSettingsTplSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const kw = settingsTplSearch.toLowerCase().trim();
              const filtered = applicationTemplates.filter(t => 
                !kw ||
                t.templateName.toLowerCase().includes(kw) ||
                t.schoolName.toLowerCase().includes(kw) ||
                t.program.toLowerCase().includes(kw) ||
                t.country.toLowerCase().includes(kw)
              );

              // Sort by student heat / selection count descending
              const sortedFiltered = [...filtered].sort((a, b) => {
                return getTemplatePopularity(b) - getTemplatePopularity(a);
              });

              if (sortedFiltered.length === 0) {
                return (
                  <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    未检索到匹配的专业方案模板。
                  </div>
                );
              }

              return sortedFiltered.map(tpl => {
                const popCount = getTemplatePopularity(tpl);
                return (
                  <div key={tpl.id} className="border border-slate-150 hover:border-emerald-500/30 rounded-2xl p-4 space-y-3 transition-all relative group bg-slate-50/30">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-extrabold text-xs text-slate-800">{tpl.templateName}</span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded border border-emerald-100">
                            {tpl.country}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full flex items-center gap-1 ${
                            popCount > 0 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Flame className={`h-3 w-3 ${popCount > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'}`} />
                            {popCount > 0 ? `热度: ${popCount}位学生选报` : '暂未选报'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{tpl.schoolName}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{tpl.program}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onSyncSingleTemplate && (
                          <button
                            type="button"
                            onClick={() => onSyncSingleTemplate(tpl)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="将此专业方案的最新截止日期与要求立即一键热同步给选报该专业的所有学生"
                          >
                            <RefreshCw className="h-3 w-3" /> 同步给学生
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEditTemplate(tpl)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="修改此专业方案信息"
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTplId(tpl.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="从方案库中移除此专业方案"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Deadlines preview */}
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">截止轮次配置</span>
                      <div className="flex flex-wrap gap-1">
                        {tpl.deadlines?.map((d, i) => (
                          <span key={d.id || i} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-semibold text-slate-600">
                            {d.roundName}: {d.date}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Materials list preview */}
                    {tpl.materials && tpl.materials.filter(m => m.isRequired).length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">特定绑定材料 ({tpl.materials.filter(m => m.isRequired).length}个)</span>
                        <div className="flex flex-wrap gap-1">
                          {tpl.materials.filter(m => m.isRequired).map((m, idx) => (
                            <span key={m.id || idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {tpl.languageRequirement && (
                      <div className="text-[9px] font-black text-emerald-700 flex items-center gap-1">
                        📢 语言要求：{tpl.languageRequirement}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Sync Footer Box */}
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 justify-center md:justify-start">
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            热生效！立即将此模板同步到现有的所有学生
          </h4>
          <p className="text-xs text-slate-400 max-w-xl">
            对材料增删或更名后，此操作会在不影响已有材料状态、反馈日期及备注的前提下，在现有所有学生的清单中新增材料，或剔除已删除材料。
          </p>
          {lastSyncedTime && (
            <p className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1 justify-center md:justify-start pt-0.5">
              <span>⏱️ 上次全员同步完成时间：</span>
              <span className="font-bold underline decoration-emerald-500/50 decoration-dashed">{lastSyncedTime}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0 w-full md:w-auto">
          <button
            onClick={handleStartSyncAll}
            disabled={isSyncing}
            className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                正在同步中...
              </>
            ) : (
              '立即开始同步'
            )}
          </button>
          <span className="text-[11px] text-emerald-400 font-mono font-medium whitespace-nowrap">
            {lastSyncedTime}
          </span>
        </div>
      </div>

      {/* Global Material Delete Confirmation Modal */}
      {deleteConfirmGlobalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认删除通用材料模板？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              您确定要从通用模板中删除该材料吗？此操作将使后续新增学生时不再自动包含此要件。如有需要，您仍可以使用“全员热同步”来批量清理所有已有学生的该要件。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmGlobalId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteGlobal(deleteConfirmGlobalId)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Material Delete Confirmation Modal */}
      {deleteConfirmSchoolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认删除校本专属材料模板？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              确定要从校本专属模板中删除该材料吗？后续新增的目标高校将默认不包含此特定要件。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmSchoolId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteSchool(deleteConfirmSchoolId)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Option Delete Confirmation Modal */}
      {deleteConfirmRoundIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认删除轮次选项？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              确定要删除此轮次备选项 【<span className="font-extrabold text-slate-800">{localRounds[deleteConfirmRoundIndex]}</span>】吗？删除后将无法在此后录入院校截止时间时从下拉快捷中勾选此项。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmRoundIndex(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteRound(deleteConfirmRoundIndex)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Template Delete Confirmation Modal */}
      {deleteConfirmTplId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认删除常用专业方案？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              您确定要将该专业方案从云端后台方案库中删除吗？此操作不会影响已添加该方案的学生，但后续为学生新增申请时，将无法再通过关键字一键匹配和导入此方案。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTplId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTemplate(deleteConfirmTplId)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
