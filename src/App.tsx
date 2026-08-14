/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, SchoolApplication, MaterialItem, TodoItem, NotificationLog, MaterialStatus, ApplicationStatus, SchoolApplicationTemplate, MasterChecklistItem } from './types';
import { initialStudents, initialNotifications, getDefaultMaterials, normalizeStudents, getDefaultGlobalMaterials, getSchoolSpecificMaterials } from './initialData';
import { initialMasterChecklist } from './initialChecklistData';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ApplicationsView from './components/ApplicationsView';
import NotificationsView from './components/NotificationsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import ChecklistHubView, { cleanSchoolNameChineseOnly } from './components/ChecklistHubView';
import { isMaterialRequired } from './utils/materials';
import { syncICSToServer, publishToGitHubCalendar, generateICalendarFeed } from './utils/icalGenerator';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload, 
  CalendarCheck2, 
  AlertCircle,
  Save 
} from 'lucide-react';
import {
  dbSaveStudent,
  dbDeleteStudent,
  dbLoadStudents,
  dbSaveSystemSettings,
  dbLoadSystemSettings,
  dbSaveNotification,
  dbLoadNotifications,
  dbSaveStudentsBatch,
  dbSaveNotificationsBatch,
  getIsQuotaExceeded
} from './lib/firebase';

