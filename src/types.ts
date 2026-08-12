/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialStatus = '未开始' | '准备中' | '待修改' | '已完成' | '已提交';

export interface MaterialItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: MaterialStatus;
  feedbackDueDate: string; // YYYY-MM-DD
  notes: string;
  portfolioRound?: string; // e.g. '第一轮', '第二轮', etc.
  portfolioDeadline?: string; // YYYY-MM-DD
}

export type ApplicationStatus = '未开始' | '材料准备中' | '已提交' | '面试中' | '已录取' | '被拒绝' | '待定';

export interface DeadlineRound {
  id: string;
  roundName: string; // e.g. '第一轮', '第二轮', '最终轮', etc.
  date: string; // YYYY-MM-DD
}

export interface SchoolApplication {
  id: string;
  schoolName: string;
  program: string;
  country: string;
  deadline: string; // YYYY-MM-DD (legacy/primary fallback)
  deadlineRound?: string; // legacy/primary fallback
  deadlines?: DeadlineRound[]; // Multiple rounds
  intendedRoundId?: string; // ID of the intended/selected application round
  intendedRoundName?: string; // Name/label of intended round e.g. '第二轮'
  status: ApplicationStatus;
  materials: MaterialItem[];
  languageRequirement?: string; // e.g. "雅思 6.0" or "7.0 (6.0)"
  displayOrder?: number; // Custom sequence/sorting order (e.g. 1, 2, 3...)
}

export interface TodoItem {
  id: string;
  text: string;
  dueDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  associatedSchool?: string;
}

export interface NotificationLog {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  studentId: string;
  studentName: string;
  message: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  isRead: boolean;
}

export interface Student {
  id: string;
  name: string;
  avatarColor: string; // Tailwind bg color class
  targetDegree: string;
  targetMajor: string;
  advisorNotes: string; // 导师督促建议
  applications: SchoolApplication[];
  todos: TodoItem[];
  globalMaterials: MaterialItem[];
  ieltsScore?: string; // Student's existing language/IELTS score
  batchTag?: string; // Optional batch tag e.g. '2026Fall'
}

export interface SchoolApplicationTemplate {
  id: string;
  templateName: string; // e.g. "卡内基梅隆大学 (CMU) - MS in CS"
  schoolName: string;
  program: string;
  country: string;
  languageRequirement?: string;
  deadlines: { id: string; roundName: string; date: string }[];
  materials?: { id: string; name: string; isRequired: boolean; notes: string }[];
}

export interface MasterChecklistItem {
  id: string;
  schoolName: string;            // 学校名称 (e.g. 卡内基梅隆大学 (CMU))
  program: string;               // 专业名称 (e.g. MS in Computer Science)
  country: string;               // 国家/地区 (e.g. 美国, 英国, 新加坡, 中国香港)
  degree: string;                // 学位/层次 (e.g. 硕士研究生, 本科, 博士)
  programUrl?: string;           // 专业官网链接
  languageRequirement?: string;  // 语言要求 (e.g. 雅思 7.5 (单项 7.0))
  deadlines: { id: string; roundName: string; date: string }[]; // 截止日期/轮次
  portfolioEngReq?: string;      // 作品集官网英文要求
  portfolioUploadReq?: string;   // 作品集上传要求 (如 PDF不超过 20MB / 网页链接)
  portfolioUrl?: string;         // 作品集要求官网链接
  personalStatementReq?: string; // 个人陈述 (PS) 要求
  researchProposalReq?: string;  // 研究计划书 (RP) 要求
  videoTaskReq?: string;         // 视频任务要求
  recommendationReq?: string;    // 推荐信要求
  cvReq?: string;                // 简历要求
  otherReq?: string;             // 其他材料要求
  notes?: string;                // 关键备注说明
  updatedAt?: string;            // 最后更新时间
}

export function formatDeadlineDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const trimmed = dateStr.trim();
    // Match date formats like YYYY-MM-DD or YYYY-MM
    const match = trimmed.match(/^(\d{4})[-/]?(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      if (year < 2026 || (year === 2026 && month < 6)) {
        return `${trimmed} (去年截止日期参考)`;
      }
    } else {
      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        const threshold = new Date('2026-06-01');
        if (dateObj < threshold) {
          return `${trimmed} (去年截止日期参考)`;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return dateStr;
}


