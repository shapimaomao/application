import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import {
  generateICalendarFeed,
  downloadICSFile,
  getGoogleCalendarEventUrl,
  syncICSToServer,
  publishToGitHubCalendar
} from '../utils/icalGenerator';
import {
  Calendar,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  Globe,
  Bell,
  Sparkles,
  Info,
  CalendarPlus,
  ShieldCheck,
  CheckCircle2,
  Github,
  Send,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface CalendarSyncModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarSyncModal({ students, isOpen, onClose }: CalendarSyncModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGistRaw, setCopiedGistRaw] = useState(false);
  const [copiedGistWebcal, setCopiedGistWebcal] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<'google' | 'ios' | 'reminders' | 'mac_outlook'>('reminders');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  // GitHub Gist/Repo state
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('advisor_github_token') || '');
  const [githubGistId, setGithubGistId] = useState(() => localStorage.getItem('advisor_github_gist_id') || '');
  const [gistRawUrl, setGistRawUrl] = useState(() => localStorage.getItem('advisor_github_gist_raw_url') || 'https://raw.githubusercontent.com/shapimaomao/advisor-calendar/main/calendar.ics');
  const [gistWebcalUrl, setGistWebcalUrl] = useState(() => localStorage.getItem('advisor_github_gist_webcal_url') || 'webcal://raw.githubusercontent.com/shapimaomao/advisor-calendar/main/calendar.ics');
  const [isPublishingGist, setIsPublishingGist] = useState(false);
  const [gistError, setGistError] = useState<string | null>(null);
  const [gistSuccessMsg, setGistSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && students) {
      setSyncStatus('syncing');
      syncICSToServer(students).then(() => {
        setSyncStatus('success');
      });
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  // Compute full host and subscription URLs
  const origin = window.location.origin;
  const host = window.location.host;
  
  // Standard HTTPS ICS endpoint URL
  const httpSubscriptionUrl = `${origin}/calendar.ics`;

  // Calculate upcoming events preview with deduplication
  const allEvents: Array<{
    id: string;
    title: string;
    date: string;
    type: 'deadline' | 'feedback' | 'todo';
    studentName: string;
    details: string;
  }> = [];

  const seenKeys = new Set<string>();

  students.forEach((student) => {
    // 1. Material Feedbacks
    student.globalMaterials?.forEach((m) => {
      if (m.feedbackDueDate) {
        const cleanName = m.name.replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
        const key = `${student.id}-${m.feedbackDueDate}-${cleanName}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allEvents.push({
            id: `mat-global-${student.id}-${m.id}`,
            title: `[材料反馈] ${student.name}: ${m.name}`,
            date: m.feedbackDueDate,
            type: 'feedback',
            studentName: student.name,
            details: `学生: ${student.name} • 通用要件: ${m.name} (状态: ${m.status})`,
          });
        }
      }
    });

    student.applications?.forEach((app) => {
      app.materials?.forEach((m) => {
        if (m.feedbackDueDate) {
          const cleanName = m.name.replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
          const key = `${student.id}-${m.feedbackDueDate}-${app.id}-${cleanName}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allEvents.push({
              id: `mat-app-${student.id}-${app.id}-${m.id}`,
              title: `[专属要件] ${student.name} - ${app.schoolName}: ${m.name}`,
              date: m.feedbackDueDate,
              type: 'feedback',
              studentName: student.name,
              details: `学生: ${student.name} • ${app.schoolName}: ${m.name} (状态: ${m.status})`,
            });
          }
        }
      });

      if (app.deadlines && app.deadlines.length > 0) {
        app.deadlines.forEach((round) => {
          if (round.date) {
            const key = `${student.id}-${round.date}-dl-${app.id}-${round.id}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allEvents.push({
                id: `deadline-${student.id}-${app.id}-${round.id}`,
                title: `[申请截止] ${student.name} - ${app.schoolName} (${round.roundName})`,
                date: round.date,
                type: 'deadline',
                studentName: student.name,
                details: `学生: ${student.name} • ${app.schoolName} (${round.roundName}) • 项目: ${app.program || ''}`,
              });
            }
          }
        });
      } else if (app.deadline) {
        const key = `${student.id}-${app.deadline}-dl-${app.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allEvents.push({
            id: `deadline-legacy-${student.id}-${app.id}`,
            title: `[申请截止] ${student.name} - ${app.schoolName}`,
            date: app.deadline,
            type: 'deadline',
            studentName: student.name,
            details: `学生: ${student.name} • ${app.schoolName} • 项目: ${app.program || ''}`,
          });
        }
      }
    });

    // 2. Todos (Skip duplicate auto-synced material todos)
    student.todos?.forEach((todo) => {
      if (todo.dueDate) {
        if (todo.id.startsWith('todo-mat-') || todo.text.startsWith('【要件督办】') || todo.text.includes('要件督办')) {
          return;
        }

        const cleanTextKey = todo.text.replace(/【要件督办】/g, '').replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
        const key = `${student.id}-${todo.dueDate}-${cleanTextKey}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allEvents.push({
            id: `todo-${student.id}-${todo.id}`,
            title: `[督学待办] ${student.name}: ${todo.text}`,
            date: todo.dueDate,
            type: 'todo',
            studentName: student.name,
            details: `学生: ${student.name} • 关联: ${todo.associatedSchool || '通用'}`,
          });
        }
      }
    });
  });

  // Sort events by date ascending
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const handleCopyHttp = () => {
    navigator.clipboard.writeText(httpSubscriptionUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyGistRaw = () => {
    if (!gistRawUrl) return;
    navigator.clipboard.writeText(gistRawUrl);
    setCopiedGistRaw(true);
    setTimeout(() => setCopiedGistRaw(false), 2500);
  };

  const handleCopyGistWebcal = () => {
    if (!gistWebcalUrl) return;
    navigator.clipboard.writeText(gistWebcalUrl);
    setCopiedGistWebcal(true);
    setTimeout(() => setCopiedGistWebcal(false), 2500);
  };

  const handleOpenGoogleAddByUrl = () => {
    const targetUrl = gistRawUrl || httpSubscriptionUrl;
    const googleAddUrl = `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(targetUrl)}`;
    window.open(googleAddUrl, '_blank');
  };

  const handlePublishGist = async () => {
    setIsPublishingGist(true);
    setGistError(null);
    setGistSuccessMsg(null);

    const icsContent = generateICalendarFeed(students);
    const res = await publishToGitHubCalendar(icsContent, githubToken, githubGistId, 'shapimaomao', 'advisor-calendar');

    setIsPublishingGist(false);

    if (res.success && res.rawUrl && res.webcalUrl) {
      setGistRawUrl(res.rawUrl);
      setGistWebcalUrl(res.webcalUrl);
      if (res.gistId) setGithubGistId(res.gistId);

      localStorage.setItem('advisor_github_token', githubToken);
      if (res.gistId) localStorage.setItem('advisor_github_gist_id', res.gistId);
      localStorage.setItem('advisor_github_gist_raw_url', res.rawUrl);
      localStorage.setItem('advisor_github_gist_webcal_url', res.webcalUrl);

      setGistSuccessMsg('🎉 部署成功！已同步至 GitHub shapimaomao/advisor-calendar，这是 100% 公开且无防盗链拦截的 GitHub Raw 网址，可完美同步至 iPhone 日历！');
    } else {
      setGistError(res.error || '部署至 GitHub 失败，请检查 Token 权限');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Google & 手机日历自动订阅同步
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30">
                  iCal / WebCAL
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                一次订阅，实时同步督导系统内所有学生的网申截止日与督学待办提醒至手机日历
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Status summary banner */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-emerald-950">
                  已检测到当前系统中共有 <span className="text-emerald-700 text-sm font-black underline">{allEvents.length}</span> 项去重后的重要督导排程与截止日
                </h3>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  已自动为您去重材料与待办项。订阅后，手机日历将保持单项目唯一提醒。
                </p>
              </div>
            </div>

            <button
              onClick={() => downloadICSFile(students)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .ics 日历文件</span>
            </button>
          </div>

          {/* GitHub Gist Real Webcal Subscription Section */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 rounded-2xl p-5 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                    部署至 GitHub Gist 获得 100% 真实公开订阅网址
                    <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                      iPhone 完美兼容
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    解决预览沙盒 URL 因权限要求导致 iPhone 报“请求 webcal 失败”的根本方案
                  </p>
                </div>
              </div>

              <a
                href="https://github.com/settings/tokens/new?description=AdvisorCalendarSync&scopes=gist"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>获取 GitHub Token</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    GitHub Personal Access Token (需勾选 <code className="text-emerald-400 bg-slate-800 px-1 font-mono">gist</code> 权限)
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx (或直接点击部署)"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handlePublishGist}
                    disabled={isPublishingGist}
                    className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isPublishingGist ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>发布中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{gistRawUrl ? '更新 GitHub 日历' : '🚀 部署至 GitHub Gist'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {gistError && (
                <div className="bg-rose-950/80 border border-rose-800/80 text-rose-200 p-2.5 rounded-xl text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{gistError}</span>
                </div>
              )}

              {gistSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 p-2.5 rounded-xl text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{gistSuccessMsg}</span>
                </div>
              )}

              {gistWebcalUrl && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                      <span>iPhone WebCAL 专属真实订阅链接 (webcal://)</span>
                      <span className="text-[10px] text-slate-400">推荐直接复制此链接到 iPhone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={gistWebcalUrl}
                        className="flex-1 bg-slate-950 border border-emerald-800/60 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 font-medium outline-none select-all"
                      />
                      <button
                        onClick={handleCopyGistWebcal}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedGistWebcal ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedGistWebcal ? '已复制 WebCAL' : '复制 WebCAL'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                      <span>GitHub Raw HTTPS 原始链接</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={gistRawUrl}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none select-all"
                      />
                      <button
                        onClick={handleCopyGistRaw}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedGistRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedGistRaw ? '已复制' : '复制 HTTPS'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <a
                      href={gistWebcalUrl}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>在 iPhone Safari 中一键唤起订阅</span>
                    </a>
                    <a
                      href={gistRawUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>查看 GitHub 原始文件</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* iPhone Troubleshooting Alert */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4.5 text-xs space-y-3 shadow-2xs">
            <div className="flex items-center justify-between font-bold text-amber-950">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span className="text-sm">iPhone 提示“验证失败 / 请求 webcal 失败”的原因与 100% 成功方案</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full text-[10px] font-bold">
                沙盒与公网发布对比
              </span>
            </div>

            <div className="text-amber-900 space-y-2.5 leading-relaxed text-[11px]">
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-slate-800 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                  为何开发沙盒 URL 会提示“验证失败”？
                </p>
                <p className="text-slate-600 leading-normal">
                  沙盒环境 URL（包含 <code className="bg-slate-100 px-1 font-mono text-slate-800">ais-dev-...run.app</code>）需要浏览器 Session 凭证。iPhone 原生日历在后台拉取时无法带有该凭证，因此提示“请求失败”。上面的 <span className="font-bold text-indigo-700">GitHub Gist 部署方案</span> 放置于 GitHub 公开 CDN 上，没有任何凭证拦截，是 100% 成功的真正公网网址！
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                  iPhone 上 100% 成功的 2 种最快添加方案：
                </p>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {/* Solution 1: Direct File Import */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-950 text-xs flex items-center gap-1">
                        <span>方案一：iPhone Safari 直接导入 .ics 文件</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">无缝秒搞定</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        在 iPhone 的 Safari 浏览器中点击下方按钮下载文件，手机会自动弹出原生【日历】的“全部添加”提示，直接一键入库！
                      </p>
                    </div>
                    <button
                      onClick={() => downloadICSFile(students)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载并一键导入 iPhone 日历 (.ics)</span>
                    </button>
                  </div>

                  {/* Solution 2: Google Calendar Cloud Sync */}
                  <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-blue-950 text-xs flex items-center gap-1">
                        <span>方案二：GitHub / Google 日历自动无缝同步</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        使用上方 GitHub 生成的真实 URL 绑至 Google 日历。在 iPhone【设置】→【日历】→【账户】中勾选 Gmail 同步，手机日历实时自动推送！
                      </p>
                    </div>
                    <button
                      onClick={handleOpenGoogleAddByUrl}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>绑定至 Google Calendar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Local HTTPS Preview Link Section */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              本地云服务端 ICS 订阅链接 (适合在当前浏览器直接测试)
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={httpSubscriptionUrl}
                  className="flex-1 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 font-semibold shadow-2xs outline-none select-all"
                />
                <button
                  onClick={handleCopyHttp}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? '已复制网址' : '复制网址'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-step Guides per device platform */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                手机与电脑日历添加指南 (Step-by-Step)
              </h3>

              <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setActiveInstructionTab('reminders')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeInstructionTab === 'reminders'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>iPhone 提醒事项 (待办)</span>
                </button>
                <button
                  onClick={() => setActiveInstructionTab('ios')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeInstructionTab === 'ios'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📱 iPhone 日历 App
                </button>
                <button
                  onClick={() => setActiveInstructionTab('google')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeInstructionTab === 'google'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🌐 Google Calendar
                </button>
                <button
                  onClick={() => setActiveInstructionTab('mac_outlook')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeInstructionTab === 'mac_outlook'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💻 Mac / Outlook
                </button>
              </div>
            </div>

            {/* Instruction Tab Content */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
              {activeInstructionTab === 'reminders' && (
                <div className="space-y-3 text-slate-700 leading-relaxed">
                  <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-xl text-indigo-950 font-medium">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      为何 iPhone 日历订阅默认显示为“日程”而非“待办事项”？
                    </p>
                    <p className="text-[11px] text-indigo-800 mt-1">
                      苹果 iOS 系统机制规定：网络 URL 订阅 (WebCAL) 统一由 **【日历 App】** 接管显示为日程；原生 **【提醒事项 App】** 不支持直接添加 URL 订阅地址。但在订阅源中我们已全量嵌入了标准 <code className="bg-white/80 px-1 font-mono text-indigo-900">VTODO</code> 待办节点。您可以选择以下 3 种方案同步为待办清单：
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                        <span>滴答清单 / GoodTask / Outlook 待办 (推荐)</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        在滴答清单 (TickTick)、GoodTask 或 Outlook 待办中添加 GitHub 订阅地址，系统会自动解析里面的 <code className="bg-slate-100 px-1 font-mono text-slate-800">VTODO</code> 属性，展现为带打勾复选框的**真正的待办事项列表**！
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                        <span>iPhone【快捷指令】一键抓取至提醒事项</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        在 iPhone【快捷指令】中创建：获取 URL 内容 → 提取 <code className="bg-slate-100 px-1 font-mono text-slate-800">SUMMARY</code> 标题 → 批量生成至 iPhone 原生 **【提醒事项 App】**。
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-amber-600" />
                      方案 3：在 iPhone 日历中直接作为“定时强提醒待办”使用
                    </p>
                    <p>
                      当前同步的日历项已全量包含 <code className="bg-white px-1 font-mono text-slate-800">VALARM</code> 响铃属性。截止日当天上午 09:00 手机锁屏会自动收到“督学提醒”弹窗，使用体验与提醒事项完全相同。
                    </p>
                  </div>
                </div>
              )}
              {activeInstructionTab === 'google' && (
                <ol className="space-y-2.5 text-slate-700 list-decimal list-inside leading-relaxed font-medium">
                  <li>
                    复制上方的 <span className="font-bold text-slate-900">GitHub Gist 或 HTTPS 订阅网址</span>。
                  </li>
                  <li>
                    使用浏览器打开网页版{' '}
                    <a
                      href="https://calendar.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold underline inline-flex items-center gap-0.5"
                    >
                      Google Calendar <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>
                    在左侧边栏找到 <span className="font-bold text-slate-900">“其他日历” (Other calendars)</span> 旁边的 <span className="font-bold text-slate-900 font-mono">+</span> 号，选择 <span className="font-bold text-emerald-700">“通过 URL 添加” (From URL)</span>。
                  </li>
                  <li>
                    将刚才复制的网址粘贴进输入框，并点击 <span className="font-bold text-slate-900">“添加日历”</span>。
                  </li>
                  <li>
                    <span className="font-bold text-slate-900">手机同步方法：</span> 在手机上的 Google 日历 App 中，进入“设置” → “展开更多”，勾选刚添加的“留学督导管理日历”并开启“同步”开关即可！
                  </li>
                </ol>
              )}

              {activeInstructionTab === 'ios' && (
                <ol className="space-y-2.5 text-slate-700 list-decimal list-inside leading-relaxed font-medium">
                  <li>
                    在 iPhone / iPad 上，强烈推荐使用上方 <span className="font-bold text-indigo-700">GitHub Gist 部署生成的 WebCAL 链接</span>（以 <code className="font-mono bg-indigo-100 text-indigo-800 px-1">webcal://</code> 开头）。
                  </li>
                  <li>
                    打开 iPhone <span className="font-bold text-slate-900">【设置】(Settings)</span> → 点击 <span className="font-bold text-slate-900">【日历】(Calendar)</span> → 点击 <span className="font-bold text-slate-900">【账户】(Accounts)</span>。
                  </li>
                  <li>
                    点击 <span className="font-bold text-slate-900">【添加账户】</span> → 选择最下方的 <span className="font-bold text-slate-900">【其他】</span> → 点击 <span className="font-bold text-emerald-700">【添加已订阅的日历】</span>。
                  </li>
                  <li>
                    在“服务器”一栏粘贴刚才复制的 WebCAL / HTTPS 网址，点击右上角 <span className="font-bold text-slate-900">“下一步”</span> → 点击 <span className="font-bold text-slate-900">“保存”</span>。
                  </li>
                  <li>
                    打开 iPhone 原生【日历】App，你的所有督导提醒与学生截止日将直接出现在日历与锁屏提醒中！
                  </li>
                </ol>
              )}

              {activeInstructionTab === 'mac_outlook' && (
                <ol className="space-y-2.5 text-slate-700 list-decimal list-inside leading-relaxed font-medium">
                  <li>
                    <span className="font-bold text-slate-900">Mac 日历 App：</span> 打开“日历” → 顶部菜单栏点击“文件” → “新建日历订阅...” → 粘贴订阅 URL 即可。
                  </li>
                  <li>
                    <span className="font-bold text-slate-900">Microsoft Outlook：</span> 在日历视图下，选择“添加日历” → “从 Internet 订阅” → 粘贴 URL 即可。
                  </li>
                  <li>
                    <span className="font-bold text-slate-900">手动导入 (.ics):</span> 点击顶部“下载 .ics 日历文件”按钮，双击下载的文件即可一键将全部事件导入任意本地日历客户端。
                  </li>
                </ol>
              )}
            </div>
          </div>

          {/* Quick Add Single Event Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CalendarPlus className="w-4 h-4 text-emerald-600" />
                单项提醒一键添加至 Google 日历 (Quick Single Event Add)
              </span>
              <span className="text-[11px] font-normal text-slate-500">示例可预览最新提醒项</span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white">
              {allEvents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  暂无待办或截止日数据
                </div>
              ) : (
                allEvents.slice(0, 10).map((evt) => (
                  <div key={evt.id} className="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{evt.title}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded">
                          {evt.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{evt.details}</p>
                    </div>

                    <a
                      href={getGoogleCalendarEventUrl(evt.title, evt.date, evt.details)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg text-[11px] font-bold border border-slate-200 transition shrink-0 flex items-center gap-1"
                    >
                      <CalendarPlus className="w-3 h-3 text-blue-600" />
                      <span>加至 Google 日历</span>
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>日历订阅支持跨设备实时拉取与状态自动联动</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
}