export default function App() {
  // Configurable templates
  const [globalTemplates, setGlobalTemplates] = useState<MaterialItem[]>(() => {
    try {
      const saved = localStorage.getItem('advisor_global_templates');
      return saved ? JSON.parse(saved) : getDefaultGlobalMaterials();
    } catch (e) {
      return getDefaultGlobalMaterials();
    }
  });

  const [schoolTemplates, setSchoolTemplates] = useState<MaterialItem[]>(() => {
    try {
      const saved = localStorage.getItem('advisor_school_templates');
      return saved ? JSON.parse(saved) : getSchoolSpecificMaterials();
    } catch (e) {
      return getSchoolSpecificMaterials();
    }
  });

  const [roundOptions, setRoundOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('advisor_round_options');
      return saved ? JSON.parse(saved) : ['第一轮', '第二轮', '第三轮', 'EA/ED', '早申轮', '主申轮', '延申轮', '常规轮', '最终轮'];
    } catch (e) {
      return ['第一轮', '第二轮', '第三轮', 'EA/ED', '早申轮', '主申轮', '延申轮', '常规轮', '最终轮'];
    }
  });

  // State for students - using lazy state initialization to prevent overwriting saved data on mount
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const savedGlobalTemplates = localStorage.getItem('advisor_global_templates');
      const savedSchoolTemplates = localStorage.getItem('advisor_school_templates');
      const globalT = savedGlobalTemplates ? JSON.parse(savedGlobalTemplates) : getDefaultGlobalMaterials();
      const schoolT = savedSchoolTemplates ? JSON.parse(savedSchoolTemplates) : getSchoolSpecificMaterials();

      const savedStudents = localStorage.getItem('advisor_students');
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeStudents(parsed, globalT, schoolT);
        }
      }
    } catch (e) {
      console.error('Failed to parse advisor_students from localStorage:', e);
    }
    return initialStudents;
  });

  // State for selected student id
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      const savedSelectedId = localStorage.getItem('advisor_selected_student_id');
      if (savedSelectedId) {
        return savedSelectedId;
      }
      const savedStudents = localStorage.getItem('advisor_students');
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch (e) {}
    return initialStudents[0]?.id || '';
  });

  // State for global notification logs
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const savedNotifs = localStorage.getItem('advisor_notifications');
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse notifications:', e);
    }
    return initialNotifications;
  });

  // School application templates library state
  const [applicationTemplates, setApplicationTemplates] = useState<SchoolApplicationTemplate[]>(() => {
    const saved = localStorage.getItem('advisor_custom_app_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse advisor_custom_app_templates:', e);
      }
    }
    // Default high-value preset templates
    return [
      {
        id: 'tpl-cmu-cs',
        templateName: '卡内基梅隆大学 (CMU) - 计算机科学硕士 (MS in CS)',
        schoolName: '卡内基梅隆大学 (CMU)',
        program: 'MS in Computer Science',
        country: '美国',
        languageRequirement: '雅思 7.5 (写作单项不低于 7.0)',
        deadlines: [
          { id: 'dl-1', roundName: '常规轮 (RD)', date: '2026-12-01' }
        ],
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, notes: '重点突出核心科研成果与软硬件开发项目经历。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, notes: '简历一页纸，需突出发表论文、专业GPA。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, notes: 'CS项目不需要作品集。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, notes: '非强制要件。' }
        ]
      },
      {
        id: 'tpl-hku-fin',
        templateName: '香港大学 (HKU) - 金融学硕士 (MSc in Finance)',
        schoolName: '香港大学 (HKU)',
        program: 'MSc in Finance',
        country: '中国香港',
        languageRequirement: '雅思 7.0 (单项 6.5)',
        deadlines: [
          { id: 'dl-2', roundName: '第一轮', date: '2026-09-30' },
          { id: 'dl-3', roundName: '第二轮', date: '2026-11-15' }
        ],
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, notes: '重点突出数学分析与量化建模能力，及券商/量化实习背景。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, notes: '通用简历已搞定。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, notes: '商科类项目无需。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, notes: '非强制要件。' }
        ]
      }
    ];
  });

  // Master Checklist Hub State
  const [masterChecklist, setMasterChecklist] = useState<MasterChecklistItem[]>(() => {
    const saved = localStorage.getItem('advisor_master_checklist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse advisor_master_checklist:', e);
      }
    }
    return initialMasterChecklist;
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'checklist' | 'notifications' | 'reports' | 'settings'>('dashboard');

  // Real-time system clock state
  const [systemTime, setSystemTime] = useState<Date>(new Date());

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

  // Custom Toast/Banner state
  const [appAlert, setAppAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const triggerAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAppAlert({ message, type });
    setTimeout(() => {
      setAppAlert(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeFull = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
  };

  // State to track if cloud data from Firebase Firestore is fully loaded
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Refs to store last saved JSON snapshots to avoid redundant/repeated Firestore writes
  const lastSavedStudentsRef = React.useRef<string>('');
  const lastSavedNotificationsRef = React.useRef<string>('');
  const lastSavedSettingsRef = React.useRef<string>('');

  // Synchronize state with Firebase Firestore
  useEffect(() => {
    async function initFirebaseSync() {
      if (getIsQuotaExceeded()) {
        setCloudLoaded(true);
        triggerAlert('💾 云端数据库每日免费额度已满，已自动启用本地离线缓存模式', 'info');
        return;
      }
      try {
        // 1. Load System Settings
        const settings = await dbLoadSystemSettings();
        if (getIsQuotaExceeded()) {
          setCloudLoaded(true);
          triggerAlert('💾 云端数据库每日免费额度已满，已自动启用本地离线缓存模式', 'info');
          return;
        }
        let activeGlobalTemplates = globalTemplates;
        let activeSchoolTemplates = schoolTemplates;
        let activeRoundOptions = roundOptions;
        let activeAppTemplates = applicationTemplates;
        let activeMasterList = masterChecklist;

        if (settings) {
          if (settings.globalTemplates && settings.globalTemplates.length > 0) {
            activeGlobalTemplates = settings.globalTemplates;
            setGlobalTemplates(settings.globalTemplates);
          }
          if (settings.schoolTemplates && settings.schoolTemplates.length > 0) {
            activeSchoolTemplates = settings.schoolTemplates;
            setSchoolTemplates(settings.schoolTemplates);
          }
          if (settings.roundOptions && settings.roundOptions.length > 0) {
            activeRoundOptions = settings.roundOptions;
            setRoundOptions(settings.roundOptions);
          }
          if (settings.applicationTemplates && settings.applicationTemplates.length > 0) {
            // Safely merge with local stored custom templates to preserve saved user templates
            const savedLocal = localStorage.getItem('advisor_custom_app_templates');
            let localAppTemplates: SchoolApplicationTemplate[] = [];
            if (savedLocal) {
              try { localAppTemplates = JSON.parse(savedLocal); } catch (e) {}
            }
            const tplMap = new Map<string, SchoolApplicationTemplate>();
            settings.applicationTemplates.forEach(t => tplMap.set(t.id || t.templateName, t));
            localAppTemplates.forEach(t => {
              if (!tplMap.has(t.id || t.templateName)) {
                tplMap.set(t.id || t.templateName, t);
              }
            });
            activeAppTemplates = Array.from(tplMap.values());
            setApplicationTemplates(activeAppTemplates);
          }
          if (settings.masterChecklist && settings.masterChecklist.length > 0) {
            const savedMaster = localStorage.getItem('advisor_master_checklist');
            let localMasterList: MasterChecklistItem[] = [];
            if (savedMaster) {
              try { localMasterList = JSON.parse(savedMaster); } catch (e) {}
            }
            const itemMap = new Map<string, MasterChecklistItem>();
            settings.masterChecklist.forEach(item => {
              itemMap.set(item.id, item);
            });
            localMasterList.forEach(item => {
              if (!itemMap.has(item.id)) {
                itemMap.set(item.id, item);
              } else {
                const existing = itemMap.get(item.id)!;
                if (item.updatedAt && (!existing.updatedAt || item.updatedAt >= existing.updatedAt)) {
                  itemMap.set(item.id, item);
                }
              }
            });
            activeMasterList = Array.from(itemMap.values());
            setMasterChecklist(activeMasterList);
            localStorage.setItem('advisor_master_checklist', JSON.stringify(activeMasterList));
          } else {
            const savedMaster = localStorage.getItem('advisor_master_checklist');
            if (savedMaster) {
              try {
                const parsed = JSON.parse(savedMaster);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  activeMasterList = parsed;
                  setMasterChecklist(parsed);
                }
              } catch (e) {}
            }
          }
          if (settings.lastSaveTime) {
            setLastSaveTime(settings.lastSaveTime);
            localStorage.setItem('advisor_last_save_time', settings.lastSaveTime);
          }
          if (settings.lastBackupTime) {
            setLastBackupTime(settings.lastBackupTime);
            localStorage.setItem('advisor_last_backup_time', settings.lastBackupTime);
          }
          if (settings.lastSyncedTime) {
            localStorage.setItem('advisor_last_synced_time', settings.lastSyncedTime);
          }
        } else if (!getIsQuotaExceeded()) {
          // If no system settings exist in Firestore yet, write current default/local values
          await dbSaveSystemSettings({
            globalTemplates,
            schoolTemplates,
            roundOptions,
            applicationTemplates,
            lastSaveTime,
            lastBackupTime,
            lastSyncedTime: localStorage.getItem('advisor_last_synced_time') || getFormattedDateTime()
          });
        }

        // Cache initial loaded settings snapshot
        lastSavedSettingsRef.current = JSON.stringify({
          globalTemplates: activeGlobalTemplates,
          schoolTemplates: activeSchoolTemplates,
          roundOptions: activeRoundOptions,
          applicationTemplates: activeAppTemplates,
          masterChecklist: activeMasterList
        });

        // 2. Load Students
        if (getIsQuotaExceeded()) { setCloudLoaded(true); return; }
        const cloudStudents = await dbLoadStudents();
        if (getIsQuotaExceeded()) { setCloudLoaded(true); return; }
        if (cloudStudents && cloudStudents.length > 0) {
          const normStudents = normalizeStudents(cloudStudents, activeGlobalTemplates, activeSchoolTemplates);
          setStudents(normStudents);
          lastSavedStudentsRef.current = JSON.stringify(normStudents);
          // Auto select first student if current selected doesn't exist in cloud students
          if (!cloudStudents.some(s => s.id === selectedStudentId)) {
            setSelectedStudentId(cloudStudents[0].id);
          }
        } else if (!getIsQuotaExceeded()) {
          // No students in Firestore, populate them using current local storage or initial values
          await dbSaveStudentsBatch(students);
          lastSavedStudentsRef.current = JSON.stringify(students);
        }

        // 3. Load Notifications
        if (getIsQuotaExceeded()) { setCloudLoaded(true); return; }
        const cloudNotifications = await dbLoadNotifications();
        if (getIsQuotaExceeded()) { setCloudLoaded(true); return; }
        if (cloudNotifications && cloudNotifications.length > 0) {
          setNotifications(cloudNotifications);
          lastSavedNotificationsRef.current = JSON.stringify(cloudNotifications);
        } else if (notifications.length > 0 && !getIsQuotaExceeded()) {
          await dbSaveNotificationsBatch(notifications);
          lastSavedNotificationsRef.current = JSON.stringify(notifications);
        }

        setCloudLoaded(true);
        if (getIsQuotaExceeded()) {
          triggerAlert('💾 云端数据库每日免费额度已满，已自动启用本地离线缓存模式', 'info');
        } else {
          triggerAlert('☁️ 后台云端数据库已连接并同步完毕！', 'success');
        }
      } catch (error) {
        console.error('Firebase sync error:', error);
        setCloudLoaded(true);
        triggerAlert('⚠️ 云端数据库同步失败，当前正在使用本地离线缓存', 'info');
      }
    }
    initFirebaseSync();
  }, []);

  // Sync calendar feed to backend server & GitHub repo when cloud loads or students change
  useEffect(() => {
    if (students && students.length > 0) {
      syncICSToServer(students);

      // Auto sync to GitHub repo / Gist using user token
      const token = localStorage.getItem('advisor_github_token') || '';
      const gistId = localStorage.getItem('advisor_github_gist_id') || undefined;
      publishToGitHubCalendar(generateICalendarFeed(students), token, gistId, 'shapimaomao', 'advisor-calendar').then((res) => {
        if (res.success && res.rawUrl) {
          localStorage.setItem('advisor_github_token', token);
          localStorage.setItem('advisor_github_gist_raw_url', res.rawUrl);
          if (res.webcalUrl) localStorage.setItem('advisor_github_gist_webcal_url', res.webcalUrl);
        }
      }).catch(e => {
        console.error('Auto GitHub calendar sync error:', e);
      });
    }
  }, [students, cloudLoaded]);

  // Save to LocalStorage instantly and Firebase debounced (only write to DB after first sync loaded AND data changed)
  useEffect(() => {
    localStorage.setItem('advisor_students', JSON.stringify(students));
    if (!cloudLoaded || getIsQuotaExceeded()) return;

    const timer = setTimeout(() => {
      const currentJson = JSON.stringify(students);
      if (currentJson === lastSavedStudentsRef.current) {
        // Data has not changed since last load or save: skip write to conserve Firestore write quota
        return;
      }

      // Build prevStudentsMap for smart item-level diffing so only changed student docs are written
      const prevMap = new Map<string, string>();
      try {
        const prevList: Student[] = JSON.parse(lastSavedStudentsRef.current || '[]');
        prevList.forEach(s => prevMap.set(s.id, JSON.stringify(s)));
      } catch (e) {}

      dbSaveStudentsBatch(students, prevMap)
        .then(() => {
          lastSavedStudentsRef.current = currentJson;
        })
        .catch(e => console.error('Error batch saving students:', e));
    }, 4000);

    return () => clearTimeout(timer);
  }, [students, cloudLoaded]);

  useEffect(() => {
    localStorage.setItem('advisor_notifications', JSON.stringify(notifications));
    if (!cloudLoaded || getIsQuotaExceeded()) return;

    const timer = setTimeout(() => {
      const currentJson = JSON.stringify(notifications);
      if (currentJson === lastSavedNotificationsRef.current) {
        return;
      }
      dbSaveNotificationsBatch(notifications)
        .then(() => {
          lastSavedNotificationsRef.current = currentJson;
        })
        .catch(e => console.error('Error batch saving notifications:', e));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notifications, cloudLoaded]);

  useEffect(() => {
    if (selectedStudentId) {
      localStorage.setItem('advisor_selected_student_id', selectedStudentId);
    }
  }, [selectedStudentId]);

  // Synchronize system settings to Firebase (debounced) when updated AND data changed
  useEffect(() => {
    localStorage.setItem('advisor_custom_app_templates', JSON.stringify(applicationTemplates));
    localStorage.setItem('advisor_global_templates', JSON.stringify(globalTemplates));
    localStorage.setItem('advisor_school_templates', JSON.stringify(schoolTemplates));
    localStorage.setItem('advisor_round_options', JSON.stringify(roundOptions));
    localStorage.setItem('advisor_master_checklist', JSON.stringify(masterChecklist));

    if (!cloudLoaded || getIsQuotaExceeded()) return;

    const timer = setTimeout(() => {
      const currentSettingsObj = {
        globalTemplates,
        schoolTemplates,
        roundOptions,
        applicationTemplates,
        masterChecklist
      };
      const currentJson = JSON.stringify(currentSettingsObj);
      if (currentJson === lastSavedSettingsRef.current) {
        return;
      }

      dbSaveSystemSettings(currentSettingsObj)
        .then(() => {
          lastSavedSettingsRef.current = currentJson;
        })
        .catch(e => console.error('Error saving system settings:', e));
    }, 4000);

    return () => clearTimeout(timer);
  }, [globalTemplates, schoolTemplates, roundOptions, applicationTemplates, masterChecklist, cloudLoaded]);

  // Selected student object helper
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];


  // Helper: Reset to default demo data
  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const confirmResetData = () => {
    setStudents(initialStudents);
    setNotifications(initialNotifications);
    setSelectedStudentId(initialStudents[0]?.id || '');
    setActiveTab('dashboard');
    localStorage.setItem('advisor_students', JSON.stringify(initialStudents));
    localStorage.setItem('advisor_notifications', JSON.stringify(initialNotifications));
    localStorage.setItem('advisor_selected_student_id', initialStudents[0]?.id || '');
    triggerAlert('🎉 成功恢复至系统初始演示数据！');
    setShowResetConfirm(false);
  };

  const getFormattedDateTime = (date: Date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  // Track last save and last backup times (guaranteed non-empty persistent initial state)
  const [lastSaveTime, setLastSaveTime] = useState<string>(() => {
    const saved = localStorage.getItem('advisor_last_save_time');
    if (saved) return saved;
    const initial = getFormattedDateTime();
    localStorage.setItem('advisor_last_save_time', initial);
    return initial;
  });

  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    const saved = localStorage.getItem('advisor_last_backup_time');
    if (saved) return saved;
    const initial = getFormattedDateTime();
    localStorage.setItem('advisor_last_backup_time', initial);
    return initial;
  });

  // Helper: Explicitly save all current data to local storage and database
  const handleSaveData = async (overrideMasterChecklist?: MasterChecklistItem[], overrideStudents?: Student[]) => {
    const isMasterArray = Array.isArray(overrideMasterChecklist);
    const isStudentsArray = Array.isArray(overrideStudents);

    const activeMasterList = isMasterArray ? overrideMasterChecklist : masterChecklist;
    const activeStudents = isStudentsArray ? overrideStudents : students;

    const nowStr = getFormattedDateTime();
    setLastSaveTime(nowStr);
    try {
      localStorage.setItem('advisor_last_save_time', nowStr);
    } catch (e) {}

    if (isMasterArray) {
      setMasterChecklist(overrideMasterChecklist);
    }
    if (isStudentsArray) {
      setStudents(overrideStudents);
    }

    try {
      localStorage.setItem('advisor_students', JSON.stringify(activeStudents));
      localStorage.setItem('advisor_notifications', JSON.stringify(notifications));
      localStorage.setItem('advisor_selected_student_id', selectedStudentId);
      localStorage.setItem('advisor_global_templates', JSON.stringify(globalTemplates));
      localStorage.setItem('advisor_school_templates', JSON.stringify(schoolTemplates));
      localStorage.setItem('advisor_round_options', JSON.stringify(roundOptions));
      localStorage.setItem('advisor_custom_app_templates', JSON.stringify(applicationTemplates));
      localStorage.setItem('advisor_master_checklist', JSON.stringify(activeMasterList));
      // Sync calendar feed to server
      syncICSToServer(activeStudents);
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }

    if (getIsQuotaExceeded()) {
      triggerAlert('💾 修改后的 Checklist 与个人信息已成功保存至本地存储！（离线缓存已全量生效）', 'info');
      return;
    }

    try {
      await dbSaveStudentsBatch(activeStudents);
      await dbSaveNotificationsBatch(notifications);
      await dbSaveSystemSettings({
        globalTemplates,
        schoolTemplates,
        roundOptions,
        applicationTemplates,
        masterChecklist: activeMasterList
      });

      // Update refs to prevent subsequent redundant auto-saves
      lastSavedStudentsRef.current = JSON.stringify(activeStudents);
      lastSavedNotificationsRef.current = JSON.stringify(notifications);
      lastSavedSettingsRef.current = JSON.stringify({
        globalTemplates,
        schoolTemplates,
        roundOptions,
        applicationTemplates,
        masterChecklist: activeMasterList
      });

      if (getIsQuotaExceeded()) {
        triggerAlert('💾 修改后的 Checklist 与信息已成功保存至本地存储！（当前云端数据库每日免费额度已满，已自动启用本地离线保护）', 'info');
      } else {
        triggerAlert('💾 最新 Checklist 表数据及修改已成功全量写入数据库与本地缓存！', 'success');
      }
    } catch (err) {
      console.error('Save to DB error:', err);
      triggerAlert('💾 信息已成功保存至本地离线存储！', 'info');
    }
  };

  // Helper: Backup database locally as JSON with date & 24h time in filename
  const handleBackupData = () => {
    const now = new Date();
    const nowStr = getFormattedDateTime(now);
    setLastBackupTime(nowStr);
    localStorage.setItem('advisor_last_backup_time', nowStr);

    const pad = (n: number) => String(n).padStart(2, '0');
    const fileTimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const backupObj = {
      students,
      notifications,
      selectedStudentId,
      masterChecklist,
      backupTime: nowStr
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `网申督学系统备份数据_${fileTimeStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('📂 数据备份文件已成功导出并下载！', 'success');
  };

  // Helper: Restore database from JSON
  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.students && parsed.notifications) {
          setStudents(normalizeStudents(parsed.students, globalTemplates, schoolTemplates));
          setNotifications(parsed.notifications);
          if (parsed.masterChecklist && Array.isArray(parsed.masterChecklist)) {
            setMasterChecklist(parsed.masterChecklist);
            localStorage.setItem('advisor_master_checklist', JSON.stringify(parsed.masterChecklist));
          }
          if (parsed.selectedStudentId) {
            setSelectedStudentId(parsed.selectedStudentId);
          } else if (parsed.students.length > 0) {
            setSelectedStudentId(parsed.students[0].id);
          }
          triggerAlert('🎉 成功恢复导入的备份数据！', 'success');
        } else {
          triggerAlert('备份文件格式不正确，缺少学生或通知档案。', 'error');
        }
      } catch (err) {
        triggerAlert('解析备份文件失败，请确保导入的是有效的 .json 数据。', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // --- CONTROLLER ACTIONS ---

  // 1. Student Actions
  const handleAddStudent = (name: string, targetDegree: string, targetMajor: string) => {
    const colors = ['bg-emerald-600', 'bg-indigo-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-violet-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name,
      avatarColor: randomColor,
      targetDegree,
      targetMajor,
      advisorNotes: `这是对于 ${name} 的网申督办计划。请及时修改建议文档，并在截止日前完备所有材料要件。`,
      applications: [],
      todos: [
        { id: `todo-${Date.now()}-1`, text: '起草通用个人简历 (CV) 第一版', dueDate: '2026-07-28', isCompleted: false },
        { id: `todo-${Date.now()}-2`, text: '开具中英文前三年官方成绩单', dueDate: '2026-08-05', isCompleted: false },
      ],
      globalMaterials: globalTemplates.map(t => ({ ...t, status: '未开始', feedbackDueDate: '', notes: '' }))
    };

    const updated = [...students, newStudent];
    setStudents(updated);
    setSelectedStudentId(newStudent.id);

    // Append to notifications log
    const notif: NotificationLog = {
      id: `notif-${Date.now()}`,
      type: 'info',
      studentId: newStudent.id,
      studentName: name,
      message: `已为新学生【${name}】创建督学档案。目标专业为：${targetMajor}。`,
      timestamp: getNowFormatted(),
      isRead: false
    };
    setNotifications([notif, ...notifications]);
  };

  const handleDeleteStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    if (selectedStudentId === id && updated.length > 0) {
      setSelectedStudentId(updated[0].id);
    }
    if (cloudLoaded) {
      dbDeleteStudent(id).catch(e => console.error('Error deleting student from Firebase:', e));
    }
  };

  // 2. Advisor Notes Update
  const handleUpdateAdvisorNotes = (notes: string, targetStudentId?: string) => {
    const studentIdToUpdate = targetStudentId || selectedStudentId;
    setStudents(prevStudents => prevStudents.map(s => {
      if (s.id === studentIdToUpdate) {
        return { ...s, advisorNotes: notes };
      }
      return s;
    }));
  };

  const handleUpdateIeltsScore = (score: string) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return { ...s, ieltsScore: score };
      }
      return s;
    }));
  };

  // 3. Application Actions
  const handleAddApplication = (
    appData: Omit<SchoolApplication, 'id' | 'materials'>,
    customMaterials?: { id: string; name: string; isRequired: boolean; notes: string }[]
  ) => {
    const materials = schoolTemplates.map(t => {
      const custom = customMaterials?.find(cm => cm.id === t.id);
      return {
        ...t,
        status: '未开始' as MaterialStatus,
        feedbackDueDate: '',
        isRequired: custom ? custom.isRequired : t.isRequired,
        notes: custom ? custom.notes : ''
      };
    });

    const newApp: SchoolApplication = {
      ...appData,
      id: `app-${Date.now()}`,
      materials,
    };

    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          applications: [newApp, ...s.applications]
        };
      }
      return s;
    }));

    // Alert system log
    const notif: NotificationLog = {
      id: `notif-${Date.now()}`,
      type: 'success',
      studentId: selectedStudentId,
      studentName: selectedStudent.name,
      message: `已为 ${selectedStudent.name} 增设了新目标高校【${appData.schoolName}】的网申项目，成功加载了选定专业的要件材料要求与截止日期！`,
      timestamp: getNowFormatted(),
      isRead: false
    };
    setNotifications([notif, ...notifications]);

    // Auto-save as template if not already existing
    const exists = applicationTemplates.some(
      t => t.schoolName.toLowerCase() === appData.schoolName.toLowerCase() && t.program.toLowerCase() === appData.program.toLowerCase()
    );
    if (!exists) {
      const templateName = `${appData.schoolName} - ${appData.program}`;
      const newTemplate: SchoolApplicationTemplate = {
        id: `tpl-${Date.now()}`,
        templateName,
        schoolName: appData.schoolName,
        program: appData.program,
        country: appData.country,
        languageRequirement: appData.languageRequirement,
        deadlines: appData.deadlines ? appData.deadlines.map(d => ({ id: d.id, roundName: d.roundName, date: d.date })) : [
          { id: `dl-${Date.now()}`, roundName: appData.deadlineRound || '第一轮', date: appData.deadline }
        ],
        materials: materials.map(m => ({
          id: m.id,
          name: m.name,
          isRequired: m.isRequired,
          notes: m.notes || ''
        }))
      };
      setApplicationTemplates(prev => [newTemplate, ...prev]);
    }
  };

  const handleSaveAsTemplate = (app: SchoolApplication) => {
    const templateName = `${app.schoolName} - ${app.program}`;
    const existingIndex = applicationTemplates.findIndex(
      t => t.schoolName.toLowerCase() === app.schoolName.toLowerCase() && t.program.toLowerCase() === app.program.toLowerCase()
    );

    const newTemplate: SchoolApplicationTemplate = {
      id: `tpl-${Date.now()}`,
      templateName,
      schoolName: app.schoolName,
      program: app.program,
      country: app.country,
      languageRequirement: app.languageRequirement,
      deadlines: app.deadlines ? app.deadlines.map(d => ({ id: d.id, roundName: d.roundName, date: d.date })) : [
        { id: `dl-${Date.now()}`, roundName: app.deadlineRound || '第一轮', date: app.deadline }
      ],
      materials: app.materials.map(m => ({
        id: m.id,
        name: m.name,
        isRequired: m.isRequired,
        notes: m.notes || ''
      }))
    };

    if (existingIndex >= 0) {
      const updated = [...applicationTemplates];
      updated[existingIndex] = {
        ...newTemplate,
        id: applicationTemplates[existingIndex].id
      };
      setApplicationTemplates(updated);
      triggerAlert(`🎉 已成功更新常用模板【${templateName}】！`);
    } else {
      setApplicationTemplates([newTemplate, ...applicationTemplates]);
      triggerAlert(`🎉 已成功将【${templateName}】保存为常用模板！可在添加目标院校时一键快捷导入。`);
    }
  };

  const handleDeleteApplication = (appId: string) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          applications: s.applications.filter(a => a.id !== appId)
        };
      }
      return s;
    }));
  };

  const handleUpdateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          applications: s.applications.map(a => {
            if (a.id === appId) {
              return { ...a, status };
            }
            return a;
          })
        };
      }
      return s;
    }));
  };

  const handleUpdateApplicationDetails = (appId: string, updates: Partial<SchoolApplication>) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          applications: s.applications.map(a => {
            if (a.id === appId) {
              return { ...a, ...updates };
            }
            return a;
          })
        };
      }
      return s;
    }));
  };

  // Helper to sync material feedbackDueDate to student.todos
  const syncMaterialTodo = (
    todos: TodoItem[],
    materialId: string,
    materialName: string,
    dueDate: string,
    isCompleted: boolean,
    schoolName?: string
  ): TodoItem[] => {
    const todoId = `todo-mat-${materialId}`;
    const existingIndex = todos.findIndex(t => t.id === todoId);

    if (!dueDate) {
      return todos.filter(t => t.id !== todoId);
    }

    const todoText = `【要件督办】${schoolName ? schoolName + ': ' : ''}${materialName}`;

    if (existingIndex >= 0) {
      const updated = [...todos];
      updated[existingIndex] = {
        ...updated[existingIndex],
        text: todoText,
        dueDate: dueDate,
        isCompleted: isCompleted,
        associatedSchool: schoolName || '通用'
      };
      return updated;
    } else {
      const newTodo: TodoItem = {
        id: todoId,
        text: todoText,
        dueDate: dueDate,
        isCompleted: isCompleted,
        associatedSchool: schoolName || '通用'
      };
      return [newTodo, ...todos];
    }
  };

  // 4. Material Checklist Actions
  const handleUpdateMaterial = (appId: string, materialId: string, updates: Partial<MaterialItem>) => {
    const isGlobal = globalTemplates.some(g => g.id === materialId);

    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        let updatedTodos = s.todos;
        let updatedGlobal = s.globalMaterials;
        let updatedApps = s.applications;

        if (isGlobal) {
          updatedGlobal = s.globalMaterials.map(m => {
            if (m.id === materialId) {
              const finalItem = { ...m, ...updates };
              if (updates.isRequired === false) {
                finalItem.status = '未开始';
              }
              if (updates.feedbackDueDate !== undefined) {
                updatedTodos = syncMaterialTodo(
                  updatedTodos,
                  m.id,
                  m.name,
                  finalItem.feedbackDueDate,
                  finalItem.status === '已完成' || finalItem.status === '已提交',
                  '通用材料'
                );
              }
              return finalItem;
            }
            return m;
          });

          // Check if global material status was updated or has a feedback date
          const targetGlobal = updatedGlobal.find(m => m.id === materialId);
          const hasProgress = targetGlobal && (targetGlobal.status !== '未开始' || (!!targetGlobal.feedbackDueDate && targetGlobal.feedbackDueDate.trim() !== ''));
          if (hasProgress) {
            updatedApps = updatedApps.map(app => {
              if (app.status === '未开始') {
                return { ...app, status: '材料准备中' };
              }
              return app;
            });
          }
        } else {
          updatedApps = s.applications.map(app => {
            if (app.id === appId) {
              const updatedMaterials = app.materials.map(m => {
                if (m.id === materialId) {
                  const finalItem = { ...m, ...updates };
                  if (updates.isRequired === false) {
                    finalItem.status = '未开始';
                  }
                  if (updates.feedbackDueDate !== undefined) {
                    updatedTodos = syncMaterialTodo(
                      updatedTodos,
                      m.id,
                      m.name,
                      finalItem.feedbackDueDate,
                      finalItem.status === '已完成' || finalItem.status === '已提交',
                      app.schoolName
                    );
                  }
                  return finalItem;
                }
                return m;
              });

              // Check if material has status updated or feedbackDueDate set/updated
              const targetMat = updatedMaterials.find(m => m.id === materialId);
              let nextAppStatus = app.status;
              if (app.status === '未开始') {
                const isProgressed = targetMat && (targetMat.status !== '未开始' || (!!targetMat.feedbackDueDate && targetMat.feedbackDueDate.trim() !== ''));
                if (isProgressed) {
                  nextAppStatus = '材料准备中';
                }
              }

              return {
                ...app,
                status: nextAppStatus,
                materials: updatedMaterials
              };
            }
            return app;
          });
        }

        return {
          ...s,
          globalMaterials: updatedGlobal,
          applications: updatedApps,
          todos: updatedTodos
        };
      }
      return s;
    }));
  };

  // 5. To-Do Checklist Actions
  const handleAddTodo = (text: string, dueDate: string, associatedSchool?: string) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text,
      dueDate,
      isCompleted: false,
      associatedSchool
    };

    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          todos: [newTodo, ...s.todos]
        };
      }
      return s;
    }));
  };

  const handleToggleTodo = (todoId: string) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          todos: s.todos.map(t => {
            if (t.id === todoId) {
              return { ...t, isCompleted: !t.isCompleted };
            }
            return t;
          })
        };
      }
      return s;
    }));
  };

  const handleDeleteTodo = (todoId: string) => {
    setStudents(students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          todos: s.todos.filter(t => t.id !== todoId)
        };
      }
      return s;
    }));
  };

  // Universal handlers for Calendar / cross-student management
  const handleToggleTodoAll = (studentId: string, todoId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          todos: s.todos.map(t => t.id === todoId ? { ...t, isCompleted: !t.isCompleted } : t)
        };
      }
      return s;
    }));
  };

  const handleUpdateMaterialAll = (studentId: string, appId: string, materialId: string, status: '未开始' | '准备中' | '待修改' | '已完成' | '已提交') => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const isGlobal = s.globalMaterials.some(m => m.id === materialId);
        if (isGlobal) {
          const newGlobals = s.globalMaterials.map(m => m.id === materialId ? { ...m, status } : m);
          const shouldUpdateApps = status !== '未开始';
          return {
            ...s,
            globalMaterials: newGlobals,
            applications: shouldUpdateApps
              ? s.applications.map(app => app.status === '未开始' ? { ...app, status: '材料准备中' } : app)
              : s.applications
          };
        } else {
          return {
            ...s,
            applications: s.applications.map(app => {
              if (app.id === appId) {
                const newMaterials = app.materials.map(m => m.id === materialId ? { ...m, status } : m);
                const nextAppStatus = (app.status === '未开始' && status !== '未开始') ? '材料准备中' : app.status;
                return {
                  ...app,
                  status: nextAppStatus,
                  materials: newMaterials
                };
              }
              return app;
            })
          };
        }
      }
      return s;
    }));
  };

  const handleUpdateApplicationStatusAll = (studentId: string, appId: string, status: ApplicationStatus) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          applications: s.applications.map(a => a.id === appId ? { ...a, status } : a)
        };
      }
      return s;
    }));
  };

  const handleRescheduleCalendarEvent = (
    studentId: string,
    type: 'todo' | 'feedback' | 'deadline',
    newDate: string,
    options?: {
      todoId?: string;
      appId?: string;
      materialId?: string;
      deadlineRoundId?: string;
    }
  ) => {
    let itemTitle = '任务';
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;

      if (type === 'todo' && options?.todoId) {
        return {
          ...s,
          todos: s.todos.map(t => {
            if (t.id === options.todoId) {
              itemTitle = `待办【${t.text}】`;
              return { ...t, dueDate: newDate };
            }
            return t;
          })
        };
      }

      if (type === 'feedback' && options?.materialId) {
        const isGlobal = s.globalMaterials.some(m => m.id === options.materialId);
        if (isGlobal) {
          const newGlobals = s.globalMaterials.map(m => {
            if (m.id === options.materialId) {
              itemTitle = `通用材料【${m.name}】`;
              return { ...m, feedbackDueDate: newDate };
            }
            return m;
          });
          const shouldUpdateApps = !!(newDate && newDate.trim() !== '');
          return {
            ...s,
            globalMaterials: newGlobals,
            applications: shouldUpdateApps
              ? s.applications.map(app => app.status === '未开始' ? { ...app, status: '材料准备中' } : app)
              : s.applications
          };
        } else if (options.appId) {
          return {
            ...s,
            applications: s.applications.map(app => {
              if (app.id === options.appId) {
                const newMats = app.materials.map(m => {
                  if (m.id === options.materialId) {
                    itemTitle = `【${app.schoolName}】要件【${m.name}】`;
                    return { ...m, feedbackDueDate: newDate };
                  }
                  return m;
                });
                const nextAppStatus = (app.status === '未开始' && !!(newDate && newDate.trim() !== '')) ? '材料准备中' : app.status;
                return {
                  ...app,
                  status: nextAppStatus,
                  materials: newMats
                };
              }
              return app;
            })
          };
        }
      }

      if (type === 'deadline' && options?.appId) {
        return {
          ...s,
          applications: s.applications.map(app => {
            if (app.id === options.appId) {
              itemTitle = `【${app.schoolName}】网申截止`;
              if (options.deadlineRoundId && app.deadlines) {
                return {
                  ...app,
                  deadlines: app.deadlines.map(d => d.id === options.deadlineRoundId ? { ...d, date: newDate } : d),
                  deadline: newDate
                };
              }
              return { ...app, deadline: newDate };
            }
            return app;
          })
        };
      }

      return s;
    }));

    const targetStudent = students.find(s => s.id === studentId);
    triggerAlert(`📅 已将 ${targetStudent ? targetStudent.name : ''} 的${itemTitle} 调整至 ${newDate}！所有关联网申提醒与日历全网已即时同步。`, 'success');
  };

  const handleDeleteCalendarEvent = (
    studentId: string,
    type: 'todo' | 'feedback' | 'deadline',
    options?: {
      todoId?: string;
      appId?: string;
      materialId?: string;
      deadlineRoundId?: string;
    }
  ) => {
    let deletedTitle = '任务';
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;

      if (type === 'todo' && options?.todoId) {
        const targetTodo = s.todos.find(t => t.id === options.todoId);
        if (targetTodo) deletedTitle = `待办【${targetTodo.text}】`;
        return {
          ...s,
          todos: s.todos.filter(t => t.id !== options.todoId)
        };
      }

      if (type === 'feedback' && options?.materialId) {
        const isGlobal = s.globalMaterials.some(m => m.id === options.materialId);
        if (isGlobal) {
          const mat = s.globalMaterials.find(m => m.id === options.materialId);
          if (mat) deletedTitle = `通用材料【${mat.name}】督办限期`;
          return {
            ...s,
            globalMaterials: s.globalMaterials.map(m => m.id === options.materialId ? { ...m, feedbackDueDate: '' } : m),
            todos: s.todos.filter(t => t.id !== `todo-mat-${options.materialId}`)
          };
        } else if (options.appId) {
          const app = s.applications.find(a => a.id === options.appId);
          const mat = app?.materials.find(m => m.id === options.materialId);
          if (mat) deletedTitle = `【${app?.schoolName}】要件【${mat.name}】督办限期`;
          return {
            ...s,
            applications: s.applications.map(a => {
              if (a.id === options.appId) {
                return {
                  ...a,
                  materials: a.materials.map(m => m.id === options.materialId ? { ...m, feedbackDueDate: '' } : m)
                };
              }
              return a;
            }),
            todos: s.todos.filter(t => t.id !== `todo-mat-${options.materialId}`)
          };
        }
      }

      if (type === 'deadline' && options?.appId) {
        const app = s.applications.find(a => a.id === options.appId);
        if (app) deletedTitle = `【${app.schoolName}】网申截止日`;
        return {
          ...s,
          applications: s.applications.map(a => {
            if (a.id === options.appId) {
              if (options.deadlineRoundId && a.deadlines) {
                return {
                  ...a,
                  deadlines: a.deadlines.map(d => d.id === options.deadlineRoundId ? { ...d, date: '' } : d)
                };
              }
              return { ...a, deadline: '' };
            }
            return a;
          })
        };
      }

      return s;
    }));

    const targetStudent = students.find(s => s.id === studentId);
    triggerAlert(`🗑️ 已移除 ${targetStudent ? targetStudent.name : ''} 的 ${deletedTitle}！`, 'info');
  };

  // 6. Notification Center Actions
  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => {
      if (n.id === id) return { ...n, isRead: true };
      return n;
    }));
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleSendCustomNotification = (
    studentId: string, 
    message: string, 
    type: 'danger' | 'warning' | 'info' | 'success'
  ) => {
    const target = students.find(s => s.id === studentId);
    if (!target) return;

    const notif: NotificationLog = {
      id: `notif-${Date.now()}`,
      type,
      studentId,
      studentName: target.name,
      message,
      timestamp: getNowFormatted(),
      isRead: false
    };

    setNotifications([notif, ...notifications]);

    // Insert an automated matching task to the student todo card if warning or danger
    if (type === 'warning' || type === 'danger') {
      const isPS = message.includes('个人陈述') || message.includes('PS');
      const isRL = message.includes('推荐信') || message.includes('RL');
      let text = `根据导师进度催办尽快完备或修改：相关网申文书材料`;
      if (isPS) text = `【急】修改并提供最新版本的个人陈述 (PS) 稿件`;
      if (isRL) text = `【急】联系推荐人教授跟进并签名推荐信`;

      const newTodo: TodoItem = {
        id: `todo-auto-${Date.now()}`,
        text,
        dueDate: '2026-07-25', // 4 days from mock today
        isCompleted: false,
        associatedSchool: '催办任务'
      };

      setStudents(students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            todos: [newTodo, ...s.todos]
          };
        }
        return s;
      }));
    }
  };

  // 7. System Setting Actions
  const handleSaveGlobalTemplates = (updated: MaterialItem[]) => {
    setGlobalTemplates(updated);
    localStorage.setItem('advisor_global_templates', JSON.stringify(updated));
  };

  const handleSaveSchoolTemplates = (updated: MaterialItem[]) => {
    setSchoolTemplates(updated);
    localStorage.setItem('advisor_school_templates', JSON.stringify(updated));
  };

  const handleSaveRoundOptions = (updated: string[]) => {
    setRoundOptions(updated);
    localStorage.setItem('advisor_round_options', JSON.stringify(updated));
  };

  // Helper to sync a single template to all students with matching applications
  const syncTemplateToStudentsHelper = (template: SchoolApplicationTemplate, currentStudents: Student[]): { updatedStudents: Student[]; syncCount: number } => {
    let syncCount = 0;
    const updatedStudents = currentStudents.map(student => {
      let studentMatched = false;
      const updatedApps = (student.applications || []).map(app => {
        const appSchool = app.schoolName.trim().toLowerCase();
        const tplSchool = template.schoolName.trim().toLowerCase();
        const appProg = app.program.trim().toLowerCase();
        const tplProg = template.program.trim().toLowerCase();

        const isSchoolMatch = appSchool === tplSchool || appSchool.includes(tplSchool) || tplSchool.includes(appSchool);
        const isProgMatch = appProg === tplProg || appProg.includes(tplProg) || tplProg.includes(appProg);

        if (isSchoolMatch && isProgMatch) {
          studentMatched = true;

          // Sync materials
          const templateMats = template.materials || [];
          const appMats = app.materials || [];

          const updatedAppMats = appMats.map(mat => {
            const tMat = templateMats.find(tm => tm.name === mat.name || tm.id === mat.id);
            if (tMat) {
              return {
                ...mat,
                isRequired: tMat.isRequired,
                notes: mat.notes || ''
              };
            }
            return mat;
          });

          templateMats.forEach(tMat => {
            const exists = updatedAppMats.some(m => m.name === tMat.name || m.id === tMat.id);
            if (exists) return;
            if (tMat.isRequired) {
              updatedAppMats.push({
                id: tMat.id || `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: tMat.name,
                isRequired: true,
                status: '未开始' as MaterialStatus,
                feedbackDueDate: '',
                notes: ''
              });
            }
          });

          // Sync deadlines
          const newDeadlines = template.deadlines && template.deadlines.length > 0
            ? template.deadlines.map(d => ({ ...d }))
            : app.deadlines;

          return {
            ...app,
            country: template.country || app.country,
            languageRequirement: template.languageRequirement !== undefined ? template.languageRequirement : app.languageRequirement,
            deadlines: newDeadlines,
            deadlineRound: newDeadlines && newDeadlines[0] ? newDeadlines[0].roundName : app.deadlineRound,
            deadline: newDeadlines && newDeadlines[0] ? newDeadlines[0].date : app.deadline,
            materials: updatedAppMats
          };
        }
        return app;
      });

      if (studentMatched) {
        syncCount++;
        return {
          ...student,
          applications: updatedApps
        };
      }
      return student;
    });

    return { updatedStudents, syncCount };
  };

  const handleSyncSingleTemplate = (template: SchoolApplicationTemplate) => {
    const { updatedStudents, syncCount } = syncTemplateToStudentsHelper(template, students);
    setStudents(updatedStudents);
    if (syncCount > 0) {
      triggerAlert(`🎉 已成功将【${template.templateName}】最新截止日期与要件规范同步给 ${syncCount} 位选报该专业的学生！`, 'success');
    } else {
      triggerAlert(`ℹ️ 已保存专业方案【${template.templateName}】。当前全员学生中暂无选择此专业的志愿。`, 'info');
    }
  };

  const handleSyncAllStudents = () => {
    let updatedStudents = students.map(student => {
      // 1. Sync globalMaterials
      const existingGlobals = student.globalMaterials || [];
      const syncedGlobals = globalTemplates.map(template => {
        const existing = existingGlobals.find(g => g.id === template.id);
        if (existing) {
          return {
            ...existing,
            name: template.name,
            isRequired: template.isRequired
          };
        }
        return {
          ...template,
          status: '未开始' as MaterialStatus,
          feedbackDueDate: '',
          notes: ''
        };
      });

      // 2. Sync applications
      const syncedApplications = (student.applications || []).map(app => {
        const existingSchoolMats = app.materials || [];
        const syncedSchoolMats = schoolTemplates.map(template => {
          const existing = existingSchoolMats.find(sm => sm.id === template.id);
          if (existing) {
            return {
              ...existing,
              name: template.name,
              isRequired: template.isRequired
            };
          }
          return {
            ...template,
            status: '未开始' as MaterialStatus,
            feedbackDueDate: '',
            notes: ''
          };
        });

        return {
          ...app,
          materials: syncedSchoolMats
        };
      });

      return {
        ...student,
        globalMaterials: syncedGlobals,
        applications: syncedApplications
      };
    });

    // 3. Sync all application templates across all students
    applicationTemplates.forEach(tpl => {
      const res = syncTemplateToStudentsHelper(tpl, updatedStudents);
      updatedStudents = res.updatedStudents;
    });

    setStudents(updatedStudents);
    triggerAlert('🎉 已完成全员全局热同步！通用材料、校本要件以及所有常用专业方案的最新截止日期与要求均已同步至所有学生！', 'success');
  };

  const handleUpdateStudentApplications = (studentId: string, updatedApps: SchoolApplication[]) => {
    setStudents(prev => {
      const nextStudents = prev.map(s => {
        if (s.id === studentId) {
          return { ...s, applications: updatedApps };
        }
        return s;
      });
      localStorage.setItem('advisor_students', JSON.stringify(nextStudents));
      return nextStudents;
    });
  };

  const handleSyncMasterToStudents = (currentMasterList: MasterChecklistItem[]): Student[] => {
    setMasterChecklist(currentMasterList);
    localStorage.setItem('advisor_master_checklist', JSON.stringify(currentMasterList));

    const updatedStudents = students.map(student => {
      let hasChanges = false;
      const newApps = (student.applications || []).map(app => {
        const cleanAppSchool = cleanSchoolNameChineseOnly(app.schoolName).trim().toLowerCase();
        const cleanAppProg = app.program.trim().toLowerCase();

        const matchMaster = currentMasterList.find(m => {
          if (app.masterChecklistId && m.id === app.masterChecklistId) return true;
          const cleanMSchool = cleanSchoolNameChineseOnly(m.schoolName).trim().toLowerCase();
          const schoolMatch = cleanMSchool && cleanAppSchool && (
            cleanMSchool === cleanAppSchool ||
            cleanMSchool.includes(cleanAppSchool) ||
            cleanAppSchool.includes(cleanMSchool)
          );
          const cleanMProg = m.program.trim().toLowerCase();
          const programMatch = cleanMProg && cleanAppProg && (
            cleanMProg === cleanAppProg ||
            cleanMProg.includes(cleanAppProg) ||
            cleanAppProg.includes(cleanMProg)
          );
          return schoolMatch && programMatch;
        });

        if (matchMaster) {
          hasChanges = true;
          const primaryDL = matchMaster.deadlines?.[0]?.date || app.deadline;
          const primaryRound = matchMaster.deadlines?.[0]?.roundName || app.deadlineRound;

          return {
            ...app,
            masterChecklistId: matchMaster.id,
            deadline: primaryDL,
            deadlineRound: primaryRound,
            deadlines: matchMaster.deadlines && matchMaster.deadlines.length > 0 ? matchMaster.deadlines : app.deadlines,
            languageRequirement: matchMaster.languageRequirement !== undefined ? matchMaster.languageRequirement : app.languageRequirement,
            materials: (app.materials || []).map(m => {
              if (m.id === 'ps') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.personalStatementReq) };
              }
              if (m.id === 'rp') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.researchProposalReq) };
              }
              if (m.id === 'portfolio') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.portfolioUploadReq) || isMaterialRequired(matchMaster.portfolioEngReq) };
              }
              if (m.id === 'video') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.videoTaskReq) };
              }
              if (m.id === 'cv') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.cvReq) };
              }
              if (m.id === 'recLetter1' || m.id === 'recLetter2') {
                return { ...m, isRequired: isMaterialRequired(matchMaster.recommendationReq) };
              }
              return m;
            })
          };
        }
        return app;
      });

      return hasChanges ? { ...student, applications: newApps } : student;
    });

    setStudents(updatedStudents);
    localStorage.setItem('advisor_students', JSON.stringify(updatedStudents));

    return updatedStudents;
  };

  const handleReorderApplications = (reorderedApps: SchoolApplication[]) => {
    if (!selectedStudentId) return;
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentId) {
        return { ...s, applications: reorderedApps };
      }
      return s;
    }));
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden text-slate-700 font-sans antialiased">
      {/* 1. Sidebar Nav */}
      <Sidebar
        students={students}
        selectedStudentId={selectedStudentId}
        onSelectStudent={setSelectedStudentId}
        onAddStudent={handleAddStudent}
        onDeleteStudent={handleDeleteStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top bar (Global system bar) */}
        <header className="bg-white h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <CalendarCheck2 className="h-5 w-5 text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">系统核实时间（实时更新）</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatTimeFull(systemTime)}</span>
            </div>
          </div>

          {/* Database management tools */}
          <div className="flex items-start gap-3">
            {cloudLoaded ? (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg border border-indigo-100/80 flex items-center gap-1 mt-0.5 shrink-0">
                <Database className="h-3 w-3 text-indigo-600 animate-pulse" />
                云端后台已连接
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-1 rounded-lg border border-amber-100/80 flex items-center gap-1 mt-0.5 shrink-0">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                同步云端中...
              </span>
            )}

            {/* Reset data button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleResetData}
                className="h-7.5 px-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                title="重置到预置的示例学生数据"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                重置演示
              </button>
              <span className="text-[10px] text-transparent select-none mt-0.5 font-mono">0</span>
            </div>

            {/* Save data button & timestamp */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleSaveData()}
                className="h-7.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                title="立即将当前所有修改信息与学生进度保存写入数据库"
              >
                <Save className="h-3.5 w-3.5" />
                保存
              </button>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap font-medium tracking-tight">
                {lastSaveTime}
              </span>
            </div>

            {/* Backup data button & timestamp */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleBackupData}
                className="h-7.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                title="将所有录入的学生材料进度和配置导出为本地JSON文件"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                备份
              </button>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap font-medium tracking-tight">
                {lastBackupTime}
              </span>
            </div>

            {/* Restore data */}
            <div className="flex flex-col items-center">
              <label
                className="h-7.5 px-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                title="导入之前备份的网申系统.json文件"
              >
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                <span>导入</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-transparent select-none mt-0.5 font-mono">0</span>
            </div>
          </div>
        </header>

        {/* 3. Panel Content Switch */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'checklist' ? (
            <ChecklistHubView
              masterChecklist={masterChecklist}
              onUpdateMasterChecklist={(newList) => {
                setMasterChecklist(newList);
                localStorage.setItem('advisor_master_checklist', JSON.stringify(newList));
                handleSyncMasterToStudents(newList);
              }}
              students={students}
              onUpdateStudentApplications={handleUpdateStudentApplications}
              onSyncMasterToStudents={handleSyncMasterToStudents}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              triggerAlert={triggerAlert}
              onSaveToDatabase={handleSaveData}
              roundOptions={roundOptions}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView
              students={students}
              globalTemplates={globalTemplates}
              schoolTemplates={schoolTemplates}
              roundOptions={roundOptions}
              applicationTemplates={applicationTemplates}
              onSaveGlobalTemplates={handleSaveGlobalTemplates}
              onSaveSchoolTemplates={handleSaveSchoolTemplates}
              onSaveRoundOptions={handleSaveRoundOptions}
              onSyncAllStudents={handleSyncAllStudents}
              onSaveApplicationTemplates={setApplicationTemplates}
              onSyncSingleTemplate={handleSyncSingleTemplate}
            />
          ) : selectedStudent ? (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  student={selectedStudent}
                  allStudents={students}
                  onSelectStudent={setSelectedStudentId}
                  onUpdateAdvisorNotes={handleUpdateAdvisorNotes}
                  onUpdateIeltsScore={handleUpdateIeltsScore}
                  onAddTodo={handleAddTodo}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onSendAlert={(msg, type) => handleSendCustomNotification(selectedStudent.id, msg, type)}
                />
              )}

              {activeTab === 'applications' && (
                <ApplicationsView
                  student={selectedStudent}
                  roundOptions={roundOptions}
                  applicationTemplates={applicationTemplates}
                  onAddApplication={handleAddApplication}
                  onDeleteApplication={handleDeleteApplication}
                  onUpdateMaterial={handleUpdateMaterial}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                  onUpdateApplicationDetails={handleUpdateApplicationDetails}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onDeleteTemplate={(tplId) => {
                    setApplicationTemplates(prev => prev.filter(t => t.id !== tplId));
                  }}
                  onReorderApplications={handleReorderApplications}
                  onUpdateIeltsScore={handleUpdateIeltsScore}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsView
                  notifications={notifications}
                  students={students}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={setSelectedStudentId}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllRead={handleMarkAllRead}
                  onClearNotifications={handleClearNotifications}
                  onSendCustomNotification={handleSendCustomNotification}
                  onToggleTodoAll={handleToggleTodoAll}
                  onUpdateMaterialAll={handleUpdateMaterialAll}
                  onUpdateApplicationStatusAll={handleUpdateApplicationStatusAll}
                  onRescheduleEvent={handleRescheduleCalendarEvent}
                  onDeleteEvent={handleDeleteCalendarEvent}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  students={students}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={setSelectedStudentId}
                  onUpdateAdvisorNotes={(notes, targetId) => handleUpdateAdvisorNotes(notes, targetId)}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <AlertCircle className="h-10 w-10 opacity-30" />
              <p className="font-semibold text-sm">暂未选择学生档案，请先在左侧栏创建学生。</p>
            </div>
          )}
        </main>
      </div>

      {/* Dynamic Slide-in Toast Banner */}
      {appAlert && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3.5 bg-slate-900 border border-slate-850 text-white text-xs font-bold rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`w-2 h-2 rounded-full shrink-0 ${appAlert.type === 'error' ? 'bg-rose-500 animate-pulse' : appAlert.type === 'info' ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
          <span>{appAlert.message}</span>
        </div>
      )}

      {/* Custom Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl text-left text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">确认重置演示数据？</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              您确定要重置所有修改，并恢复至系统初始演示数据吗？这将覆盖您当前录入的所有学生材料、截止日期和进度备注。此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
