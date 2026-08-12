/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, SchoolApplication, formatDeadlineDate } from '../types';
import { sortSchoolApplications } from '../utils/sorting';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Award,
  BookOpen,
  FolderDot,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { exportElementToJpg, exportElementToPdf } from '../lib/exportUtils';
import { NON_GENERAL_MATERIAL_IDS } from '../utils/materials';

interface ReportsViewProps {
  students: Student[];
  selectedStudentId?: string;
  onSelectStudent?: (id: string) => void;
}

export default function ReportsView({ students, selectedStudentId: propSelectedStudentId, onSelectStudent }: ReportsViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(propSelectedStudentId || students[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingJPG, setIsExportingJPG] = useState(false);
  const [isExportingTableJPG, setIsExportingTableJPG] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  React.useEffect(() => {
    if (propSelectedStudentId) {
      setSelectedStudentId(propSelectedStudentId);
    }
  }, [propSelectedStudentId]);

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    onSelectStudent?.(id);
  };

  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Helper to determine QS rank for sorting from high to low
  const getQsRank = (schoolName: string): number => {
    if (!schoolName) return 999;
    const name = schoolName.toLowerCase();

    // Check direct bracket or number matches e.g. #8 or QS15 or QS 20 or (QS 25)
    const directMatch = schoolName.match(/(?:qs|#)\s*(\d+)/i);
    if (directMatch) {
      const parsed = parseInt(directMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000) return parsed;
    }

    if (name.includes('麻省理工') || name.includes('mit')) return 1;
    if (name.includes('帝国理工') || name.includes('imperial')) return 2;
    if (name.includes('牛津') || name.includes('oxford')) return 3;
    if (name.includes('哈佛') || name.includes('harvard')) return 4;
    if (name.includes('剑桥') || name.includes('cambridge')) return 5;
    if (name.includes('斯坦福') || name.includes('stanford')) return 6;
    if (name.includes('苏黎世联邦') || name.includes('eth')) return 7;
    if (name.includes('新加坡国立') || name.includes('nus') || name.includes('national university of singapore')) return 8;
    if (name.includes('伦敦大学学院') || name.includes('ucl')) return 9;
    if (name.includes('加州理工') || name.includes('caltech')) return 10;
    if (name.includes('宾夕法尼亚') || name.includes('upenn') || name.includes('penn')) return 11;
    if (name.includes('加州伯克利') || name.includes('berkeley')) return 12;
    if (name.includes('墨尔本') || name.includes('melbourne')) return 13;
    if (name.includes('南洋理工') || name.includes('ntu') || name.includes('nanyang')) return 15;
    if (name.includes('康奈尔') || name.includes('cornell')) return 16;
    if (name.includes('香港大学') || name.includes('hku') || name.includes('university of hong kong')) return 17;
    if (name.includes('悉尼') || name.includes('sydney')) return 18;
    if (name.includes('新南威尔士') || name.includes('unsw')) return 19;
    if (name.includes('普林斯顿') || name.includes('princeton')) return 22;
    if (name.includes('耶鲁') || name.includes('yale')) return 23;
    if (name.includes('爱丁堡') || name.includes('edinburgh')) return 27;
    if (name.includes('卡内基梅隆') || name.includes('cmu') || name.includes('carnegie')) return 28;
    if (name.includes('慕尼黑工业') || name.includes('tum')) return 28;
    if (name.includes('曼彻斯特') || name.includes('manchester')) return 34;
    if (name.includes('香港中文') || name.includes('cuhk')) return 36;
    if (name.includes('国王学院') || name.includes('kcl') || name.includes("king's college")) return 40;
    if (name.includes('香港科技') || name.includes('hkust')) return 47;
    if (name.includes('伦敦政治经济') || name.includes('lse')) return 50;
    if (name.includes('香港理工') || name.includes('polyu')) return 57;
    if (name.includes('米兰理工') || name.includes('politecnico di milano')) return 111;
    if (name.includes('南加州') || name.includes('usc') || name.includes('southern california')) return 116;
    if (name.includes('皇家艺术') || name.includes('rca') || name.includes('royal college of art')) return 1; // Art & Design Rank #1
    if (name.includes('伦敦艺术') || name.includes('ual') || name.includes('arts london')) return 2; // Art & Design Rank #2
    if (name.includes('帕森斯') || name.includes('parsons')) return 3;
    if (name.includes('罗德岛') || name.includes('risd')) return 4;
    if (name.includes('澳门大学') || name.includes('macau')) return 245;

    return 999;
  };

  // Helper: Get application status badge style
  const getAppStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case '已录取':
        return 'text-emerald-800 bg-emerald-100/90 border-emerald-300 font-black';
      case '已提交':
        return 'text-blue-800 bg-blue-100/90 border-blue-300 font-black';
      case '面试中':
        return 'text-purple-800 bg-purple-100/90 border-purple-300 font-black';
      case '材料准备中':
        return 'text-amber-800 bg-amber-100/90 border-amber-300 font-bold';
      case '被拒绝':
        return 'text-rose-800 bg-rose-100/90 border-rose-300 font-black';
      case '待定':
        return 'text-indigo-800 bg-indigo-100/90 border-indigo-300 font-bold';
      case '未开始':
      default:
        return 'text-slate-700 bg-slate-100 border-slate-300 font-medium';
    }
  };

  // Helper: calculate metrics (strictly targeting required non-general materials for this specific application/program)
  const getRequiredMaterialsStats = (student: Student, app: SchoolApplication) => {
    const materials = app.materials || [];
    const required = materials.filter(m => NON_GENERAL_MATERIAL_IDS.includes(m.id) && m.isRequired);
    const completed = required.filter(m => m.status === '已完成' || m.status === '已提交');
    const percent = required.length === 0 ? 0 : Math.round((completed.length / required.length) * 100);
    return {
      total: required.length,
      completed: completed.length,
      percent
    };
  };

  const getOverallStudentMaterialsStats = (student: Student) => {
    const globalReq = (student.globalMaterials || []).filter(m => m.isRequired);
    const globalDone = globalReq.filter(m => m.status === '已完成' || m.status === '已提交');

    let appReqCount = 0;
    let appDoneCount = 0;

    (student.applications || []).forEach(app => {
      const req = (app.materials || []).filter(m => NON_GENERAL_MATERIAL_IDS.includes(m.id) && m.isRequired);
      appReqCount += req.length;
      appDoneCount += req.filter(m => m.status === '已完成' || m.status === '已提交').length;
    });

    const totalRequired = globalReq.length + appReqCount;
    const totalCompleted = globalDone.length + appDoneCount;
    const percent = totalRequired === 0 ? 0 : Math.round((totalCompleted / totalRequired) * 100);

    return {
      globalRequired: globalReq.length,
      globalCompleted: globalDone.length,
      appRequired: appReqCount,
      appCompleted: appDoneCount,
      totalRequired,
      totalCompleted,
      percent
    };
  };

  const getOverallStudentProgress = (student: Student) => {
    return getOverallStudentMaterialsStats(student).percent;
  };

  // CSV Exporter
  const handleExportCSV = () => {
    // UTF-8 BOM for Excel Chinese compatibility
    let csvContent = '\uFEFF';
    csvContent += '学生姓名,目标批次,现有雅思,目标专业,申请院校,国家地区,申请项目,语言要求,预计拟申轮次,拟申轮次截止日,全部分轮次清单,作品集轮次,作品集截止日期,申请总体状态,要件总数,已完成要件数,要件百分比进度,关键备注\n';

    students.forEach((student) => {
      const sortedApps = sortSchoolApplications(student.applications || []);

      sortedApps.forEach((app, appIdx) => {
        const stats = getRequiredMaterialsStats(student, app);
        
        // Collate material summaries to put into the notes column
        const allMaterials = [
          ...(app.materials || []),
          ...(student.globalMaterials || [])
        ];
        const criticalOutstanding = allMaterials
          .filter(m => m.isRequired && m.status !== '已完成' && m.status !== '已提交')
          .map(m => `${m.name}(${m.status})`)
          .join('; ');

        const portfolioItem = allMaterials.find(m => m.id === 'portfolio');
        const portfolioRound = portfolioItem?.portfolioRound || '';
        const portfolioDeadline = portfolioItem?.portfolioDeadline || '';

        const rounds = app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
          { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
        ];
        const intendedDl = rounds.find(d => d.id === app.intendedRoundId) 
          || rounds.find(d => d.roundName === app.intendedRoundName) 
          || rounds[0];

        const intendedRoundNameStr = intendedDl ? intendedDl.roundName : '第一轮';
        const intendedRoundDateStr = intendedDl ? formatDeadlineDate(intendedDl.date) : '';

        const allDeadlinesStr = rounds.map(d => `${d.roundName}:${formatDeadlineDate(d.date)}`).join('; ');

        const row = [
          student.name,
          student.targetDegree,
          student.ieltsScore || '未录入',
          student.targetMajor,
          `${appIdx + 1}. ${app.schoolName}`,
          app.country,
          app.program,
          app.languageRequirement || '未设定',
          intendedRoundNameStr,
          intendedRoundDateStr,
          allDeadlinesStr,
          portfolioRound,
          portfolioDeadline,
          app.status,
          stats.total,
          stats.completed,
          `${stats.percent}%`,
          criticalOutstanding ? `未完备材料: ${criticalOutstanding}` : '全部要件已备齐'
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');

        csvContent += row + '\n';
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `海外留学网申申请材料进度汇总表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Invoke Native Print Setup
  const handlePrint = () => {
    window.print();
  };

  // Export Individual Student Progress Report Card to High-Res JPG Image
  const handleExportJPG = async () => {
    if (!currentStudent) return;
    setIsExportingJPG(true);
    await new Promise((r) => setTimeout(r, 60));

    const success = await exportElementToJpg(
      'print-area',
      `【留学材料进度汇总报告】${currentStudent.name}_${currentStudent.targetMajor}.jpg`
    );
    if (!success) {
      alert('导出JPG图片失败，请稍后重试');
    }
    setIsExportingJPG(false);
  };

  // Export Overall Matrix Table to High-Res JPG Image
  const handleExportTableJPG = async () => {
    setIsExportingTableJPG(true);
    await new Promise((r) => setTimeout(r, 60));

    const success = await exportElementToJpg(
      'overview-table-area',
      `【全员网申材料进度大盘汇总】_${new Date().toISOString().slice(0, 10)}.jpg`
    );
    if (!success) {
      alert('导出大盘图片失败，请稍后重试');
    }
    setIsExportingTableJPG(false);
  };

  // High-fidelity Client-side PDF Exporter using html2pdf.js
  const handleExportPDF = async () => {
    if (!currentStudent) return;
    setIsExportingPDF(true);
    await new Promise((r) => setTimeout(r, 60));

    const success = await exportElementToPdf(
      'print-area',
      `【留学进度报告】${currentStudent.name}_${currentStudent.targetMajor}.pdf`
    );
    if (!success) {
      window.print();
    }
    setIsExportingPDF(false);
  };

  // Filter students for the overview table
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.targetMajor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Print styles override (non-intrusive) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            font-size: 12px;
          }
          /* Hide interactive/editing buttons during print */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">申请材料汇总与报告导出</h2>
          <p className="text-xs text-slate-500 font-medium">一键导出单人精细化督学JPG图片发给学生与家长，或导出全员大盘CSV/表格图片</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportTableJPG}
            disabled={isExportingTableJPG}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="把大盘表格导出为一张清晰的JPG图片"
          >
            {isExportingTableJPG ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            )}
            {isExportingTableJPG ? '生成图片中...' : '导出全员大盘图片 (.JPG)'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            导出全员网申汇总表 (.CSV)
          </button>
        </div>
      </div>

      {/* Summary Matrix of All Students */}
      <div id="overview-table-area" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> 全体学生网申要件大盘汇总
          </h3>

          {/* Table Search */}
          <div className="relative no-print">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索学生姓名 / 专业..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">学生姓名</th>
                <th className="px-4 py-3">目标批次</th>
                <th className="px-4 py-3">目标专业</th>
                <th className="px-4 py-3">现有雅思</th>
                <th className="px-4 py-3 text-center">院校数量</th>
                <th className="px-4 py-3">申请材料完成进度</th>
                <th className="px-4 py-3">核心进度评级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">暂无匹配学生数据</td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const stats = getOverallStudentMaterialsStats(s);
                  const progress = stats.percent;
                  let rating = '落后 (加紧办理)';
                  let ratingClass = 'text-rose-600 bg-rose-50 border-rose-100';
                  
                  if (progress >= 85) {
                    rating = '卓越 (已就绪)';
                    ratingClass = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                  } else if (progress >= 50) {
                    rating = '稳步进行中';
                    ratingClass = 'text-teal-700 bg-teal-50 border-teal-100';
                  } else if (progress >= 25) {
                    rating = '起步较慢 (待催促)';
                    ratingClass = 'text-amber-700 bg-amber-50 border-amber-100';
                  }

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{s.targetDegree}</td>
                      <td className="px-4 py-3.5 text-slate-500">{s.targetMajor}</td>
                      <td className="px-4 py-3.5 text-rose-600 font-black">{s.ieltsScore || '未录入'}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                        <div>{s.applications.length} 所</div>
                        {s.applications.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1">
                            {Array.from(new Set(s.applications.map(a => a.status || '未开始'))).map(st => {
                              const count = s.applications.filter(a => (a.status || '未开始') === st).length;
                              return (
                                <span key={st} className={`text-[9px] px-1.5 py-0.2 rounded border ${getAppStatusBadgeStyle(st)}`}>
                                  {st} {count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="font-bold text-slate-800">{progress}%</span>
                          <span className="text-[10px] text-slate-400 font-mono">({stats.totalCompleted}/{stats.totalRequired})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 border rounded text-[10px] font-bold ${ratingClass}`}>
                          {rating}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Report Card Print preview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-emerald-600" /> 单人精细化留学督查报告单
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">预览并可直接打印以下专属材料分析页面（带有导师亲笔评估）</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} - 专属报告</option>
              ))}
            </select>

            <button
              onClick={handleExportJPG}
              disabled={isExportingJPG}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
              title="生成此学生的实时材料进度报告图片，方便直接发给学生或微信群"
            >
              {isExportingJPG ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-emerald-200" />
              )}
              {isExportingJPG ? '正在生成图片...' : '一键导出JPG图片'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
            >
              {isExportingPDF ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-slate-300" />
              )}
              {isExportingPDF ? '生成PDF中...' : '导出PDF报告'}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer shrink-0"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              网页打印
            </button>
          </div>
        </div>

        {/* Printable Section Wrapper */}
        {currentStudent ? (
          <div 
            id="print-area" 
            className="p-8 bg-white border border-slate-100 rounded-xl max-w-4xl mx-auto text-slate-800"
          >
            {/* Report Header (Print) */}
            <div className="text-center space-y-2 border-b-2 border-double border-slate-200 pb-6">
              <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">OFFICIAL PROGRESS REVIEW SUMMARY</div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">留学网申材料进度督导报告</h1>
              <p className="text-xs text-slate-500">
                日期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Student metadata info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-slate-100">
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">学生基本档案</span>
                <div>
                  <p className="font-extrabold text-base text-slate-900">{currentStudent.name}</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">{currentStudent.targetDegree}</p>
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50/70 px-2 py-0.5 rounded border border-rose-100 inline-block">
                    雅思成绩: {currentStudent.ieltsScore || '待录入'}
                  </span>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">申请专业</span>
                <p className="font-extrabold text-sm text-slate-900 truncate" title={currentStudent.targetMajor}>
                  {currentStudent.targetMajor}
                </p>
                <p className="text-xs text-slate-500">规划院校: {currentStudent.applications.length} 所</p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">申请材料完成进度</span>
                {(() => {
                  const stats = getOverallStudentMaterialsStats(currentStudent);
                  return (
                    <>
                      <div className="flex items-baseline justify-between pt-0.5">
                        <p className="font-extrabold text-base text-emerald-600">{stats.percent}%</p>
                        <span className="text-[11px] font-bold text-slate-700 font-mono">
                          已完成 {stats.totalCompleted} / {stats.totalRequired} 项
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all" 
                          style={{ width: `${stats.percent}%` }} 
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium pt-1">
                        通用材料 {stats.globalCompleted}/{stats.globalRequired} • 定制要件 {stats.appCompleted}/{stats.appRequired}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 通用材料板块 (Universal/Global Materials Section) */}
            <div className="py-6 border-b border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-l-4 border-emerald-600 pl-2.5 flex items-center gap-1.5">
                <FolderDot className="h-4.5 w-4.5 text-emerald-600" />
                通用申请材料汇总板块（简历、推荐信、中英文成绩单等通用要件）
              </h3>
              <p className="text-[10px] text-slate-400 -mt-2 font-medium pl-3">这些材料适用于该生申请的所有高校和专业</p>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white p-2">
                <table className="w-full text-left text-[11px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                      <th className="py-2 px-2.5 w-[30%]">通用材料名称</th>
                      <th className="py-2 px-2.5 w-[18%]">当前进度</th>
                      <th className="py-2 px-2.5 w-[20%]">反馈督办限期</th>
                      <th className="py-2 px-2.5 w-[32%]">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {currentStudent.globalMaterials && currentStudent.globalMaterials.filter(m => m.isRequired).length > 0 ? (
                      currentStudent.globalMaterials.filter(m => m.isRequired).map((mat) => (
                        <tr key={mat.id} className="bg-white hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 font-bold">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{mat.name}</span>
                              <span className="export-badge text-[10px] px-1.5 py-0.5 font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100 align-middle">
                                通用
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2.5">
                            <span className={`export-badge px-2 py-0.5 rounded font-bold text-[10px] align-middle ${
                              mat.status === '已完成' || mat.status === '已提交'
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                : mat.status === '待修改'
                                ? 'text-rose-700 bg-rose-50 border border-rose-200/60'
                                : mat.status === '准备中'
                                ? 'text-amber-700 bg-amber-50 border border-amber-200/60'
                                : 'text-slate-500 bg-slate-100 border border-slate-200/60'
                            }`}>
                              {mat.status}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-500">{mat.feedbackDueDate || '—'}</td>
                          <td className="py-2 px-2.5 max-w-xs break-words" title={mat.notes}>{mat.notes || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 italic">暂无必需通用材料记录</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* School Application Breakdown details */}
            <div className="py-6 space-y-6">
              <h3 className="font-bold text-slate-900 text-sm border-l-4 border-emerald-600 pl-2.5 mb-4 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  报考目标院校及非通用项目定制材料
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  共计申请 {currentStudent.applications.length} 个专业/院校项目
                </span>
              </h3>

              {currentStudent.applications.length === 0 ? (
                <p className="text-xs text-slate-400 italic">该学生暂无录入任何申请计划。</p>
              ) : (
                (() => {
                  const sortedApps = sortSchoolApplications(currentStudent.applications);

                  return sortedApps.map((app, appIdx) => {
                    const stats = getRequiredMaterialsStats(currentStudent, app);
                    const rank = getQsRank(app.schoolName);

                    return (
                      <div key={app.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded font-mono shrink-0" title={`申请顺序第 ${appIdx + 1} 个`}>
                                {appIdx + 1}
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {app.schoolName.replace(/\s*[\(\（\[\【]?通用[\)\）\]\】]?/g, '').trim()}
                              </span>
                              {app.country && !['通用', '通用国家', '通用项目', '通用要件'].includes(app.country.trim()) && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">
                                  {app.country}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-[10px] rounded border ${getAppStatusBadgeStyle(app.status)}`}>
                                申请状态: {app.status || '未开始'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">专业: {app.program}</span>
                              <span className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-bold">语言要求: {app.languageRequirement || '未设定'}</span>
                            </p>
                          </div>

                        <div className="text-right text-xs shrink-0">
                          <div className="font-bold text-slate-800 space-y-1">
                            {(() => {
                              const rounds = app.deadlines && app.deadlines.length > 0 ? app.deadlines : [
                                { id: '1', roundName: app.deadlineRound || '第一轮', date: app.deadline }
                              ];
                              const intendedDl = (app.intendedRoundId && rounds.find(r => r.id === app.intendedRoundId)) ||
                                                 (app.intendedRoundName && rounds.find(r => r.roundName === app.intendedRoundName)) ||
                                                 rounds[0];

                              return rounds.map((dl, idx) => {
                                const isIntended = (intendedDl && dl.id === intendedDl.id) || (rounds.length === 1);
                                return (
                                  <div 
                                    key={dl.id || idx}
                                    className={`flex items-center justify-end gap-1.5 ${
                                      isIntended ? 'text-amber-950 font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-500 font-normal'
                                    }`}
                                  >
                                    {isIntended && (
                                      <span className="bg-amber-200/90 text-amber-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                        拟申目标
                                      </span>
                                    )}
                                    <span>{dl.roundName}截止:</span>
                                    <span className="font-mono">{formatDeadlineDate(dl.date)}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          <p className="text-[10px] font-black text-emerald-600 mt-1.5">
                            校本/专属要件：{(app.materials || []).filter(m => NON_GENERAL_MATERIAL_IDS.includes(m.id) && m.isRequired).length} 项
                          </p>
                        </div>
                      </div>

                      {/* Materials List table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse table-fixed">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                              <th className="py-1.5 px-2 w-[30%]">非通用材料 (针对该专业)</th>
                              <th className="py-1.5 px-2 w-[18%]">当前进度</th>
                              <th className="py-1.5 px-2 w-[20%]">反馈督办限期</th>
                              <th className="py-1.5 px-2 w-[32%]">备注</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {(() => {
                              const nonGeneralRequired = (app.materials || []).filter(
                                m => NON_GENERAL_MATERIAL_IDS.includes(m.id) && m.isRequired
                              );

                              if (nonGeneralRequired.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">暂无针对该高校专业的必需非通用材料</td>
                                  </tr>
                                );
                              }

                              return nonGeneralRequired.map((mat) => (
                                <tr key={mat.id} className="bg-white hover:bg-slate-50/50">
                                  <td className="py-2 px-2 font-bold">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{mat.name}</span>
                                      {mat.id === 'portfolio' && mat.portfolioDeadline && (
                                        <span className="text-[9px] text-emerald-600 font-medium block">
                                          ({mat.portfolioRound || '多轮'}截止: {mat.portfolioDeadline})
                                        </span>
                                      )}
                                      <span className="export-badge text-[10px] px-1.5 py-0.5 font-bold rounded bg-blue-50 text-blue-600 border border-blue-100 align-middle">
                                        校本
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className={`export-badge px-2 py-0.5 rounded font-bold text-[10px] align-middle ${
                                      mat.status === '已完成' || mat.status === '已提交'
                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                        : mat.status === '待修改'
                                        ? 'text-rose-700 bg-rose-50 border border-rose-200/60'
                                        : mat.status === '准备中'
                                        ? 'text-amber-700 bg-amber-50 border border-amber-200/60'
                                        : 'text-slate-500 bg-slate-100 border border-slate-200/60'
                                    }`}>
                                      {mat.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 font-mono text-slate-500">{mat.feedbackDueDate || '—'}</td>
                                  <td className="py-2 px-2 max-w-xs break-words" title={mat.notes}>{mat.notes || '—'}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()
            )}
            </div>

            {/* Advisor comment block removed per user request */}



          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">无法加载学生数据报告</div>
        )}
      </div>
    </div>
  );
}
