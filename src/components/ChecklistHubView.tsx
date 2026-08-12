import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MasterChecklistItem, Student, SchoolApplication, MaterialItem } from '../types';
import { isMaterialRequired } from '../utils/materials';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Edit3,
  Trash2,
  Calendar,
  Globe,
  Sparkles,
  BookOpen,
  FileText,
  Video,
  Layers,
  Check,
  X,
  UserCheck,
  Send,
  Info,
  SlidersHorizontal,
  Link,
  Award,
  Save,
  AlertTriangle,
  Clock,
  CheckSquare,
  RotateCcw,
  RotateCw
} from 'lucide-react';

export function cleanSchoolNameChineseOnly(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  // Check if there are Chinese characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
  if (!hasChinese) {
    return trimmed;
  }

  const cleaned = trimmed
    // Remove parenthesized content that does NOT contain Chinese characters (e.g. (University of Edinburgh), (UCL), [RCA], (NTU))
    .replace(/\s*[\(\（\[\【][^\u4e00-\u9fa5]*[\)\）\]\】]/g, '')
    // Remove separators followed by English or numbers e.g. " - HKU", " / UCL", " | CMU"
    .replace(/\s*[\-\/\\|_:,;]+\s*[A-Za-z0-9\s\.\-&/',]+/gi, '')
    // Remove any remaining English letters
    .replace(/[A-Za-z]+/g, '')
    // Remove leftover empty or unmatched brackets
    .replace(/[\(\（\[\【\)\）\]\】]/g, '')
    // Remove leading and trailing non-Chinese punctuation or symbols or extra whitespace
    .replace(/^[^\u4e00-\u9fa5]+|[^\u4e00-\u9fa5]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || trimmed;
}

interface ChecklistHubViewProps {
  masterChecklist: MasterChecklistItem[];
  onUpdateMasterChecklist: (newList: MasterChecklistItem[]) => void;
  students: Student[];
  onUpdateStudentApplications: (studentId: string, updatedApps: SchoolApplication[]) => void;
  onSyncMasterToStudents: (masterItems: MasterChecklistItem[]) => Student[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  triggerAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSaveToDatabase?: (overrideMasterChecklist?: MasterChecklistItem[], overrideStudents?: Student[]) => void;
  roundOptions?: string[];
}

// Field Definition for Mapping
interface SystemFieldDef {
  key: keyof MasterChecklistItem;
  label: string;
  keywords: string[];
  required?: boolean;
}

const SYSTEM_FIELDS: SystemFieldDef[] = [
  {
    key: 'schoolName',
    label: '院校名称',
    keywords: ['院校名称', '学校名称', '院校', '学校', '大学', 'school', 'university', 'college', 'inst'],
    required: true
  },
  {
    key: 'program',
    label: '专业名称',
    keywords: ['专业名称', '专业', '项目名称', '项目', '申请专业', '申请项目', 'program', 'major', 'course', 'track'],
    required: true
  },
  {
    key: 'programUrl',
    label: '专业链接',
    keywords: ['专业链接', '专业官网', '官网链接', '课程链接', '专业网址', '官网网址', 'programurl', 'programlink', 'url', 'link', 'website']
  },
  {
    key: 'languageRequirement',
    label: '语言要求',
    keywords: ['语言要求', '语言成绩', '语言', '雅思', '托福', '朗思', '多邻国', 'ielts', 'toefl', 'duolingo', 'language']
  },
  {
    key: 'deadlines',
    label: '截止日期',
    keywords: ['截止日期', '截止时间', '截止', '网申截止', '轮次', 'ddl', 'deadline', 'due', 'date']
  },
  {
    key: 'portfolioEngReq',
    label: '作品集官网英文要求',
    keywords: ['作品集官网英文要求', '作品集英文要求', '作品集英文', '作品集描述', 'portfolioeng', 'portfolioenglish', 'portfolio description']
  },
  {
    key: 'portfolioUploadReq',
    label: '作品集上传要求',
    keywords: ['作品集上传要求', '作品集上传', '作品集格式', '作品集页数', '作品集要求', 'portfolioupload', 'portfolioformat', 'portfolioreq']
  },
  {
    key: 'portfolioUrl',
    label: '作品集要求链接',
    keywords: ['作品集要求链接', '作品集官网', '作品集链接', '作品集网址', 'portfoliourl', 'portfoliolink']
  },
  {
    key: 'personalStatementReq',
    label: '个人陈述',
    keywords: ['个人陈述', 'ps要求', 'ps', 'personalstatement', 'statementofpurpose', 'sop', '动机信']
  },
  {
    key: 'researchProposalReq',
    label: '研究计划书',
    keywords: ['研究计划书', '研究计划', 'rp要求', 'rp', 'researchproposal', 'proposal']
  },
  {
    key: 'videoTaskReq',
    label: '视频任务',
    keywords: ['视频任务', '视频要求', '视频', '面试视频', 'video', 'videotask', 'interviewvideo']
  },
  {
    key: 'recommendationReq',
    label: '推荐信',
    keywords: ['推荐信', '推荐人', 'rl', 'recommendation', 'reference']
  },
  {
    key: 'cvReq',
    label: '简历',
    keywords: ['简历', '个人简历', 'cv', 'resume']
  },
  {
    key: 'otherReq',
    label: '其他材料',
    keywords: ['其他材料', '其他要求', '其他', 'other', 'additional']
  },
  {
    key: 'country',
    label: '国家/地区',
    keywords: ['国家', '地区', 'country', 'region']
  },
  {
    key: 'degree',
    label: '学位层次',
    keywords: ['学位', '层次', 'degree', 'level']
  },
  {
    key: 'notes',
    label: '关键备注',
    keywords: ['备注', '说明', '注释', 'notes', 'comments', 'remark']
  }
];

export default function ChecklistHubView({
  masterChecklist,
  onUpdateMasterChecklist,
  students,
  onUpdateStudentApplications,
  onSyncMasterToStudents,
  selectedStudentId,
  onSelectStudent,
  triggerAlert,
  onSaveToDatabase,
  roundOptions = ['第一轮', '第二轮', '第三轮', 'EA/ED', '早申轮', '主申轮', '延申轮', '常规轮', '最终轮']
}: ChecklistHubViewProps) {
  const availableRounds = (roundOptions && roundOptions.length > 0)
    ? roundOptions
    : ['第一轮', '第二轮', '第三轮', 'EA/ED', '早申轮', '主申轮', '延申轮', '常规轮', '最终轮'];
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [degreeFilter, setDegreeFilter] = useState('ALL');
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const [dedupeOnly, setDedupeOnly] = useState(true);

  // Selected Items for batch operations / student checklist assignment
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Undo & Redo History Stacks
  const [historyStack, setHistoryStack] = useState<MasterChecklistItem[][]>([]);
  const [futureStack, setFutureStack] = useState<MasterChecklistItem[][]>([]);

  // Wrapper function for recording history before modifying masterChecklist
  const updateMasterChecklistWithHistory = (newList: MasterChecklistItem[]) => {
    setHistoryStack(prev => [...prev.slice(-29), masterChecklist]); // keep max 30 snapshots
    setFutureStack([]);
    onUpdateMasterChecklist(newList);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) {
      triggerAlert('当前无更多可撤销的操作！', 'info');
      return;
    }
    const previous = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, historyStack.length - 1);

    setHistoryStack(newHistory);
    setFutureStack(prev => [...prev, masterChecklist]);
    onUpdateMasterChecklist(previous);
    triggerAlert('已成功撤销上一步修改 ↩️', 'info');
  };

  const handleRedo = () => {
    if (futureStack.length === 0) {
      triggerAlert('当前无更多可恢复的操作！', 'info');
      return;
    }
    const next = futureStack[futureStack.length - 1];
    const newFuture = futureStack.slice(0, futureStack.length - 1);

    setFutureStack(newFuture);
    setHistoryStack(prev => [...prev, masterChecklist]);
    onUpdateMasterChecklist(next);
    triggerAlert('已成功恢复重做修改 ↪️', 'success');
  };

  // Helper to get formatted local date-time (YYYY-MM-DD HH:mm:ss) in user's local timezone
  const getNowFormatted = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Helper to split updatedAt string into two lines: Line 1 YYYY-MM-DD, Line 2 HH:mm
  const formatTimestampTwoLines = (updatedAt?: string) => {
    if (!updatedAt) {
      return { datePart: '2026-07-24', timePart: '00:00' };
    }
    const cleanStr = updatedAt.trim().replace('T', ' ');
    const parts = cleanStr.split(' ');
    const datePart = parts[0] || '2026-07-24';
    let timePart = parts[1] || '00:00';
    if (timePart.length > 5) {
      timePart = timePart.slice(0, 5); // 24-hour HH:mm
    }
    return { datePart, timePart };
  };

  // Deleting confirm state helper (two-step click or window.confirm)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Normalize legacy '主要轮次' round names on initial load if present
  useEffect(() => {
    if (!masterChecklist || masterChecklist.length === 0) return;
    let needsUpdate = false;
    const cleanedList = masterChecklist.map(item => {
      let hasLegacyRound = false;
      const updatedDeadlines = item.deadlines ? item.deadlines.map(d => {
        if (d.roundName === '主要轮次') {
          hasLegacyRound = true;
          return { ...d, roundName: '第一轮' };
        }
        return d;
      }) : [];

      if (hasLegacyRound) {
        needsUpdate = true;
        return { ...item, deadlines: updatedDeadlines };
      }
      return item;
    });

    if (needsUpdate) {
      onUpdateMasterChecklist(cleanedList);
    }
  }, []);

  // Target Student for assigning checklist or exporting custom checklist
  const [targetStudentId, setTargetStudentId] = useState<string>(selectedStudentId || (students[0]?.id || ''));

  useEffect(() => {
    if (selectedStudentId) {
      setTargetStudentId(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Helper to compute masterChecklist IDs matching a student's applications
  const getStudentConfiguredMasterIds = useCallback((student: Student | undefined, masterList: MasterChecklistItem[]) => {
    if (!student || !student.applications) return [];
    const configuredIds: string[] = [];
    student.applications.forEach(app => {
      const cleanAppSchool = cleanSchoolNameChineseOnly(app.schoolName).toLowerCase();
      const cleanAppProg = app.program.trim().toLowerCase();
      const matched = masterList.find(m =>
        cleanSchoolNameChineseOnly(m.schoolName).toLowerCase() === cleanAppSchool &&
        m.program.trim().toLowerCase() === cleanAppProg
      );
      if (matched && !configuredIds.includes(matched.id)) {
        configuredIds.push(matched.id);
      }
    });
    return configuredIds;
  }, []);

  const prevStudentIdRef = useRef<string>(targetStudentId);
  const prevAppsCountRef = useRef<number>(-1);

  // Auto-sync pre-selection area with current target student's configured applications
  useEffect(() => {
    const student = students.find(s => s.id === targetStudentId);
    if (!student) return;

    const currentAppsCount = student.applications ? student.applications.length : 0;
    const configuredIds = getStudentConfiguredMasterIds(student, masterChecklist);

    if (prevStudentIdRef.current !== targetStudentId || prevAppsCountRef.current !== currentAppsCount) {
      prevStudentIdRef.current = targetStudentId;
      prevAppsCountRef.current = currentAppsCount;
      setSelectedIds(prev => {
        const merged = Array.from(new Set([...configuredIds, ...prev]));
        return merged;
      });
    }
  }, [targetStudentId, students, masterChecklist, getStudentConfiguredMasterIds]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterChecklistItem | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<MasterChecklistItem | null>(null);

  // Excel Import Mapping Modal State
  const [showImportMappingModal, setShowImportMappingModal] = useState(false);
  const [rawExcelHeaders, setRawExcelHeaders] = useState<string[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // File Input Ref for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable Form State
  const [formData, setFormData] = useState<Partial<MasterChecklistItem>>({
    schoolName: '',
    program: '',
    country: '美国',
    degree: '硕士研究生',
    programUrl: '',
    languageRequirement: '',
    deadlines: [{ id: 'dl-1', roundName: '第一轮', date: '2026-11-15' }],
    portfolioEngReq: '',
    portfolioUploadReq: '',
    portfolioUrl: '',
    personalStatementReq: '',
    researchProposalReq: '',
    videoTaskReq: '',
    recommendationReq: '',
    cvReq: '',
    otherReq: '',
    notes: ''
  });

  // Country Options from current dataset
  const countryOptions = Array.from(new Set(masterChecklist.map(item => item.country).filter(Boolean)));

  // Raw Filtered List (before deduplication)
  const rawFilteredList = masterChecklist.filter(item => {
    const cleanName = cleanSchoolNameChineseOnly(item.schoolName);
    const matchesSearch =
      cleanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCountry = countryFilter === 'ALL' || item.country === countryFilter;
    const matchesDegree = degreeFilter === 'ALL' || item.degree === degreeFilter;
    const matchesPortfolio = !portfolioOnly || (item.portfolioEngReq && item.portfolioEngReq.trim().length > 0 && item.portfolioEngReq !== 'N/A') || (item.portfolioUploadReq && item.portfolioUploadReq.trim().length > 0);

    return matchesSearch && matchesCountry && matchesDegree && matchesPortfolio;
  });

  // Apply Deduplication: Keep only 1 item per (School Name + Program)
  const filteredList = dedupeOnly
    ? (() => {
        const seenKeys = new Set<string>();
        const uniqueList: MasterChecklistItem[] = [];
        for (const item of rawFilteredList) {
          const cleanSchool = cleanSchoolNameChineseOnly(item.schoolName).trim().toLowerCase();
          const cleanProg = item.program.trim().toLowerCase();
          const key = `${cleanSchool}:::${cleanProg}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueList.push(item);
          }
        }
        return uniqueList;
      })()
    : rawFilteredList;

  const duplicateCountInView = rawFilteredList.length - filteredList.length;

  // One-click deduplicate master checklist database
  const handleDeduplicateMasterChecklist = () => {
    const seenKeys = new Set<string>();
    const uniqueMasterList: MasterChecklistItem[] = [];
    let duplicateCount = 0;

    for (const item of masterChecklist) {
      const cleanSchool = cleanSchoolNameChineseOnly(item.schoolName).trim().toLowerCase();
      const cleanProg = item.program.trim().toLowerCase();
      const key = `${cleanSchool}:::${cleanProg}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueMasterList.push(item);
      } else {
        duplicateCount++;
      }
    }

    if (duplicateCount === 0) {
      triggerAlert('当前 Checklist 中无重复专业（同学校同专业）！', 'info');
      return;
    }

    if (window.confirm(`检测到 ${duplicateCount} 条重复专业（相同学校里的相同专业），确定要只保留 1 条并清理其余重复项吗？`)) {
      updateMasterChecklistWithHistory(uniqueMasterList);
      onSyncMasterToStudents(uniqueMasterList);
      if (onSaveToDatabase) {
        onSaveToDatabase();
      }
      triggerAlert(`已成功清理 ${duplicateCount} 条重复专业，当前存留 ${uniqueMasterList.length} 条唯一 Checklist 规则！`, 'success');
    }
  };

  // Select/Unselect All
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(item => item.id));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Direct In-Place Cell Edit Handler
  const handleCellChange = (id: string, field: keyof MasterChecklistItem, value: any) => {
    const updatedList = masterChecklist.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: value,
          updatedAt: getNowFormatted()
        };
      }
      return item;
    });
    updateMasterChecklistWithHistory(updatedList);
  };

  // Helper for auto-expanding cell textareas when clicked/focused
  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>, minExpandedRows = 6) => {
    const text = e.target.value || '';
    const linesByBreak = text.split('\n').length;
    const linesByLength = Math.ceil(text.length / 20);
    const estimatedRows = Math.max(minExpandedRows, linesByBreak, linesByLength);
    e.target.rows = Math.min(18, Math.max(minExpandedRows, estimatedRows));
  };

  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>, defaultRows = 3) => {
    e.target.rows = defaultRows;
  };

  // Direct Inline Deadline Edit Handlers
  const handleDeadlineItemChange = (itemId: string, dlIdx: number, field: 'roundName' | 'date', newText: string) => {
    const updatedList = masterChecklist.map(item => {
      if (item.id === itemId) {
        const currentDls = (item.deadlines && item.deadlines.length > 0)
          ? item.deadlines.map(d => ({ ...d }))
          : [{ id: 'dl-1', roundName: '第一轮', date: '2026-12-01' }];

        if (currentDls[dlIdx]) {
          currentDls[dlIdx] = { ...currentDls[dlIdx], [field]: newText };
        }
        return {
          ...item,
          deadlines: currentDls,
          updatedAt: getNowFormatted()
        };
      }
      return item;
    });
    updateMasterChecklistWithHistory(updatedList);
  };

  const handleAddDeadlineRound = (itemId: string) => {
    const updatedList = masterChecklist.map(item => {
      if (item.id === itemId) {
        const currentDls = item.deadlines ? item.deadlines.map(d => ({ ...d })) : [];
        const nextRoundDefault = availableRounds[currentDls.length % availableRounds.length] || `第${currentDls.length + 1}轮`;
        const newDls = [
          ...currentDls,
          { id: `dl-${Date.now()}`, roundName: nextRoundDefault, date: '2026-12-01' }
        ];
        return {
          ...item,
          deadlines: newDls,
          updatedAt: getNowFormatted()
        };
      }
      return item;
    });
    updateMasterChecklistWithHistory(updatedList);
  };

  const handleRemoveDeadlineRound = (itemId: string, dlIdx: number) => {
    const updatedList = masterChecklist.map(item => {
      if (item.id === itemId) {
        const currentDls = item.deadlines ? item.deadlines.map(d => ({ ...d })) : [];
        const newDls = currentDls.filter((_, idx) => idx !== dlIdx);
        return {
          ...item,
          deadlines: newDls,
          updatedAt: getNowFormatted()
        };
      }
      return item;
    });
    updateMasterChecklistWithHistory(updatedList);
  };

  // Explicit Save to Database Action
  const handleSaveToDatabase = () => {
    // 1. Sync latest master checklist rules across all student applications
    const updatedStudents = onSyncMasterToStudents(masterChecklist);

    // 2. Persist to database & local storage
    if (onSaveToDatabase) {
      onSaveToDatabase(masterChecklist, updatedStudents);
    } else {
      localStorage.setItem('advisor_master_checklist', JSON.stringify(masterChecklist));
      triggerAlert('💾 最新 Checklist 表数据及学生应用配置已成功保存写入数据库！', 'success');
    }
  };

  // Delete Checklist Item
  const handleDeleteItem = (e: React.MouseEvent, id: string, schoolName: string, program: string) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanName = cleanSchoolNameChineseOnly(schoolName);

    // If already in deleting confirmation state or user confirms
    if (deletingId === id || window.confirm(`确定要删除【${cleanName} - ${program}】这条 Checklist 专业项目吗？`)) {
      const newList = masterChecklist.filter(i => i.id !== id);
      updateMasterChecklistWithHistory(newList);
      setSelectedIds(prev => prev.filter(i => i !== id));
      setDeletingId(null);
      triggerAlert(`已成功删除【${cleanName} - ${program}】专业条目！`, 'success');
      if (onSaveToDatabase) {
        onSaveToDatabase();
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 4000);
    }
  };

  // Smart Header Auto Matcher Logic
  const autoMatchHeaders = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    SYSTEM_FIELDS.forEach(fieldDef => {
      let bestMatch = '';
      let highestScore = 0;

      headers.forEach(header => {
        if (usedHeaders.has(header)) return;
        const normalizedHeader = header.trim().toLowerCase().replace(/[\(\)（）\[\]\:\：\_\-\s]/g, '');

        fieldDef.keywords.forEach(kw => {
          const normalizedKw = kw.toLowerCase().replace(/[\(\)（）\[\]\:\：\_\-\s]/g, '');
          if (normalizedHeader === normalizedKw) {
            if (highestScore < 100) {
              highestScore = 100;
              bestMatch = header;
            }
          } else if (normalizedHeader.includes(normalizedKw)) {
            const score = 50 + normalizedKw.length;
            if (score > highestScore) {
              highestScore = score;
              bestMatch = header;
            }
          }
        });
      });

      if (bestMatch) {
        mapping[fieldDef.key] = bestMatch;
        usedHeaders.add(bestMatch);
      } else {
        mapping[fieldDef.key] = '';
      }
    });

    return mapping;
  };

  // Handle File Upload & Extract Raw Headers/Rows
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          triggerAlert('Excel文件中未找到有效数据行！', 'error');
          return;
        }

        // Extract raw header strings
        const headers = Object.keys(jsonRows[0] || {});
        setRawExcelHeaders(headers);
        setRawExcelRows(jsonRows);

        // Auto Match headers
        const initialMapping = autoMatchHeaders(headers);
        setColumnMapping(initialMapping);

        setShowImportMappingModal(true);
      } catch (err) {
        console.error('Failed to parse excel file:', err);
        triggerAlert('解析 Excel 文件失败，请确认格式是否为标准 .xlsx 或 .csv！', 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Parse Raw Excel Rows according to Column Mapping
  const generateParsedItems = (): MasterChecklistItem[] => {
    return rawExcelRows.map((row, index) => {
      const getVal = (fieldKey: keyof MasterChecklistItem): string => {
        const mappedColHeader = columnMapping[fieldKey];
        if (!mappedColHeader) return '';
        const val = row[mappedColHeader];
        return val !== undefined && val !== null ? String(val).trim() : '';
      };

      const rawSchoolName = getVal('schoolName') || '未命名院校';
      const cleanSchoolName = cleanSchoolNameChineseOnly(rawSchoolName);
      const programName = getVal('program') || '未命名专业';
      const rawProgramUrl = getVal('programUrl');
      const rawLang = getVal('languageRequirement');
      const rawDeadline = getVal('deadlines');
      const rawPortEng = getVal('portfolioEngReq');
      const rawPortUp = getVal('portfolioUploadReq');
      const rawPortUrl = getVal('portfolioUrl');
      const rawPS = getVal('personalStatementReq');
      const rawRP = getVal('researchProposalReq');
      const rawVideo = getVal('videoTaskReq');
      const rawRec = getVal('recommendationReq');
      const rawCv = getVal('cvReq');
      const rawOther = getVal('otherReq');
      const rawCountry = getVal('country');
      const rawDegree = getVal('degree');
      const rawNotes = getVal('notes');

      // Parse deadlines string into structured array
      let parsedDeadlines = [{ id: `dl-${index}-1`, roundName: '第一轮', date: '2026-12-01' }];
      if (rawDeadline) {
        if (rawDeadline.includes(':') || rawDeadline.includes(';')) {
          const parts = rawDeadline.split(/[;；,，]/).filter(Boolean);
          const dlArr = parts.map((pt, pIdx) => {
            const [round, dateStr] = pt.split(/[:：]/);
            return {
              id: `dl-${index}-${pIdx}`,
              roundName: round ? round.trim() : `第${pIdx + 1}轮`,
              date: dateStr ? dateStr.trim() : (pt.trim() || '2026-12-01')
            };
          });
          if (dlArr.length > 0) parsedDeadlines = dlArr;
        } else {
          parsedDeadlines = [{ id: `dl-${index}-1`, roundName: '第一轮', date: rawDeadline.trim() }];
        }
      }

      return {
        id: `mchk-imp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        schoolName: cleanSchoolName,
        program: programName,
        country: rawCountry || '通用',
        degree: rawDegree || '硕士研究生',
        programUrl: rawProgramUrl,
        languageRequirement: rawLang,
        deadlines: parsedDeadlines,
        portfolioEngReq: rawPortEng,
        portfolioUploadReq: rawPortUp,
        portfolioUrl: rawPortUrl,
        personalStatementReq: rawPS,
        researchProposalReq: rawRP,
        videoTaskReq: rawVideo,
        recommendationReq: rawRec,
        cvReq: rawCv,
        otherReq: rawOther,
        notes: rawNotes,
        updatedAt: getNowFormatted()
      };
    });
  };

  // Confirm Excel Import
  const handleConfirmImport = () => {
    const parsedItems = generateParsedItems();
    if (parsedItems.length === 0) {
      triggerAlert('导入失败，未解析到有效的 Checklist 规则！', 'error');
      return;
    }

    // Merge with existing master checklist
    const updatedMasterList = [...parsedItems, ...masterChecklist];
    updateMasterChecklistWithHistory(updatedMasterList);

    // Sync to all student applications
    onSyncMasterToStudents(updatedMasterList);

    setShowImportMappingModal(false);
    triggerAlert(`🎉 成功从 Excel 导入 ${parsedItems.length} 条 Checklist 规则并全量联动所有学生档案！`, 'success');
    if (onSaveToDatabase) {
      onSaveToDatabase();
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      schoolName: '',
      program: '',
      country: '美国',
      degree: '硕士研究生',
      programUrl: '',
      languageRequirement: '',
      deadlines: [{ id: 'dl-1', roundName: '第一轮', date: '2026-11-15' }],
      portfolioEngReq: '',
      portfolioUploadReq: '',
      portfolioUrl: '',
      personalStatementReq: '',
      researchProposalReq: '',
      videoTaskReq: '',
      recommendationReq: '',
      cvReq: '',
      otherReq: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MasterChecklistItem) => {
    setEditingItem(item);
    setFormData({
      ...item,
      schoolName: cleanSchoolNameChineseOnly(item.schoolName),
      deadlines: item.deadlines && item.deadlines.length > 0 ? [...item.deadlines] : [{ id: 'dl-1', roundName: '第一轮', date: '2026-12-01' }]
    });
    setShowAddModal(true);
  };

  // Save Modal (Add/Edit)
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName?.trim() || !formData.program?.trim()) {
      triggerAlert('请填写学校名称与专业名称！', 'error');
      return;
    }

    const cleanSchool = cleanSchoolNameChineseOnly(formData.schoolName);

    const updatedItem: MasterChecklistItem = {
      id: editingItem ? editingItem.id : `mchk-${Date.now()}`,
      schoolName: cleanSchool,
      program: formData.program.trim(),
      country: formData.country || '通用',
      degree: formData.degree || '硕士研究生',
      programUrl: formData.programUrl || '',
      languageRequirement: formData.languageRequirement || '',
      deadlines: formData.deadlines || [{ id: 'dl-1', roundName: '第一轮', date: '2026-12-01' }],
      portfolioEngReq: formData.portfolioEngReq || '',
      portfolioUploadReq: formData.portfolioUploadReq || '',
      portfolioUrl: formData.portfolioUrl || '',
      personalStatementReq: formData.personalStatementReq || '',
      researchProposalReq: formData.researchProposalReq || '',
      videoTaskReq: formData.videoTaskReq || '',
      recommendationReq: formData.recommendationReq || '',
      cvReq: formData.cvReq || '',
      otherReq: formData.otherReq || '',
      notes: formData.notes || '',
      updatedAt: getNowFormatted()
    };

    let newMasterList: MasterChecklistItem[];
    if (editingItem) {
      newMasterList = masterChecklist.map(i => i.id === editingItem.id ? updatedItem : i);
      triggerAlert(`【${updatedItem.schoolName} - ${updatedItem.program}】Checklist 信息更新成功！`, 'success');
    } else {
      newMasterList = [updatedItem, ...masterChecklist];
      triggerAlert(`已成功创建【${updatedItem.schoolName} - ${updatedItem.program}】Checklist 条目！`, 'success');
    }

    updateMasterChecklistWithHistory(newMasterList);
    setShowAddModal(false);

    // Synchronize changes automatically across all students in real time
    onSyncMasterToStudents(newMasterList);
    if (onSaveToDatabase) {
      onSaveToDatabase();
    }
  };

  // Assign Selected Master Items to Student Applications List
  const handleAssignSelectedToStudent = () => {
    if (selectedIds.length === 0) {
      triggerAlert('请先在表格中勾选需要配置给学生的专业项目！', 'error');
      return;
    }
    const student = students.find(s => s.id === targetStudentId);
    if (!student) {
      triggerAlert('请选择有效的目标学生！', 'error');
      return;
    }

    const itemsToAssign = masterChecklist.filter(item => selectedIds.includes(item.id));
    let updatedApps = [...(student.applications || [])];
    let addedCount = 0;
    let updatedCount = 0;

    itemsToAssign.forEach(master => {
      const cleanSchool = cleanSchoolNameChineseOnly(master.schoolName);
      const existingIdx = updatedApps.findIndex(
        a => cleanSchoolNameChineseOnly(a.schoolName).toLowerCase() === cleanSchool.toLowerCase() &&
             a.program.trim().toLowerCase() === master.program.trim().toLowerCase()
      );

      const primaryDeadline = master.deadlines?.[0]?.date || '2026-12-01';
      const primaryDeadlineRound = master.deadlines?.[0]?.roundName || '常规轮';

      const updatedMaterials: MaterialItem[] = [
        { id: 'ps', name: '个人陈述 (PS)', isRequired: isMaterialRequired(master.personalStatementReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'rp', name: '研究计划书 (RP)', isRequired: isMaterialRequired(master.researchProposalReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: isMaterialRequired(master.portfolioUploadReq) || isMaterialRequired(master.portfolioEngReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'video', name: '视频任务 (Video)', isRequired: isMaterialRequired(master.videoTaskReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'cv', name: '个人简历 (CV)', isRequired: isMaterialRequired(master.cvReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: isMaterialRequired(master.recommendationReq), status: '未开始', feedbackDueDate: '', notes: '' },
        { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: isMaterialRequired(master.recommendationReq), status: '未开始', feedbackDueDate: '', notes: '' },
      ];

      if (existingIdx >= 0) {
        const oldApp = updatedApps[existingIdx];
        updatedApps[existingIdx] = {
          ...oldApp,
          schoolName: cleanSchool,
          deadline: primaryDeadline,
          deadlineRound: primaryDeadlineRound,
          deadlines: master.deadlines,
          languageRequirement: master.languageRequirement || oldApp.languageRequirement,
          materials: oldApp.materials && oldApp.materials.length > 0 ? oldApp.materials.map(m => {
            if (m.id === 'ps') return { ...m, isRequired: isMaterialRequired(master.personalStatementReq) };
            if (m.id === 'rp') return { ...m, isRequired: isMaterialRequired(master.researchProposalReq) };
            if (m.id === 'portfolio') return { ...m, isRequired: isMaterialRequired(master.portfolioUploadReq) || isMaterialRequired(master.portfolioEngReq) };
            if (m.id === 'video') return { ...m, isRequired: isMaterialRequired(master.videoTaskReq) };
            if (m.id === 'cv') return { ...m, isRequired: isMaterialRequired(master.cvReq) };
            if (m.id === 'recLetter1' || m.id === 'recLetter2') return { ...m, isRequired: isMaterialRequired(master.recommendationReq) };
            return m;
          }) : updatedMaterials
        };
        updatedCount++;
      } else {
        const newApp: SchoolApplication = {
          id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          schoolName: cleanSchool,
          program: master.program,
          country: master.country,
          deadline: primaryDeadline,
          deadlineRound: primaryDeadlineRound,
          deadlines: master.deadlines,
          status: '未开始',
          languageRequirement: master.languageRequirement || '',
          materials: updatedMaterials
        };
        updatedApps.push(newApp);
        addedCount++;
      }
    });

    onUpdateStudentApplications(targetStudentId, updatedApps);
    triggerAlert(`成功为【${student.name}】配选 Checklists：新增 ${addedCount} 个申请，更新 ${updatedCount} 个已有项目！`, 'success');
  };

  // Export Selected Student Custom Checklist to Excel (.xlsx)
  const handleExportStudentChecklistExcel = () => {
    const student = students.find(s => s.id === targetStudentId);
    const studentName = student ? student.name : '学生';

    const itemsToExport = selectedIds.length > 0
      ? masterChecklist.filter(item => selectedIds.includes(item.id))
      : filteredList;

    if (itemsToExport.length === 0) {
      triggerAlert('没有可导出的Checklist条目！', 'error');
      return;
    }

    const exportRows = itemsToExport.map((item, idx) => ({
      '序号': idx + 1,
      '院校名称': cleanSchoolNameChineseOnly(item.schoolName),
      '专业名称': item.program,
      '专业链接': item.programUrl || '',
      '语言要求': item.languageRequirement || '无特殊注明',
      '截止日期': item.deadlines ? item.deadlines.map(d => `${d.roundName}: ${d.date}`).join('; ') : '',
      '作品集官网英文要求': item.portfolioEngReq || '无',
      '作品集上传要求': item.portfolioUploadReq || '无',
      '作品集要求链接': item.portfolioUrl || '',
      '个人陈述': item.personalStatementReq || '',
      '研究计划书': item.researchProposalReq || '',
      '视频任务': item.videoTaskReq || '',
      '推荐信': item.recommendationReq || '',
      '简历': item.cvReq || '',
      '其他材料': item.otherReq || '',
      '关键备注': item.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    const colWidths = [
      { wch: 6 },
      { wch: 24 },
      { wch: 28 },
      { wch: 35 },
      { wch: 24 },
      { wch: 24 },
      { wch: 35 },
      { wch: 28 },
      { wch: 35 },
      { wch: 28 },
      { wch: 25 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '申请Checklist总表');

    const fileName = `【申请Checklist清单】_${studentName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    triggerAlert(`已成功导出【${studentName}】定制申请Checklist Excel表格！`, 'success');
  };

  // Sync Master Checklist To All Students Manually
  const handleManualSyncAllStudents = () => {
    onSyncMasterToStudents(masterChecklist);
    if (onSaveToDatabase) {
      onSaveToDatabase();
    }
    triggerAlert('已完成全网数据互通联动！最新截止日期与材料要求已全量同步至各学生档案并存入数据库！', 'success');
  };

  const selectedMasterItems = masterChecklist.filter(item => selectedIds.includes(item.id));
  const targetStudent = students.find(s => s.id === targetStudentId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-slate-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <FileSpreadsheet className="w-80 h-80" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>智能数据总表 & Excel表头自动匹配中心</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              申请Checklist智能总库
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              支持直接在线双击/编辑单元格、显示真实具体网址、纯中文院校名与精准删除，并支持一键将最新 Checklist 完整保存写入数据库！
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Save to Database Button */}
            <button
              type="button"
              onClick={handleSaveToDatabase}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              title="保存最新Checklist表单修改至数据库"
            >
              <Save className="w-4 h-4" />
              <span>保存 Checklist 至数据库</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>导入/解析 Excel</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>新增专业条目</span>
            </button>

            <button
              type="button"
              onClick={handleManualSyncAllStudents}
              className="px-4 py-2.5 bg-indigo-600/60 hover:bg-indigo-600 text-white border border-indigo-400/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>全表数据互通同步</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-1">总库精细项目</span>
            <span className="text-xl font-bold text-emerald-400">{masterChecklist.length} 个</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-1">覆盖国家/地区</span>
            <span className="text-xl font-bold text-sky-400">{countryOptions.length} 个</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-1">含作品集(Portfolio)项目</span>
            <span className="text-xl font-bold text-purple-300">
              {masterChecklist.filter(i => i.portfolioEngReq || i.portfolioUploadReq).length} 个
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-1">含视频/特殊任务</span>
            <span className="text-xl font-bold text-amber-300">
              {masterChecklist.filter(i => i.videoTaskReq && i.videoTaskReq !== '无').length} 个
            </span>
          </div>
        </div>
      </div>

      {/* Student Assignment & Export Action Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">学生专属 Checklist 配置与导出</h2>
            <p className="text-xs text-slate-500">
              勾选下方智能总表中的项目，直接关联至学生档案，或导出包含全量要求细节的专用 Excel 表格。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-medium text-slate-600 shrink-0">选择学生：</span>
            <select
              value={targetStudentId}
              onChange={(e) => {
                setTargetStudentId(e.target.value);
                onSelectStudent(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.targetMajor.slice(0, 15)}...)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAssignSelectedToStudent}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>为该生配置选中的 Checklist</span>
          </button>

          <button
            type="button"
            onClick={handleExportStudentChecklistExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>导出定制 Excel 表格</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索院校、专业、国家或备注关键字..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Country Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">所有国家/地区</option>
              {countryOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Degree Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={degreeFilter}
              onChange={(e) => setDegreeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">所有学位层次</option>
              <option value="硕士研究生">硕士研究生</option>
              <option value="本科">本科新生</option>
              <option value="博士">博士研究生</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={portfolioOnly}
              onChange={(e) => setPortfolioOnly(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>仅看含作品集要求</span>
          </label>

          {/* 相同学校同专业去重筛选开关 */}
          <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer bg-emerald-50/70 px-3 py-2 rounded-xl border border-emerald-200/80 hover:bg-emerald-100/60 transition-all">
            <input
              type="checkbox"
              checked={dedupeOnly}
              onChange={(e) => setDedupeOnly(e.target.checked)}
              className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>专业去重 (同校同专业只留1条)</span>
            {duplicateCountInView > 0 && dedupeOnly && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white font-mono font-bold rounded-full shadow-2xs">
                已滤{duplicateCountInView}重复
              </span>
            )}
          </label>
        </div>
      </div>

      {/* 独立勾选专业预选工作区 (Pre-Selection Workspace Area) */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-500/30 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 px-5 py-3.5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg font-bold shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                  已勾选专业预选区 (Pre-Selection Area)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
                  {selectedMasterItems.length} 项已预选
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                实时展示【{students.find(s => s.id === targetStudentId)?.name || '目标学生'}】已配置的专业及预选项目，配送后持续保留展示
              </p>
            </div>
          </div>

          {selectedMasterItems.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleAssignSelectedToStudent}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>配置给目标学生</span>
              </button>
              <button
                type="button"
                onClick={handleExportStudentChecklistExcel}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>导出已选 Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-medium rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="清空预选区"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空预选</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50/70 min-h-[70px]">
          {selectedMasterItems.length === 0 ? (
            <div className="py-3 px-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>预选区暂无专业：在下方 Checklist 表格中勾选任意专业条目，即可实时出现在此处预选区。</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {selectedMasterItems.map((item) => {
                const cleanSchool = cleanSchoolNameChineseOnly(item.schoolName);
                const primaryDl = item.deadlines?.[0]?.date || '未指定';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-3 border border-emerald-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all relative group flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate" title={cleanSchool}>
                            {cleanSchool}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] shrink-0 border border-emerald-200/60">
                            {item.country}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-700 truncate mt-0.5" title={item.program}>
                          {item.program}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSelectItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                        title="从预选区移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-500">
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                        <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>DDL: {primaryDl}</span>
                      </div>
                      {item.portfolioEngReq || item.portfolioUploadReq ? (
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/60">
                          含作品集
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[10px]">
                          常规文书
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Checklist Master Table - STRICT SEQUENCE FROM LEFT TO RIGHT */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
              onChange={handleToggleSelectAll}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              显示 {filteredList.length} 条Checklist规则 (已选中 {selectedIds.length} 项)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDeduplicateMasterChecklist}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-lg shadow-2xs border border-indigo-200/80 flex items-center gap-1.5 transition-all cursor-pointer"
              title="清除数据库或表格中的同校同专业重复记录，仅保留1条"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>清理重复专业</span>
            </button>

            {/* 撤销 (Undo) 按钮 */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-2xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                historyStack.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200/80 cursor-not-allowed opacity-60'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200/90 hover:border-amber-300'
              }`}
              title={historyStack.length > 0 ? `撤销上一步操作 (共 ${historyStack.length} 步可撤销)` : '暂无可撤销的操作'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>撤销</span>
              {historyStack.length > 0 && (
                <span className="bg-amber-200/80 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {historyStack.length}
                </span>
              )}
            </button>

            {/* 恢复 (Redo) 按钮 */}
            <button
              type="button"
              onClick={handleRedo}
              disabled={futureStack.length === 0}
              className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-2xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                futureStack.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200/80 cursor-not-allowed opacity-60'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200/90 hover:border-sky-300'
              }`}
              title={futureStack.length > 0 ? `恢复重做修改 (共 ${futureStack.length} 步可恢复)` : '暂无可恢复的操作'}
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-600" />
              <span>恢复</span>
              {futureStack.length > 0 && (
                <span className="bg-sky-200/80 text-sky-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {futureStack.length}
                </span>
              )}
            </button>

            {/* 保存至数据库 */}
            <button
              type="button"
              onClick={handleSaveToDatabase}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存当前表单至数据库</span>
            </button>
            <span className="text-[11px] text-slate-500 hidden xl:inline">
              * 支持直接在线修改单元格与撤销/恢复
            </span>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse table-fixed min-w-[2450px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-100 text-[11px] font-bold tracking-wide uppercase sticky top-0 z-20 shadow-sm">
                <th className="py-2.5 px-1 w-[36px] text-center bg-slate-950 border-r border-slate-800 sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">选择</th>
                <th className="py-2.5 px-1 w-[115px] text-center bg-slate-950 border-r border-slate-800 sticky left-[36px] z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">操作 / 最近修改</th>
                <th className="py-2.5 px-1.5 w-[130px] bg-slate-950 border-r border-slate-800 sticky left-[151px] z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">1. 院校名称</th>
                <th className="py-2.5 px-2 w-[180px] bg-slate-950 border-r-2 border-slate-700 sticky left-[281px] z-30 shadow-[3px_0_6px_rgba(0,0,0,0.4)]">2. 专业名称</th>
                <th className="py-2.5 px-2.5 w-52 border-r border-slate-800">3. 专业官网具体网址</th>
                <th className="py-2.5 px-2.5 w-44 border-r border-slate-800">4. 语言要求</th>
                <th className="py-2.5 px-2.5 w-60 border-r border-slate-800 text-center">5. 截止日期</th>
                <th className="py-2.5 px-2.5 w-60 border-r border-slate-800">6. 作品集官网英文要求</th>
                <th className="py-2.5 px-2.5 w-48 border-r border-slate-800">7. 作品集上传要求</th>
                <th className="py-2.5 px-2.5 w-52 border-r border-slate-800">8. 作品集要求具体网址</th>
                <th className="py-2.5 px-2.5 w-48 border-r border-slate-800">9. 个人陈述 (PS)</th>
                <th className="py-2.5 px-2.5 w-48 border-r border-slate-800">10. 研究计划书 (RP)</th>
                <th className="py-2.5 px-2.5 w-40 border-r border-slate-800">11. 视频任务</th>
                <th className="py-2.5 px-2.5 w-40 border-r border-slate-800">12. 推荐信</th>
                <th className="py-2.5 px-2.5 w-36 border-r border-slate-800">13. 简历</th>
                <th className="py-2.5 px-2.5 w-44">14. 其他材料</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800 bg-white">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 stroke-[1.2] text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">暂无符合条件的Checklist项目</p>
                    <p className="text-xs mt-1">您可以点击顶部“新增专业条目”或“导入 Excel”添加规则</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const cleanSchoolName = cleanSchoolNameChineseOnly(item.schoolName);
                  const stickyBgClass = isSelected ? 'bg-emerald-100/90' : 'bg-slate-50/95';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-all ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Checkbox (Frozen Column 0) */}
                      <td className={`py-1.5 px-0.5 text-center align-top pt-2.5 sticky left-0 z-10 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${stickyBgClass}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(item.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* 操作 & 最近修改 (Frozen Column 1) */}
                      <td className={`py-1.5 px-1 align-top sticky left-[36px] z-10 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${stickyBgClass}`}>
                        <div className="flex flex-col items-center justify-center gap-1 pt-0.5">
                          {/* 集中操作按键 */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalItem(item)}
                              className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all cursor-pointer border border-slate-200 bg-white shadow-2xs"
                              title="查看详情"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer border border-slate-200 bg-white shadow-2xs"
                              title="弹窗集中编辑"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* 逐条专业项删除按键 */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(e, item.id, item.schoolName, item.program)}
                              className={`p-1 rounded text-xs font-bold transition-all flex items-center gap-0.5 cursor-pointer border ${
                                deletingId === item.id
                                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-md px-1'
                                  : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200 bg-white shadow-2xs'
                              }`}
                              title="直接删除该条Checklist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deletingId === item.id && <span className="text-[10px]">确认?</span>}
                            </button>
                          </div>

                          {/* 最近一次修改时间 (第一行年月日，第二行24小时制时间) */}
                          {(() => {
                            const { datePart, timePart } = formatTimestampTwoLines(item.updatedAt);
                            return (
                              <div
                                className="flex flex-col items-center justify-center bg-white px-1 py-0.5 rounded border border-slate-200/90 font-mono shadow-2xs leading-tight text-center w-full"
                                title={`最近修改时间：${item.updatedAt || '2026-07-24 00:00:00'}`}
                              >
                                <div className="flex items-center gap-0.5 text-slate-500 font-semibold tracking-tighter text-[9px]">
                                  <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span>{datePart}</span>
                                </div>
                                <div className="text-[9px] font-bold text-slate-700 tracking-tight">
                                  {timePart}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 1. 院校名称 (Frozen Column 2) */}
                      <td className={`py-1.5 px-1.5 align-top font-bold text-slate-900 sticky left-[151px] z-10 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${stickyBgClass}`}>
                        <div className="flex flex-col gap-1">
                          <textarea
                            rows={2}
                            value={cleanSchoolNameChineseOnly(item.schoolName) || ''}
                            onChange={(e) => handleCellChange(item.id, 'schoolName', e.target.value)}
                            onFocus={(e) => handleTextareaFocus(e, 5)}
                            onBlur={(e) => {
                              handleTextareaBlur(e, 2);
                              const cleaned = cleanSchoolNameChineseOnly(item.schoolName);
                              if (cleaned !== item.schoolName) {
                                handleCellChange(item.id, 'schoolName', cleaned);
                              }
                            }}
                            placeholder="院校中文名称"
                            className="w-full text-xs font-bold text-slate-900 bg-white/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded px-1.5 py-1 border border-slate-200/70 leading-snug resize-y transition-all overflow-hidden focus:z-30 focus:relative focus:shadow-xl"
                          />
                          <div className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-slate-200/70 text-slate-700 font-semibold text-[9px]">
                              {item.country}
                            </span>
                            <span className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium text-[9px]">
                              {item.degree}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. 专业名称 (Frozen Column 3 - right divider) */}
                      <td className={`py-1.5 px-1.5 align-top sticky left-[281px] z-10 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)] ${stickyBgClass}`}>
                        <textarea
                          rows={3}
                          value={item.program}
                          onChange={(e) => handleCellChange(item.id, 'program', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="专业英文/中文名称"
                          className="w-full text-xs font-semibold text-slate-800 bg-white/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded px-1.5 py-1 border border-slate-200/70 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 3. 专业官网具体网址 (直接显示真实网址，支持换行至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-start gap-1">
                          <textarea
                            rows={3}
                            value={item.programUrl || ''}
                            onChange={(e) => handleCellChange(item.id, 'programUrl', e.target.value)}
                            onFocus={(e) => handleTextareaFocus(e, 6)}
                            onBlur={(e) => handleTextareaBlur(e, 3)}
                            placeholder="https://www.example.edu/program"
                            className="w-full text-[11px] font-mono break-all text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 rounded px-2 py-1 border border-emerald-200/50 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                          />
                          {item.programUrl ? (
                            <a
                              href={item.programUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded shrink-0 transition-all mt-1"
                              title="在新窗口打开该网址"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* 4. 语言要求 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.languageRequirement || ''}
                          onChange={(e) => handleCellChange(item.id, 'languageRequirement', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="如：雅思 7.0 / 托福 100"
                          className="w-full text-[11px] font-medium text-amber-900 bg-amber-50/60 hover:bg-amber-50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 rounded px-2 py-1 border border-amber-200/60 leading-relaxed resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 5. 截止日期 (下拉选择系统轮次 + 手动输入日期) */}
                      <td className="py-2.5 px-2 align-top">
                        <div className="space-y-1.5">
                          {item.deadlines && item.deadlines.length > 0 ? (
                            item.deadlines.map((dl, idx) => {
                              const isCustom = !availableRounds.includes(dl.roundName);
                              return (
                                <div key={dl.id || idx} className="flex flex-col gap-1 bg-slate-50 p-1.5 rounded-md border border-slate-200/80 shadow-2xs">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={isCustom ? '自定义' : dl.roundName}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleDeadlineItemChange(item.id, idx, 'roundName', val === '自定义' ? '' : val);
                                      }}
                                      className="w-22 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded px-1 py-1 transition-all cursor-pointer shrink-0"
                                      title="选择申请轮次 (参照系统配置后台)"
                                    >
                                      {availableRounds.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                      <option value="自定义">✏️ 自定义...</option>
                                    </select>

                                    <span className="text-slate-400 text-[10px] font-bold shrink-0">:</span>

                                    <input
                                      type="text"
                                      value={dl.date || ''}
                                      onChange={(e) => handleDeadlineItemChange(item.id, idx, 'date', e.target.value)}
                                      placeholder="如: 2026-12-01"
                                      className="flex-1 min-w-[110px] text-[10px] font-mono font-bold text-emerald-900 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded px-1.5 py-1 text-center transition-all"
                                      title="手动输入具体截止日期 (如: 2026-12-01 或 2026-11-15 18:00)"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDeadlineRound(item.id, idx)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                                      title="删除该轮次"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {isCustom && (
                                    <input
                                      type="text"
                                      value={dl.roundName || ''}
                                      onChange={(e) => handleDeadlineItemChange(item.id, idx, 'roundName', e.target.value)}
                                      placeholder="请输入自定义轮次名称..."
                                      className="w-full text-[10px] font-bold text-slate-800 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded px-1.5 py-0.5 transition-all"
                                    />
                                  )}
                                </div>
                              );
                            })
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleAddDeadlineRound(item.id)}
                            className="w-full py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1"
                            title="增加截止日期轮次"
                          >
                            <Plus className="w-3 h-3" />
                            <span>加轮次</span>
                          </button>
                        </div>
                      </td>

                      {/* 6. 作品集官网英文要求 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.portfolioEngReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'portfolioEngReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="官网作品集英文要求..."
                          className="w-full text-[11px] font-mono text-purple-950 bg-purple-50/50 hover:bg-purple-50 focus:bg-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 rounded px-2 py-1 border border-purple-100 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 7. 作品集上传要求 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.portfolioUploadReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'portfolioUploadReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="上传格式与项目数要求..."
                          className="w-full text-[11px] font-medium text-purple-900 bg-purple-50/60 hover:bg-purple-50 focus:bg-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 rounded px-2 py-1 border border-purple-200/60 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 8. 作品集要求具体网址 (支持换行至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-start gap-1">
                          <textarea
                            rows={3}
                            value={item.portfolioUrl || ''}
                            onChange={(e) => handleCellChange(item.id, 'portfolioUrl', e.target.value)}
                            onFocus={(e) => handleTextareaFocus(e, 6)}
                            onBlur={(e) => handleTextareaBlur(e, 3)}
                            placeholder="https://www.example.edu/portfolio-guide"
                            className="w-full text-[11px] font-mono break-all text-purple-800 bg-purple-50/40 hover:bg-purple-50 focus:bg-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 rounded px-2 py-1 border border-purple-200/50 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                          />
                          {item.portfolioUrl ? (
                            <a
                              href={item.portfolioUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded shrink-0 transition-all mt-1"
                              title="在新窗口打开作品集要求指南"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* 9. 个人陈述 (PS) (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.personalStatementReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'personalStatementReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="PS字数与内容要求..."
                          className="w-full text-[11px] font-medium text-sky-950 bg-sky-50/50 hover:bg-sky-50 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-300 rounded px-2 py-1 border border-sky-100 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 10. 研究计划书 (RP) (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.researchProposalReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'researchProposalReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="RP要求..."
                          className="w-full text-[11px] font-medium text-indigo-950 bg-indigo-50/50 hover:bg-indigo-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 rounded px-2 py-1 border border-indigo-100 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 11. 视频任务 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.videoTaskReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'videoTaskReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="视频任务要求..."
                          className="w-full text-[11px] font-medium text-rose-950 bg-rose-50/50 hover:bg-rose-50 focus:bg-white focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 rounded px-2 py-1 border border-rose-100 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 12. 推荐信 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.recommendationReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'recommendationReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="推荐信要求..."
                          className="w-full text-[11px] font-medium text-emerald-950 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 rounded px-2 py-1 border border-emerald-100 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 13. 简历 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.cvReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'cvReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="简历要求..."
                          className="w-full text-[11px] font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-slate-500/30 focus:border-slate-300 rounded px-2 py-1 border border-slate-200 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>

                      {/* 14. 其他材料 (显示至多3行) */}
                      <td className="py-2.5 px-3 align-top">
                        <textarea
                          rows={3}
                          value={item.otherReq || ''}
                          onChange={(e) => handleCellChange(item.id, 'otherReq', e.target.value)}
                          onFocus={(e) => handleTextareaFocus(e, 6)}
                          onBlur={(e) => handleTextareaBlur(e, 3)}
                          placeholder="其他材料与备注..."
                          className="w-full text-[11px] font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-slate-500/30 focus:border-slate-300 rounded px-2 py-1 border border-slate-200 leading-snug resize-y transition-all focus:z-30 focus:relative focus:shadow-xl"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add / Edit Checklist Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingItem ? '编辑 Checklist 项目' : '新增 Checklist 项目'}
                  </h3>
                  <p className="text-xs text-slate-400">所有院校名称将自动整理为纯中文展示，并可同步存入数据库</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">学校中文名称 *</label>
                  <input
                    type="text"
                    required
                    placeholder="如：卡内基梅隆大学"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    onBlur={() => {
                      if (formData.schoolName) {
                        setFormData(prev => ({ ...prev, schoolName: cleanSchoolNameChineseOnly(prev.schoolName) }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">* 自动过滤英文缩写，仅展示纯中文院校名</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">专业名称 *</label>
                  <input
                    type="text"
                    required
                    placeholder="如：MS in Computer Science"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">国家/地区</label>
                  <input
                    type="text"
                    placeholder="如：美国 / 英国 / 新加坡 / 中国香港"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">学位层次</label>
                  <select
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="硕士研究生">硕士研究生</option>
                    <option value="本科">本科新生</option>
                    <option value="博士">博士研究生</option>
                  </select>
                </div>
              </div>

              {/* URLs & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">专业官网具体网址</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.programUrl}
                    onChange={(e) => setFormData({ ...formData, programUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">语言要求 (IELTS/TOEFL)</label>
                  <input
                    type="text"
                    placeholder="如：雅思 7.5 (写作不低于 7.0) / 托福 100"
                    value={formData.languageRequirement}
                    onChange={(e) => setFormData({ ...formData, languageRequirement: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Deadlines Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-800 text-sm block">截止日期 / 轮次设置</label>
                    <span className="text-[11px] text-slate-500 font-medium">从系统配置下拉选择轮次，也可选择自定义；日期可手动输入。</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      deadlines: [...(formData.deadlines || []), { id: `dl-${Date.now()}`, roundName: availableRounds[0] || '第一轮', date: '2026-12-01' }]
                    })}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加轮次</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.deadlines?.map((dl, idx) => {
                    const isCustom = !availableRounds.includes(dl.roundName);
                    return (
                      <div key={dl.id || idx} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={isCustom ? '自定义' : dl.roundName}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newDls = [...(formData.deadlines || [])];
                              newDls[idx].roundName = val === '自定义' ? '' : val;
                              setFormData({ ...formData, deadlines: newDls });
                            }}
                            className="w-1/3 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                          >
                            {availableRounds.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                            <option value="自定义">✏️ 自定义轮次...</option>
                          </select>

                          <input
                            type="text"
                            placeholder="手动输入日期 (如: 2026-12-01)"
                            value={dl.date}
                            onChange={(e) => {
                              const newDls = [...(formData.deadlines || [])];
                              newDls[idx].date = e.target.value;
                              setFormData({ ...formData, deadlines: newDls });
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />

                          {formData.deadlines && formData.deadlines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  deadlines: formData.deadlines?.filter((_, i) => i !== idx)
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-all"
                              title="删除该轮次"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {isCustom && (
                          <input
                            type="text"
                            placeholder="请输入自定义轮次名称..."
                            value={dl.roundName}
                            onChange={(e) => {
                              const newDls = [...(formData.deadlines || [])];
                              newDls[idx].roundName = e.target.value;
                              setFormData({ ...formData, deadlines: newDls });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio Requirements */}
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  作品集 (Portfolio) 精细要求
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">作品集官网英文要求 (Portfolio Eng Req)</label>
                    <textarea
                      rows={2}
                      placeholder="官网原版英文要求描述..."
                      value={formData.portfolioEngReq}
                      onChange={(e) => setFormData({ ...formData, portfolioEngReq: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">作品集格式与上传要求</label>
                      <input
                        type="text"
                        placeholder="如：PDF格式上限20MB / 包含1-5个完整项目"
                        value={formData.portfolioUploadReq}
                        onChange={(e) => setFormData({ ...formData, portfolioUploadReq: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">作品集要求官网具体网址</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Essays and Materials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">个人陈述 (PS) 要求</label>
                  <textarea
                    rows={2}
                    placeholder="如：不超过800字，强调核心研究与实习经历..."
                    value={formData.personalStatementReq}
                    onChange={(e) => setFormData({ ...formData, personalStatementReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">研究计划书 (RP) 要求</label>
                  <textarea
                    rows={2}
                    placeholder="如：需包含Research Question与学术文献索引..."
                    value={formData.researchProposalReq}
                    onChange={(e) => setFormData({ ...formData, researchProposalReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">视频任务 (Video) 要求</label>
                  <input
                    type="text"
                    placeholder="如：2分钟个人视频陈述 / 无"
                    value={formData.videoTaskReq}
                    onChange={(e) => setFormData({ ...formData, videoTaskReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">推荐信 (RL) 要求</label>
                  <input
                    type="text"
                    placeholder="如：2-3封学术或行业推荐信"
                    value={formData.recommendationReq}
                    onChange={(e) => setFormData({ ...formData, recommendationReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">简历 (CV) 要求</label>
                  <input
                    type="text"
                    placeholder="如：1-2页标准英文简历"
                    value={formData.cvReq}
                    onChange={(e) => setFormData({ ...formData, cvReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">其他材料要求</label>
                  <input
                    type="text"
                    placeholder="如：学信网认证/评分标准/WES认证"
                    value={formData.otherReq}
                    onChange={(e) => setFormData({ ...formData, otherReq: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">关键备注与补充说明</label>
                <textarea
                  rows={2}
                  placeholder="填写申请注意事项、往年网申踩坑点等..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>保存并写入数据库</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Excel Column Auto-Matching & Preview Modal */}
      {showImportMappingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-200 text-xs">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Excel 智能表头精准映射与对齐中心</h3>
                  <p className="text-xs text-slate-400">
                    已检测到 {rawExcelHeaders.length} 个列头与 {rawExcelRows.length} 行数据，所有院校名称将自动转为纯中文名。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportMappingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Reset Auto-Match Button */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>系统已根据表头文本智能自动预配字段。若有未对齐的字段，可在下方选择对应 Excel 列名。</span>
                </div>
                <button
                  type="button"
                  onClick={() => setColumnMapping(autoMatchHeaders(rawExcelHeaders))}
                  className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重新自动表头识别</span>
                </button>
              </div>

              {/* Column Mapping Selector Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  1. 表头列对应设置
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {SYSTEM_FIELDS.map(fieldDef => {
                    const mappedCol = columnMapping[fieldDef.key] || '';
                    return (
                      <div key={fieldDef.key} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">
                            {fieldDef.label} {fieldDef.required && <span className="text-rose-500">*</span>}
                          </span>
                          {mappedCol ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                              已匹配
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-[10px]">
                              未匹配
                            </span>
                          )}
                        </div>
                        <select
                          value={mappedCol}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [fieldDef.key]: e.target.value })}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 text-xs cursor-pointer"
                        >
                          <option value="">-- 不导入该字段 / 未匹配 --</option>
                          {rawExcelHeaders.map(col => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    2. 真实解析数据效果预览 (前 5 条)
                  </h4>
                  <span className="text-slate-500 text-[11px]">共解析出 {rawExcelRows.length} 条Checklist项目</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs min-w-[1200px]">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3">1. 院校名称 (纯中文)</th>
                        <th className="p-3">2. 专业名称</th>
                        <th className="p-3">3. 专业链接</th>
                        <th className="p-3">4. 语言要求</th>
                        <th className="p-3">5. 截止日期</th>
                        <th className="p-3">6. 作品集英文</th>
                        <th className="p-3">7. 作品集上传</th>
                        <th className="p-3">8. 个人陈述 (PS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {generateParsedItems().slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{cleanSchoolNameChineseOnly(item.schoolName)}</td>
                          <td className="p-3 font-medium text-emerald-700">{item.program}</td>
                          <td className="p-3 max-w-[180px] truncate text-slate-500 font-mono">{item.programUrl || '-'}</td>
                          <td className="p-3">{item.languageRequirement || '-'}</td>
                          <td className="p-3">{item.deadlines?.[0]?.date || '-'}</td>
                          <td className="p-3 max-w-[180px] truncate">{item.portfolioEngReq || '-'}</td>
                          <td className="p-3 max-w-[180px] truncate">{item.portfolioUploadReq || '-'}</td>
                          <td className="p-3 max-w-[180px] truncate">{item.personalStatementReq || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">
                * 确定导入后，系统将自动把 {rawExcelRows.length} 条记录存入申请 Checklist 智能总库并存写入数据库。
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportMappingModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-300 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>确认导入并存写入库 ({rawExcelRows.length} 条)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detail View Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto text-xs">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{detailModalItem.country} · {detailModalItem.degree}</span>
                <h3 className="text-lg font-bold">{cleanSchoolNameChineseOnly(detailModalItem.schoolName)}</h3>
                <p className="text-xs text-slate-300">{detailModalItem.program}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {detailModalItem.programUrl && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700 block">专业官方网址：</span>
                  <p className="text-emerald-700 font-mono select-all break-all text-xs">{detailModalItem.programUrl}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="block font-bold text-emerald-900 mb-1">语言成绩要求</span>
                  <p className="text-emerald-800">{detailModalItem.languageRequirement || '未特殊注明'}</p>
                </div>
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <span className="block font-bold text-indigo-900 mb-1">截止轮次设置</span>
                  <div className="space-y-1">
                    {detailModalItem.deadlines?.map((d, i) => (
                      <div key={i} className="text-indigo-800 font-medium">
                        {d.roundName}: {d.date}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(detailModalItem.portfolioEngReq || detailModalItem.portfolioUploadReq || detailModalItem.portfolioUrl) && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200/80 space-y-2">
                  <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    作品集 (Portfolio) 规则
                  </h4>
                  {detailModalItem.portfolioUploadReq && (
                    <p className="text-purple-800 font-medium">
                      <span className="font-bold">上传格式：</span>{detailModalItem.portfolioUploadReq}
                    </p>
                  )}
                  {detailModalItem.portfolioEngReq && (
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100 text-slate-700 font-mono text-[11px] leading-relaxed">
                      {detailModalItem.portfolioEngReq}
                    </div>
                  )}
                  {detailModalItem.portfolioUrl && (
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100 text-purple-900 font-mono text-[11px] break-all select-all">
                      <span className="font-bold block mb-0.5">作品集指南网址：</span>
                      {detailModalItem.portfolioUrl}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">申请文书与材料精细要求</h4>
                {detailModalItem.personalStatementReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">个人陈述 (PS)：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.personalStatementReq}</p>
                  </div>
                )}
                {detailModalItem.researchProposalReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">研究计划书 (RP)：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.researchProposalReq}</p>
                  </div>
                )}
                {detailModalItem.videoTaskReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">视频任务：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.videoTaskReq}</p>
                  </div>
                )}
                {detailModalItem.recommendationReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">推荐信：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.recommendationReq}</p>
                  </div>
                )}
                {detailModalItem.cvReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">个人简历 (CV)：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.cvReq}</p>
                  </div>
                )}
                {detailModalItem.otherReq && (
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">其他材料：</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{detailModalItem.otherReq}</p>
                  </div>
                )}
                {detailModalItem.notes && (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="font-bold text-amber-900 block mb-1">备注说明：</span>
                    <p className="text-amber-800 whitespace-pre-wrap leading-relaxed">{detailModalItem.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
