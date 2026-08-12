/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, SchoolApplication, MaterialItem, MaterialStatus, ApplicationStatus, SchoolApplicationTemplate, formatDeadlineDate } from '../types';
import { sortSchoolApplications } from '../utils/sorting';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  CheckSquare, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  HelpCircle,
  Clock,
  ExternalLink,
  ClipboardCheck,
  Building,
  Printer, 
  Bookmark,
  GripVertical,
  Target,
  Award,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { getDefaultMaterials } from '../initialData';

interface ApplicationsViewProps {
  student: Student;
  roundOptions: string[];
  applicationTemplates: SchoolApplicationTemplate[];
  onAddApplication: (
    app: Omit<SchoolApplication, 'id' | 'materials'>,
    customMaterials?: { id: string; name: string; isRequired: boolean; notes: string }[]
  ) => void;
  onDeleteApplication: (appId: string) => void;
  onUpdateMaterial: (appId: string, materialId: string, updates: Partial<MaterialItem>) => void;
  onUpdateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
  onUpdateApplicationDetails: (appId: string, updates: Partial<SchoolApplication>) => void;
  onSaveAsTemplate: (app: SchoolApplication) => void;
  onDeleteTemplate: (tplId: string) => void;
  onReorderApplications?: (reorderedApps: SchoolApplication[]) => void;
  onUpdateIeltsScore?: (score: string) => void;
}

export default function ApplicationsView({
  student,
  roundOptions,
  applicationTemplates,
  onAddApplication,
  onDeleteApplication,
  onUpdateMaterial,
  onUpdateApplicationStatus,
  onUpdateApplicationDetails,
  onSaveAsTemplate,
  onDeleteTemplate,
  onReorderApplications,
  onUpdateIeltsScore
}: ApplicationsViewProps) {
  const [expandedAppId, setExpandedAppId] = useState<string | null>(student.applications[0]?.id || null);
  const [showAddApp, setShowAddApp] = useState(false);
  const [isEditingIelts, setIsEditingIelts] = useState(false);
  const [editedIelts, setEditedIelts] = useState(student.ieltsScore || '');

  React.useEffect(() => {
    setEditedIelts(student.ieltsScore || '');
  }, [student.id, student.ieltsScore]);
  const [confirmingDeleteAppId, setConfirmingDeleteAppId] = useState<string | null>(null);

  // Drag and drop sorting states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeDragAppId, setActiveDragAppId] = useState<string | null>(null);

  // Form states for adding application
  const [schoolName, setSchoolName] = useState('');
  const [program, setProgram] = useState('');
  const [country, setCountry] = useState('美国');
  const [languageRequirement, setLanguageRequirement] = useState('');
  const [addFormDeadlines, setAddFormDeadlines] = useState<{ id: string; roundName: string; date: string }[]>([
    { id: '1', roundName: '第一轮', date: '2026-12-15' }
  ]);
  const [templateSearchKeyword, setTemplateSearchKeyword] = useState('');
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);

  // Track custom materials selected from template
  const [selectedTemplateMaterials, setSelectedTemplateMaterials] = useState<{ id: string; name: string; isRequired: boolean; notes: string }[] | undefined>(undefined);

  // Sync expanded app if student changes and current expanded isn't for this student
  React.useEffect(() => {
    if (student.applications.length > 0) {
      const exists = student.applications.some(a => a.id === expandedAppId);
      if (!exists) {
        setExpandedAppId(student.applications[0].id);
      }
    } else {
      setExpandedAppId(null);
    }
  }, [student, expandedAppId]);

  const handleAddAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !program.trim() || addFormDeadlines.length === 0) return;

    onAddApplication({
      schoolName: schoolName.trim(),
      program: program.trim(),
      country,
      deadline: addFormDeadlines[0].date,
      deadlineRound: addFormDeadlines[0].roundName,
      deadlines: addFormDeadlines.map(d => ({
        id: d.id,
        roundName: d.roundName.trim() || '第一轮',
        date: d.date
      })),
      status: '未开始',
      languageRequirement: languageRequirement.trim() || undefined
    }, selectedTemplateMaterials);

    setSchoolName('');
    setProgram('');
    setLanguageRequirement('');
    setAddFormDeadlines([{ id: '1', roundName: '第一轮', date: '2026-12-15' }]);
    setSelectedTemplateMaterials(undefined);
    setTemplateSearchKeyword('');
    setShowTemplateSuggestions(false);
    setShowAddApp(false);
  };

  const toggleExpand = (appId: string) => {
    setExpandedAppId(prev => (prev === appId ? null : appId));
  };

  // Helper to calculate progress (strictly targeting required materials for this specific application/program)
  const getRequiredMaterialsStats = (app: SchoolApplication) => {
    const materials = app.materials || [];
    const required = materials.filter(m => m.isRequired);
    const completed = required.filter(m => m.status === '已完成' || m.status === '已提交');
    const percent = required.length === 0 ? 0 : Math.round((completed.length / required.length) * 100);
    return {
      total: required.length,
      completed: completed.length,
      percent
    };
  };

  // Helper presets for toggling requirements quickly
  const applyPresetRequired = (appId: string, preset: 'all' | 'academic' | 'creative') => {
    const app = student.applications.find(a => a.id === appId);
    if (!app) return;

    app.materials.forEach(mat => {
      let isRequired = true;
      if (preset === 'academic') {
        // Academic preset: PS, CV, Recommendation, Transcripts, Graduation/Enrollment, Grading System
        // Creative portfolios or videos are not required
        if (mat.id === 'portfolio' || mat.id === 'video') {
          isRequired = false;
        }
      } else if (preset === 'creative') {
        // Creative: everything plus Portfolio and Video are required
        isRequired = true;
      }
      onUpdateMaterial(appId, mat.id, { isRequired });
    });
  };

  const statusOptions: MaterialStatus[] = ['未开始', '准备中', '待修改', '已完成', '已提交'];
  const appStatusOptions: ApplicationStatus[] = ['未开始', '材料准备中', '已提交', '面试中', '已录取', '被拒绝', '待定'];

  return (
    <div className="space-y-6">
      {/* Print Only Header */}
      <div className="print-only-header hidden">
        <h1 className="text-2xl font-black text-slate-900">{student.name} 的目标院校网申材料要件清单与进度报告</h1>
        <p className="text-xs text-slate-500">出具日期：2026年7月21日 • 系统自动同步实时记录</p>
      </div>

      {/* Top action header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">材料要件与申请管理</h2>
          <p className="text-xs text-slate-500 font-medium">定制不同目标院校的材料要件，追踪导师/学生双向反馈时间</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer"
            title="将目标高校清单及要件材料进度导出为PDF"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            导出本页 PDF
          </button>
          <button
            onClick={() => setShowAddApp(!showAddApp)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            增设目标院校
          </button>
        </div>
      </div>

      {/* Prominent IELTS & Language Score Requirement Entry Card */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-emerald-500/30 space-y-4 relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black rounded-md uppercase tracking-wider">
                语言要件录入入口
              </span>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                🎓 【{student.name}】雅思/语言成绩单管理
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              雅思/语言成绩单是网申要件材料的关键组成。在此处录入后将自动同步至仪表盘、全套申请方案与多校诊断表格。
            </p>
          </div>

          {/* Current IELTS display & Edit mode button */}
          <div className="shrink-0 flex items-center gap-2">
            {isEditingIelts ? (
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-emerald-500/60 p-2 rounded-xl shadow-lg">
                <input
                  type="text"
                  value={editedIelts}
                  onChange={(e) => setEditedIelts(e.target.value)}
                  placeholder="如：7.0 (听7.5/读7.5/写6.5/口6.0)"
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-60"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateIeltsScore) onUpdateIeltsScore(editedIelts);
                    setIsEditingIelts(false);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  保存考分
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedIelts(student.ieltsScore || '');
                    setIsEditingIelts(false);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-300 font-semibold block">当前雅思成绩:</span>
                  <span className="text-sm font-black text-emerald-300">
                    {student.ieltsScore ? `雅思 ${student.ieltsScore}` : '⚠️ 尚未填写考分'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingIelts(true)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{student.ieltsScore ? '更新雅思成绩' : '点击直接录入雅思'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tag presets for fast filling */}
        {isEditingIelts && (
          <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 flex-wrap text-xs relative z-10 animate-in fade-in duration-200">
            <span className="text-slate-400 text-[11px] font-bold">快捷选项填入:</span>
            {['雅思 6.0', '雅思 6.5', '雅思 7.0', '雅思 7.5 (单项6.5)', '雅思 8.0', '托福 100', '多邻国 125', '免语言证明'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setEditedIelts(preset)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500 rounded-md text-[11px] font-bold transition-all cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Target Schools Language Requirement Summary Comparison */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs relative z-10">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">各目标高校语言要求要求</span>
            <span className="font-bold text-emerald-300 text-xs">
              {(() => {
                const reqs = student.applications.map(a => `${a.schoolName}: ${a.languageRequirement || '未指定'}`);
                return reqs.length > 0 ? reqs.slice(0, 3).join(' | ') + (reqs.length > 3 ? '...' : '') : '目标院校暂未设定门槛';
              })()}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">语言要件状态诊断</span>
            <span className="font-extrabold text-xs">
              {student.ieltsScore ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 已具备考分 (用于多校网申要件)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> 缺要件考分，请点击上方“直接录入”
                </span>
              )}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">全维度同步保护</span>
            <span className="text-slate-300 text-[11px]">
              修改将即时同步至包含全员列表、导出表单与导师沟通大盘等全系统界面。
            </span>
          </div>
        </div>
      </div>

      {/* Add school form modal / section */}
      {showAddApp && (
        <form onSubmit={handleAddAppSubmit} className="bg-white border border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4" /> 添加新的申请院校及项目
            </span>
            <button 
              type="button" 
              onClick={() => setShowAddApp(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              取消
            </button>
          </div>

          {/* Quick template selector with Keyword Matching Search */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60 flex flex-col gap-3 no-print">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                ⚡ 智能专业方案匹配与一键导入
              </span>
              <p className="text-[10px] text-emerald-600/90 font-medium">
                输入关键字（如学校、专业或国家），系统将自动从后台匹配您保存过的专业方案，点选即可一键将该方案的整套材料与多轮截止日期导入学生志愿中。
              </p>
            </div>
            
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="🔍 输入关键字搜索方案（如：卡内基梅隆、CMU、CS、英国...）"
                  value={templateSearchKeyword}
                  onChange={(e) => {
                    setTemplateSearchKeyword(e.target.value);
                    setShowTemplateSuggestions(true);
                  }}
                  onFocus={() => setShowTemplateSuggestions(true)}
                  className="flex-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs placeholder-slate-400"
                />
                {templateSearchKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateSearchKeyword('');
                      setShowTemplateSuggestions(false);
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* Suggestions overlay */}
              {showTemplateSuggestions && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowTemplateSuggestions(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {(() => {
                      const filtered = applicationTemplates.filter(t => {
                        const kw = templateSearchKeyword.toLowerCase().trim();
                        if (!kw) return true; // show all when empty but focused
                        return (
                          t.templateName.toLowerCase().includes(kw) ||
                          t.schoolName.toLowerCase().includes(kw) ||
                          t.program.toLowerCase().includes(kw) ||
                          t.country.toLowerCase().includes(kw)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            未匹配到相关专业方案，您可以在下方手动输入并创建
                          </div>
                        );
                      }

                      return filtered.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setSchoolName(tpl.schoolName);
                            setProgram(tpl.program);
                            setCountry(tpl.country);
                            setLanguageRequirement(tpl.languageRequirement || '');
                            if (tpl.deadlines && tpl.deadlines.length > 0) {
                              setAddFormDeadlines(tpl.deadlines.map((d, i) => ({
                                id: d.id || String(i + 1),
                                roundName: d.roundName,
                                date: d.date
                              })));
                            }
                            setSelectedTemplateMaterials(tpl.materials || []);
                            setTemplateSearchKeyword(tpl.templateName);
                            setShowTemplateSuggestions(false);
                            
                            alert(`已匹配并成功载入专业方案：【${tpl.templateName}】！\n您可以直接在下方点击“增设目标院校”或微调信息后提交。`);
                          }}
                          className="w-full text-left p-2.5 hover:bg-emerald-50/50 transition-colors flex flex-col gap-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{tpl.templateName}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                              {tpl.country}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span>截止：{tpl.deadlines?.map(d => `${d.roundName}(${d.date})`).join(' | ') || '待设定'}</span>
                            {tpl.languageRequirement && (
                              <span className="text-emerald-600 font-bold">• 语言要求：{tpl.languageRequirement}</span>
                            )}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">目标院校名称</label>
              <input
                type="text"
                required
                placeholder="例如：哥伦比亚大学 (Columbia)"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">专业项目</label>
              <input
                type="text"
                required
                placeholder="例如：MSc in Data Science"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">国家 / 地区</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="美国">美国 (USA)</option>
                <option value="英国">英国 (UK)</option>
                <option value="新加坡">新加坡 (Singapore)</option>
                <option value="中国香港">中国香港 (Hong Kong)</option>
                <option value="中国澳门">中国澳门 (Macao)</option>
                <option value="澳大利亚">澳大利亚 (Australia)</option>
                <option value="加拿大">加拿大 (Canada)</option>
                <option value="新西兰">新西兰 (New Zealand)</option>
                <option value="意大利">意大利 (Italy)</option>
                <option value="欧洲">欧洲 (Europe)</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">语言成绩要求 (例如: 雅思 6.0)</label>
              <input
                type="text"
                placeholder="例如：雅思 6.0 或 7.0(6.0)"
                value={languageRequirement}
                onChange={(e) => setLanguageRequirement(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dynamic Multi-Round Deadlines Section */}
            <div className="md:col-span-4 bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-600" /> 网申截止轮次与日期 (支持增设多轮截止日)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextId = String(Date.now() + Math.random());
                    const nextRoundNum = addFormDeadlines.length + 1;
                    let nextRoundName = `第${nextRoundNum}轮`;
                    if (nextRoundNum === 2) nextRoundName = '第二轮';
                    else if (nextRoundNum === 3) nextRoundName = '第三轮';
                    else if (nextRoundNum === 4) nextRoundName = '最终轮';
                    setAddFormDeadlines([
                      ...addFormDeadlines,
                      { id: nextId, roundName: nextRoundName, date: '2026-12-15' }
                    ]);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> 增设一个截止轮次
                </button>
              </div>

              <div className="space-y-2">
                {addFormDeadlines.map((dl, idx) => (
                  <div key={dl.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs animate-in fade-in duration-200">
                    <span className="text-[10px] text-slate-400 font-extrabold px-1 shrink-0">轮次 #{idx + 1}</span>
                    
                    <div className="flex-1">
                      <select
                        value={roundOptions.includes(dl.roundName) ? dl.roundName : '自定义'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = [...addFormDeadlines];
                          updated[idx] = {
                            ...updated[idx],
                            roundName: val === '自定义' ? '' : val
                          };
                          setAddFormDeadlines(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-semibold"
                      >
                        {roundOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        <option value="自定义">自定义名称...</option>
                      </select>
                    </div>

                    {!roundOptions.includes(dl.roundName) && (
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="例如：第四轮 / 追加轮"
                          value={dl.roundName}
                          onChange={(e) => {
                            const updated = [...addFormDeadlines];
                            updated[idx] = { ...updated[idx], roundName: e.target.value };
                            setAddFormDeadlines(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        type="date"
                        required
                        value={dl.date}
                        onChange={(e) => {
                          const updated = [...addFormDeadlines];
                          updated[idx] = { ...updated[idx], date: e.target.value };
                          setAddFormDeadlines(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
                      />
                    </div>

                    {addFormDeadlines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddFormDeadlines(addFormDeadlines.filter(item => item.id !== dl.id));
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="删除该轮次"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              初始化院校与要件清单
            </button>
          </div>
        </form>
      )}

      {/* Student Universal Materials Card (Synced across all schools) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
        {/* Header banner */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">📂 学生通用申请材料进度管理 (多校共享)</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-8">
              简历、推荐信、学籍成绩单、评分标准、研究计划书等各校通用材料，在此处设置一次进度即可全局同步，无需多校重复录入。
            </p>
          </div>
        </div>

        {/* Materials Rows */}
        <div className="divide-y divide-slate-100">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            <div className="col-span-1 text-center">是否必需</div>
            <div className="col-span-3">申请材料名称</div>
            <div className="col-span-2">准备进度状态</div>
            <div className="col-span-2">反馈督办日期</div>
            <div className="col-span-4">通用材料备注及备忘</div>
          </div>
          
          {(student.globalMaterials || []).map((mat) => (
            <div 
              key={mat.id} 
              className={`grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-3.5 items-center transition-all ${
                mat.isRequired ? 'bg-white hover:bg-slate-50/40' : 'bg-slate-50/40 opacity-70'
              }`}
            >
              {/* Toggle Requirement */}
              <div className="col-span-1 flex justify-start lg:justify-center">
                <div className="flex items-center gap-2 lg:gap-0 lg:flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">是否必需:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onUpdateMaterial('', mat.id, { isRequired: true })}
                      className={`px-2.5 py-1 cursor-pointer transition-all ${
                        mat.isRequired 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-white text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      是
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateMaterial('', mat.id, { isRequired: false })}
                      className={`px-2.5 py-1 cursor-pointer transition-all ${
                        !mat.isRequired 
                          ? 'bg-slate-600 text-white' 
                          : 'bg-white text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      否
                    </button>
                  </div>
                </div>
              </div>

              {/* Material Name */}
              <div className="col-span-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${mat.isRequired ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>
                    {mat.name}
                  </span>
                  {!mat.isRequired && (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.1 rounded font-semibold">
                      可选
                    </span>
                  )}
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1 py-0.1 rounded font-bold border border-emerald-100">
                    通用
                  </span>
                </div>
              </div>

              {/* Preparation Status */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">准备状态:</span>
                  <select
                    disabled={!mat.isRequired}
                    value={mat.status}
                    onChange={(e) => onUpdateMaterial('', mat.id, { status: e.target.value as MaterialStatus })}
                    className={`w-full lg:w-auto bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 cursor-pointer ${
                      mat.status === '已完成' || mat.status === '已提交'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : mat.status === '待修改'
                        ? 'text-rose-700 bg-rose-50 border-rose-100'
                        : mat.status === '准备中'
                        ? 'text-amber-700 bg-amber-50 border-amber-100'
                        : 'text-slate-500'
                    }`}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback Due Date */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">反馈截至:</span>
                  <div className="relative w-full">
                    <input
                      disabled={!mat.isRequired}
                      type="date"
                      value={mat.feedbackDueDate}
                      onChange={(e) => onUpdateMaterial('', mat.id, { feedbackDueDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 cursor-pointer font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">要件备注:</span>
                  <input
                    disabled={!mat.isRequired}
                    type="text"
                    placeholder={mat.isRequired ? "输入备注或通用备忘..." : "（该材料非必需，无需录入备注）"}
                    value={mat.notes}
                    onChange={(e) => onUpdateMaterial('', mat.id, { notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* School accordion list */}
      <div className="space-y-4">
        {student.applications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <CheckSquare className="h-12 w-12 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-medium">该学生暂未增设任何目标院校。</p>
            <p className="text-xs text-slate-400 mt-1">请点击右上角 “增设目标院校” 开始规划申请目标！</p>
          </div>
        ) : (
          (() => {
            const sortedApps = sortSchoolApplications(student.applications);
            return sortedApps.map((app, index) => {
              const isExpanded = expandedAppId === app.id;
              const stats = getRequiredMaterialsStats(app);
              const isBeingDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div 
                  key={app.id} 
                  draggable={activeDragAppId === app.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(index));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedIndex(index);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setActiveDragAppId(null);
                    if (draggedIndex === null || draggedIndex === index) {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                      return;
                    }
                    
                    const list = [...sortedApps];
                    const [movedItem] = list.splice(draggedIndex, 1);
                    list.splice(index, 0, movedItem);

                    const reorderedApps = list.map((item, idx) => ({
                      ...item,
                      displayOrder: idx + 1
                    }));

                    if (onReorderApplications) {
                      onReorderApplications(reorderedApps);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setActiveDragAppId(null);
                  }}
                  className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                    isBeingDragged ? 'opacity-40 border-dashed border-emerald-400 bg-emerald-50/20' : ''
                  } ${
                    isDragOver 
                      ? 'border-2 border-emerald-500 scale-[1.01] shadow-md bg-emerald-50/30' 
                      : isExpanded ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Header bar of school container */}
                  <div 
                    onClick={() => toggleExpand(app.id)}
                    className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-grab active:cursor-grabbing shrink-0 transition-colors no-print"
                        title="按住此处六点图标拖拽卡片自由调整排序"
                        onMouseDown={() => setActiveDragAppId(app.id)}
                        onMouseUp={() => setActiveDragAppId(null)}
                        onTouchStart={() => setActiveDragAppId(app.id)}
                        onTouchEnd={() => setActiveDragAppId(null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span 
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-md font-mono shrink-0" 
                            title={`目标项目序号 (共 ${sortedApps.length} 个项目)`}
                          >
                            {index + 1}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-base">{app.schoolName}</h3>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                            {app.country}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                            {app.program}
                          </span>
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-black rounded-full">
                            语言要求: {app.languageRequirement || '未设定'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {(() => {
                              const rounds = app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                                { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                              ];
                              const activeIntended = (app.intendedRoundId && rounds.find(r => r.id === app.intendedRoundId)) ||
                                                     (app.intendedRoundName && rounds.find(r => r.roundName === app.intendedRoundName)) ||
                                                     rounds[0];

                              return rounds.map((dl, idx) => {
                                const isIntended = (activeIntended && dl.id === activeIntended.id) || (rounds.length === 1);
                                return (
                                  <span 
                                    key={dl.id || idx} 
                                    className={isIntended 
                                      ? "bg-amber-50 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1 shadow-2xs"
                                      : "bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium opacity-80"
                                    }
                                  >
                                    {isIntended && <Target className="h-3 w-3 text-amber-600 shrink-0" />}
                                    <span>{dl.roundName}：{formatDeadlineDate(dl.date)}</span>
                                    {isIntended && rounds.length > 1 && (
                                      <span className="text-[9px] font-black bg-amber-200/90 text-amber-900 px-1 rounded ml-0.5">拟申</span>
                                    )}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                      {/* Overall Progress percentage dial */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-bold">要件进度</div>
                          <div className="text-sm font-black text-emerald-600">{stats.percent}%</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center font-bold text-[10px] text-emerald-600 relative overflow-hidden">
                          <svg className="w-10 h-10 transform -rotate-90">
                            <circle cx="20" cy="20" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="2.5" />
                            <circle 
                              cx="20" 
                              cy="20" 
                              r="16" 
                              fill="transparent" 
                              stroke="#10b981" 
                              strokeWidth="2.5" 
                              strokeDasharray={`${2 * Math.PI * 16}`}
                              strokeDashoffset={`${2 * Math.PI * 16 * (1 - stats.percent / 100)}`}
                            />
                          </svg>
                          <span className="absolute font-black">{stats.percent}%</span>
                        </div>
                      </div>

                      {/* Expand/Collapse icons & trash */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveAsTemplate(app);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg text-[11px] font-black border border-emerald-200 hover:border-emerald-600 transition-all cursor-pointer no-print shadow-xs"
                          title="将此院校、专业、截止日与所需材料要件保存为模板，可在后续添加其他学校时一键导入，免去重复配置的繁琐"
                        >
                          <Bookmark className="h-3 w-3 shrink-0" />
                          <span className="hidden md:inline">存为常用方案</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteAppId(app.id);
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="删除该院校申请"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(app.id);
                          }}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-extrabold text-xs text-slate-500 hover:text-emerald-700"
                          title={isExpanded ? "点击收起该院校所有详情" : "点击展开查看及修改详情要件"}
                        >
                          <span className="text-[11px] font-bold hidden sm:inline">{isExpanded ? '收起' : '展开详情'}</span>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-emerald-600" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                {/* Expanded Materials Checklist Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/20 p-5 space-y-4 animate-in fade-in duration-200">
                    {/* Preset bar & Application state controls */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wide shrink-0">申请状态:</span>
                          <select
                            value={app.status}
                            onChange={(e) => onUpdateApplicationStatus(app.id, e.target.value as ApplicationStatus)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {appStatusOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                          <span className="font-bold text-slate-400 uppercase tracking-wide shrink-0">语言要求:</span>
                          <input
                            type="text"
                            value={app.languageRequirement || ''}
                            onChange={(e) => {
                              onUpdateApplicationDetails(app.id, {
                                languageRequirement: e.target.value
                              });
                            }}
                            placeholder="例如：雅思 6.0"
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 w-36"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wide">要件一键预设:</span>
                        <button
                          type="button"
                          onClick={() => applyPresetRequired(app.id, 'all')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 cursor-pointer"
                        >
                          全部设为必需
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetRequired(app.id, 'academic')}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 cursor-pointer"
                          title="自动排除作品集与小视频等创意性材料"
                        >
                          传统文理科要件(免作品/视频)
                        </button>
                      </div>
                    </div>

                    {/* Multiple Admission Rounds Editing Section */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-slate-700 text-xs">网申截止多轮次管理</span>
                          <span className="text-[10px] text-slate-400 font-medium">(可在此编辑或增设多轮网申截止日)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const currentDeadlines = app.deadlines || [
                              { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                            ];
                            const nextRoundNum = currentDeadlines.length + 1;
                            let nextRoundName = `第${nextRoundNum}轮`;
                            if (nextRoundNum === 2) nextRoundName = '第二轮';
                            else if (nextRoundNum === 3) nextRoundName = '第三轮';
                            else if (nextRoundNum === 4) nextRoundName = '最终轮';

                            const newRound = {
                              id: String(Date.now() + Math.random()),
                              roundName: nextRoundName,
                              date: app.deadline || '2026-12-15'
                            };
                            const updatedDeadlines = [...currentDeadlines, newRound];
                            onUpdateApplicationDetails(app.id, {
                              deadlines: updatedDeadlines,
                              deadlineRound: updatedDeadlines[0]?.roundName,
                              deadline: updatedDeadlines[0]?.date
                            });
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-600 hover:text-emerald-500 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Plus className="h-3 w-3" /> 新增截止轮次
                        </button>
                      </div>

                      {/* Selector bar for Intended Application Round */}
                      <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 text-amber-800 rounded shrink-0">
                            <Target className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-amber-950 text-xs block">学生预计申请轮次 (拟申目标)：</span>
                            <span className="text-[10px] text-amber-800 font-medium">标注后将在汇总报告中突出显示该项目拟申轮次及对应截止日</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={(() => {
                              const rounds = app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                                { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                              ];
                              const match = (app.intendedRoundId && rounds.find(r => r.id === app.intendedRoundId)) ||
                                            (app.intendedRoundName && rounds.find(r => r.roundName === app.intendedRoundName)) ||
                                            rounds[0];
                              return match?.id || '1';
                            })()}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const currentDeadlines = app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                                { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                              ];
                              const matched = currentDeadlines.find(d => d.id === selId);
                              onUpdateApplicationDetails(app.id, {
                                intendedRoundId: selId,
                                intendedRoundName: matched?.roundName || ''
                              });
                            }}
                            className="bg-white border border-amber-300 text-amber-950 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                          >
                            {(app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                              { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                            ]).map((dl, idx) => (
                              <option key={dl.id || idx} value={dl.id}>
                                🎯 {dl.roundName} (截止: {formatDeadlineDate(dl.date)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                          { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                        ]).map((dl, idx) => {
                          const currentDeadlines = app.deadlines || [
                            { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                          ];
                          const activeIntendedId = app.intendedRoundId || (app.intendedRoundName && currentDeadlines.find(r => r.roundName === app.intendedRoundName)?.id) || currentDeadlines[0]?.id;
                          const isIntended = dl.id === activeIntendedId || (currentDeadlines.length === 1);

                          return (
                            <div key={dl.id || idx} className={`bg-white border rounded-lg p-3 shadow-xs space-y-2.5 ${isIntended ? 'border-amber-300 ring-1 ring-amber-200/80 bg-amber-50/20' : 'border-slate-200/60'}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-extrabold">第 {idx + 1} 个轮次</span>
                                  {isIntended && (
                                    <span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                      <Target className="h-2.5 w-2.5 text-amber-600" />
                                      拟申目标
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {!isIntended && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateApplicationDetails(app.id, {
                                          intendedRoundId: dl.id,
                                          intendedRoundName: dl.roundName
                                        });
                                      }}
                                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                    >
                                      设为拟申
                                    </button>
                                  )}
                                  {currentDeadlines.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedDeadlines = currentDeadlines.filter(item => item.id !== dl.id && (item.id || String(idx)) !== String(idx));
                                        const newIntendedId = app.intendedRoundId === dl.id ? updatedDeadlines[0]?.id : app.intendedRoundId;
                                        const newIntendedName = app.intendedRoundId === dl.id ? updatedDeadlines[0]?.roundName : app.intendedRoundName;
                                        onUpdateApplicationDetails(app.id, {
                                          deadlines: updatedDeadlines,
                                          deadlineRound: updatedDeadlines[0]?.roundName || '第一轮',
                                          deadline: updatedDeadlines[0]?.date || '2026-12-15',
                                          intendedRoundId: newIntendedId,
                                          intendedRoundName: newIntendedName
                                        });
                                      }}
                                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> 移除
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 shrink-0 w-12 text-right">轮次名称:</span>
                                  <input
                                    type="text"
                                    value={dl.roundName}
                                    onChange={(e) => {
                                      const updatedDeadlines = currentDeadlines.map(item => {
                                        if (item.id === dl.id) {
                                          return { ...item, roundName: e.target.value };
                                        }
                                        return item;
                                      });
                                      onUpdateApplicationDetails(app.id, {
                                        deadlines: updatedDeadlines,
                                        deadlineRound: updatedDeadlines[0]?.roundName,
                                        deadline: updatedDeadlines[0]?.date
                                      });
                                    }}
                                    placeholder="例如：第一轮"
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 w-full"
                                  />
                                </div>
                                
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 shrink-0 w-12 text-right">截止日期:</span>
                                    <input
                                      type="date"
                                      value={dl.date}
                                      onChange={(e) => {
                                        const updatedDeadlines = currentDeadlines.map(item => {
                                          if (item.id === dl.id) {
                                            return { ...item, date: e.target.value };
                                          }
                                          return item;
                                        });
                                        onUpdateApplicationDetails(app.id, {
                                          deadlines: updatedDeadlines,
                                          deadlineRound: updatedDeadlines[0]?.roundName,
                                          deadline: updatedDeadlines[0]?.date
                                        });
                                      }}
                                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 w-full cursor-pointer"
                                    />
                                  </div>
                                  {dl.date && formatDeadlineDate(dl.date).includes('去年截止日期参考') && (
                                    <span className="text-[10px] text-rose-500 font-black pl-13 mt-1 text-left">
                                      ⚠️ 自动标注：去年截止日期参考
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Materials Rows */}
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
                      {/* Header title */}
                      <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <div className="col-span-1 text-center">是否必需</div>
                        <div className="col-span-3">申请材料名称</div>
                        <div className="col-span-2">准备进度状态</div>
                        <div className="col-span-2">反馈督办日期</div>
                        <div className="col-span-4">备注及审核意见 (例：推荐人同意状态/大纲修订等)</div>
                      </div>

                      {/* Data rows */}
                      {app.materials.map((mat) => (
                        <div 
                          key={mat.id} 
                          className={`grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-3.5 items-center transition-all ${
                            mat.isRequired ? 'bg-white' : 'bg-slate-50/40 opacity-70'
                          }`}
                        >
                          {/* 1. Toggle Requirement */}
                          <div className="col-span-1 flex justify-start lg:justify-center">
                            <div className="flex items-center gap-2 lg:gap-0 lg:flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">是否必需:</span>
                              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => onUpdateMaterial(app.id, mat.id, { isRequired: true })}
                                  className={`px-2.5 py-1 cursor-pointer transition-all ${
                                    mat.isRequired 
                                      ? 'bg-emerald-600 text-white' 
                                      : 'bg-white text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  是
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateMaterial(app.id, mat.id, { isRequired: false })}
                                  className={`px-2.5 py-1 cursor-pointer transition-all ${
                                    !mat.isRequired 
                                      ? 'bg-slate-600 text-white' 
                                      : 'bg-white text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  否
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 2. Material Name */}
                          <div className="col-span-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${mat.isRequired ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>
                                {mat.name}
                              </span>
                              {!mat.isRequired && (
                                <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.1 rounded font-semibold">
                                  可选
                                </span>
                              )}
                            </div>
                            
                            {/* If Portfolio is required, show the multiple rounds settings */}
                            {mat.id === 'portfolio' && mat.isRequired && (
                              <div className="bg-emerald-50/60 rounded-lg p-2 border border-emerald-100/50 space-y-1.5 text-[10px] animate-in fade-in duration-200">
                                <div className="font-extrabold text-emerald-800 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-emerald-600" /> 作品集特设截止轮次
                                </div>
                                <div className="space-y-1">
                                  {/* Select Round */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-bold">提交轮次:</span>
                                    <select
                                      value={['第一轮', '第二轮', '第三轮', 'EA/ED', '常规轮'].includes(mat.portfolioRound || '') ? (mat.portfolioRound || '第一轮') : '自定义'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '自定义') {
                                          onUpdateMaterial(app.id, mat.id, { portfolioRound: '其他轮次' });
                                        } else {
                                          onUpdateMaterial(app.id, mat.id, { portfolioRound: val });
                                        }
                                      }}
                                      className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                                    >
                                      <option value="第一轮">第一轮作品集</option>
                                      <option value="第二轮">第二轮作品集</option>
                                      <option value="第三轮">第三轮作品集</option>
                                      <option value="EA/ED">EA/ED早申作品集</option>
                                      <option value="常规轮">常规轮作品集</option>
                                      <option value="自定义">自定义...</option>
                                    </select>
                                  </div>
                                  
                                  {/* Custom text input if custom chosen */}
                                  {!['第一轮', '第二轮', '第三轮', 'EA/ED', '常规轮'].includes(mat.portfolioRound || '') && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500 font-bold">自定义轮:</span>
                                      <input
                                        type="text"
                                        value={mat.portfolioRound || ''}
                                        onChange={(e) => onUpdateMaterial(app.id, mat.id, { portfolioRound: e.target.value })}
                                        placeholder="例：加轮/特殊轮"
                                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 w-24"
                                      />
                                    </div>
                                  )}

                                  {/* Date Input */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-bold">截止日期:</span>
                                    <input
                                      type="date"
                                      value={mat.portfolioDeadline || ''}
                                      onChange={(e) => onUpdateMaterial(app.id, mat.id, { portfolioDeadline: e.target.value })}
                                      className="bg-white border border-slate-200 rounded px-1 py-0.1 text-[10px] text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3. Preparation Status */}
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">准备状态:</span>
                              <select
                                disabled={!mat.isRequired}
                                value={mat.status}
                                onChange={(e) => onUpdateMaterial(app.id, mat.id, { status: e.target.value as MaterialStatus })}
                                className={`w-full lg:w-auto bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 ${
                                  mat.status === '已完成' || mat.status === '已提交'
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                    : mat.status === '待修改'
                                    ? 'text-rose-700 bg-rose-50 border-rose-100'
                                    : mat.status === '准备中'
                                    ? 'text-amber-700 bg-amber-50 border-amber-100'
                                    : 'text-slate-500'
                                }`}
                              >
                                {statusOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 4. Feedback Due Date */}
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">反馈截至:</span>
                              <div className="relative w-full">
                                <input
                                  disabled={!mat.isRequired}
                                  type="date"
                                  value={mat.feedbackDueDate}
                                  onChange={(e) => onUpdateMaterial(app.id, mat.id, { feedbackDueDate: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 5. Notes */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block lg:hidden">要件备注:</span>
                              <input
                                disabled={!mat.isRequired}
                                type="text"
                                placeholder={mat.isRequired ? "输入备注或催办细节..." : "（该材料非必需，无需录入备注）"}
                                value={mat.notes}
                                onChange={(e) => onUpdateMaterial(app.id, mat.id, { notes: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 placeholder-slate-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom collapse button for convenient closing after viewing/editing */}
                    <div className="flex justify-center pt-2 pb-1 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => toggleExpand(app.id)}
                        className="px-4 py-2 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                      >
                        <ChevronUp className="h-4 w-4 text-emerald-600" />
                        <span>收起【{app.schoolName}】的展开详情</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
      </div>

      {/* Custom Application Deletion Confirmation Modal */}
      {confirmingDeleteAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认移除目标高校？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              确定要从当前规划中移除 <span className="text-rose-600 font-extrabold">{student.applications.find(a => a.id === confirmingDeleteAppId)?.schoolName}</span> 的申请计划吗？此学校对应的所有专业方向、截止时间、及专属材料要件进度都将被清除。此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmingDeleteAppId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmingDeleteAppId) {
                    onDeleteApplication(confirmingDeleteAppId);
                    setConfirmingDeleteAppId(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
