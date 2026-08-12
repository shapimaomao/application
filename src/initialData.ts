/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, MaterialItem, SchoolApplication, TodoItem, NotificationLog } from './types';

// Helper to generate school-specific materials list (PS, RP, Portfolio, Video)
export const getSchoolSpecificMaterials = (): MaterialItem[] => [
  { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'rp', name: '研究计划书 (RP)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
];

// Helper to generate default global materials list
export const getDefaultGlobalMaterials = (): MaterialItem[] => [
  { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
  { id: 'chsiCert', name: '学信网认证 (CHSI Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
];

// Helper to generate standard default materials list
export const getDefaultMaterials = (): MaterialItem[] => [
  ...getSchoolSpecificMaterials(),
  ...getDefaultGlobalMaterials(),
];

const rawInitialStudents: any[] = [
  {
    id: 'student-gu',
    name: '古弘懿',
    avatarColor: 'bg-indigo-600',
    targetDegree: '2027秋季 硕士研究生',
    targetMajor: '计算机科学与数据科学 (Computer Science & Data Science)',
    ieltsScore: '7.0 (L:7.5, R:7.5, W:6.5, S:6.0)',
    advisorNotes: '古弘懿同学的全案留学规划已经启动。目前重点是：1. 针对南洋理工大学 (NTU) 和新加坡国立大学 (NUS) 的个人陈述（PS）大纲起草，突出其算法与数据结构课程的高分以及科研项目；2. 尽快联系校内推荐人（两位副教授），确保在9月份前完成推荐信大纲；3. 雅思成绩目前总分7.0，如需申请顶尖CS项目，建议在大四上学期尝试刷分至 7.5。',
    applications: [
      {
        id: 'app-gu-1',
        schoolName: '新加坡国立大学',
        program: 'MS in Computer Science',
        country: '新加坡',
        deadline: '2026-11-15',
        status: '材料准备中',
        languageRequirement: '7.0 (单项 6.5)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-15', notes: '已整理出核心经历大纲，待撰写初稿。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-25', notes: '通用CV英文版已搞定。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: 'CS项目非强制作品集。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-25', notes: '学术推荐人A已大致同意。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-30', notes: '学术推荐人B沟通中。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '大四在读。' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '大一至大三官方中英文成绩单已扫描。' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '中英文在读证明已开具。' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '2026-09-10', notes: '官方评分标准待获取。' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
        ],
      },
      {
        id: 'app-gu-2',
        schoolName: '南洋理工大学',
        program: 'MSc in Data Science',
        country: '新加坡',
        deadline: '2026-12-31',
        status: '材料准备中',
        languageRequirement: '6.5 (单项 6.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-30', notes: '待NUS PS第一版定稿后进行个性化适配。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-25', notes: '通用简历。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-25', notes: '复用推荐信。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-30', notes: '复用推荐信。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '2026-09-10', notes: '' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
        ],
      }
    ],
    todos: [
      { id: 'todo-gu-1', text: '起草新加坡国立大学 (NUS) 的个人陈述（PS）初稿大纲', dueDate: '2026-08-10', isCompleted: false, associatedSchool: '新加坡国立大学 (NUS)' },
      { id: 'todo-gu-2', text: '与两位推荐人教授沟通推荐信撰写事宜', dueDate: '2026-07-30', isCompleted: false, associatedSchool: '通用' },
      { id: 'todo-gu-3', text: '扫描大一至大三的中英文官方成绩单与在读证明', dueDate: '2026-07-22', isCompleted: true, associatedSchool: '通用' },
    ],
  },
  {
    id: 'student-1',
    name: '林舒航',
    avatarColor: 'bg-emerald-600',
    targetDegree: '2027秋季 硕士研究生',
    targetMajor: '计算机科学 (Computer Science)',
    ieltsScore: '7.5 (L:8.5, R:8.0, W:7.0, S:6.5)',
    advisorNotes: '舒航整体进度不错，CV已定稿。目前重点是CMU的个人陈述（PS）需要细化项目经历。王教授的推荐信需要本周再次发邮件提醒。另外，GPA证明开学后务必第一时间去教务处敲章。',
    applications: [
      {
        id: 'app-1-1',
        schoolName: '卡内基梅隆大学',
        program: 'MS in Computer Science',
        country: '美国',
        deadline: '2026-12-01',
        status: '材料准备中',
        languageRequirement: '7.5 (写作单项不低于 7.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-15', notes: '已完成第一版初稿，等待导师修改反馈。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-25', notes: '简历终稿已确定。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: 'CS项目不需要作品集。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '非强制要件。' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-25', notes: '王教授已同意，学生已提供写作提纲。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '待修改', feedbackDueDate: '2026-08-10', notes: '张副教授反馈需要补充科研细节。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '大四在读，不需要毕业证。' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '前三年完整成绩单中英文已盖章。' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '中英文在读证明已开具。' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '2026-09-10', notes: '学校官网下载，需教务处盖章。' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: true, status: '准备中', feedbackDueDate: '2026-09-15', notes: '教务处暑期不办公，待开学办理。' },
        ],
      },
      {
        id: 'app-1-2',
        schoolName: '南加州大学',
        program: 'MS in Computer Science',
        country: '美国',
        deadline: '2026-12-15',
        status: '材料准备中',
        languageRequirement: '7.0 (单项不低于 6.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '准备中', feedbackDueDate: '2026-09-01', notes: '在CMU PS基础上进行针对性微调即可。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-25', notes: '通用简历已搞定。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-25', notes: '王教授通用信。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-30', notes: '张教授通用信。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '已获取。' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-20', notes: '已获取。' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: 'USC不需要该材料。' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '非必需。' },
        ],
      }
    ],
    todos: [
      { id: 'todo-1-1', text: '修改CMU 个人陈述（第2版）', dueDate: '2026-08-15', isCompleted: false, associatedSchool: '卡内基梅隆大学' },
      { id: 'todo-1-2', text: '邮件王教授催收推荐信大纲确认', dueDate: '2026-07-24', isCompleted: false, associatedSchool: '卡内基梅隆大学' },
      { id: 'todo-1-3', text: '扫描备份已敲章的在读证明与成绩单', dueDate: '2026-07-22', isCompleted: true, associatedSchool: '通用' },
    ],
  },
  {
    id: 'student-2',
    name: '张怡婷',
    avatarColor: 'bg-indigo-600',
    targetDegree: '2027秋季 硕士研究生',
    targetMajor: '交互设计 (Interaction Design)',
    ieltsScore: '6.5 (L:7.0, R:6.5, W:6.0, S:6.0)',
    advisorNotes: '怡婷目前重点是作品集（Portfolio）的打磨，已经完成前三个项目，第四个智能硬件项目需要追加交互细节。另外，皇艺要求提交一个2分钟的视频任务，这是目前的短板，本周必须完成脚本大纲。',
    applications: [
      {
        id: 'app-2-1',
        schoolName: '皇家艺术学院',
        program: 'MA in Service Design',
        country: '英国',
        deadline: '2026-10-15',
        status: '材料准备中',
        languageRequirement: '6.5 (写作 6.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-10', notes: '正在撰写对于服务设计理解的部分。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '突出交互设计项目经历。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: true, status: '准备中', feedbackDueDate: '2026-09-01', notes: '前三个项目已定，第四个智能硬件项目渲染中。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-20', notes: 'RCA硬性要求，2分钟短片，待写脚本。' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '毕业设计导师已提交。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-15', notes: '实习公司创意总监已答应，撰写中。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '往届毕业生，双证中英文翻译件已办妥。' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '四年完整成绩单中英文原件。' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '已毕业，不需要在读证明。' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '成绩单背面已带评分说明。' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '学校盖章的GPA证明已扫描。' },
        ],
      },
      {
        id: 'app-2-2',
        schoolName: '伦敦艺术大学',
        program: 'MA in Interaction Design',
        country: '英国',
        deadline: '2026-11-10',
        status: '材料准备中',
        languageRequirement: '6.5 (单项不低于 6.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-15', notes: '后续微调。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '复用简历。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: true, status: '准备中', feedbackDueDate: '2026-09-01', notes: '与RCA基本一致，排版做差异化。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: 'UAL非必须要件。' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '准备中', feedbackDueDate: '2026-08-15', notes: '' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-10', notes: '' },
        ],
      }
    ],
    todos: [
      { id: 'todo-2-1', text: '起草RCA 视频任务脚本大纲', dueDate: '2026-07-26', isCompleted: false, associatedSchool: '皇家艺术学院' },
      { id: 'todo-2-2', text: '渲染作品集第四个项目的3D模型', dueDate: '2026-07-23', isCompleted: false, associatedSchool: '通用' },
      { id: 'todo-2-3', text: '联系实习总监跟进推荐信签名进度', dueDate: '2026-07-28', isCompleted: false, associatedSchool: '皇家艺术学院' },
    ],
  },
  {
    id: 'student-3',
    name: '陈俊宇',
    avatarColor: 'bg-amber-600',
    targetDegree: '2027秋季 硕士研究生',
    targetMajor: '金融学 (Finance)',
    ieltsScore: '6.0 (L:6.5, R:6.5, W:5.5, S:5.5)',
    advisorNotes: '俊宇的动作稍微有些落后，港大和新加坡国立大学的截止日期非常早。PS第一稿结构有严重问题，太像故事叙述而缺乏量化分析的学术深度。本周必须将PS架构重组，并确保在7月底拿到两个推荐人的同意书。',
    applications: [
      {
        id: 'app-3-1',
        schoolName: '香港大学',
        program: 'Master of Finance',
        country: '中国香港',
        deadline: '2026-09-30',
        status: '材料准备中',
        languageRequirement: '6.0 (单项 6.0)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '待修改', feedbackDueDate: '2026-07-28', notes: '第一稿逻辑零散，需着重突出量化背景（如Python和计量经济学）。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '准备中', feedbackDueDate: '2026-07-24', notes: '需补充近期在券商的实习经历。' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '金融学科不需作品集。' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '非必须。' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-05', notes: '拟邀请计量经济学老师，尚未发邀请信。' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-10', notes: '拟邀请券商实习导师。' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '大四在读。' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '中英文成绩单已获取。' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '在读证明已获取。' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-15', notes: '港校需要官方评分标准。' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-20', notes: '因成绩单未显示百分制均分，需额外开具均分证明。' },
        ],
      },
      {
        id: 'app-3-2',
        schoolName: '新加坡国立大学',
        program: 'MSc in Finance',
        country: '新加坡',
        deadline: '2026-10-15',
        status: '材料准备中',
        languageRequirement: '7.0 (单项 6.5)',
        materials: [
          { id: 'ps', name: '个人陈述 (PS)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-01', notes: '根据港大PS版微调。' },
          { id: 'cv', name: '个人简历 (CV)', isRequired: true, status: '准备中', feedbackDueDate: '2026-07-24', notes: '' },
          { id: 'portfolio', name: '作品集 (Portfolio)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'video', name: '视频任务 (Video)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'recLetter1', name: '推荐信 1 (RL 1)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-05', notes: '' },
          { id: 'recLetter2', name: '推荐信 2 (RL 2)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-10', notes: '' },
          { id: 'gradCert', name: '毕业双证 (Degree Certs)', isRequired: false, status: '未开始', feedbackDueDate: '', notes: '' },
          { id: 'transcript', name: '中英文成绩单 (Transcripts)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '' },
          { id: 'enrollmentCert', name: '在读证明 (Enrollment Cert)', isRequired: true, status: '已完成', feedbackDueDate: '2026-07-15', notes: '' },
          { id: 'gradingSystem', name: '成绩评分标准 (Grading System)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-15', notes: '' },
          { id: 'gpaCert', name: '均分证明 (GPA Cert)', isRequired: true, status: '未开始', feedbackDueDate: '2026-08-20', notes: '' },
        ],
      }
    ],
    todos: [
      { id: 'todo-3-1', text: '重构港大 个人陈述（PS）第一段，增加核心量化项目陈述', dueDate: '2026-07-25', isCompleted: false, associatedSchool: '香港大学 (HKU)' },
      { id: 'todo-3-2', text: '修改个人简历（CV），增加最近的券商行研实习内容', dueDate: '2026-07-24', isCompleted: false, associatedSchool: '通用' },
      { id: 'todo-3-3', text: '写邮件并致电计量经济学张老师，请求撰写推荐信', dueDate: '2026-07-26', isCompleted: false, associatedSchool: '通用' },
    ],
  }
];

export const normalizeStudents = (
  loadedStudents: Student[],
  customGlobals?: MaterialItem[],
  customSchoolSpecific?: MaterialItem[]
): Student[] => {
  return loadedStudents.map(student => {
    // 1. Get default globals (this no longer includes 'rp')
    const defaultGlobals = customGlobals || getDefaultGlobalMaterials();
    
    // Ensure student has globalMaterials
    let currentGlobals = student.globalMaterials || [];
    
    // Migrate older format if globalMaterials is missing or empty
    if (currentGlobals.length === 0) {
      // Find if there is an application with materials
      const firstAppWithMaterials = student.applications.find(a => a.materials && a.materials.length > 0);
      if (firstAppWithMaterials) {
        currentGlobals = defaultGlobals.map(dg => {
          const existing = firstAppWithMaterials.materials.find(m => m.id === dg.id);
          if (existing) {
            return {
              ...dg,
              status: existing.status,
              notes: existing.notes || '',
              feedbackDueDate: existing.feedbackDueDate || '',
              isRequired: existing.isRequired
            };
          }
          return dg;
        });
      } else {
        currentGlobals = defaultGlobals;
      }
    } else {
      // Clean up previous format where 'rp' might have been present in globalMaterials
      const oldGlobalRp = currentGlobals.find(g => g.id === 'rp');
      currentGlobals = currentGlobals.filter(g => g.id !== 'rp');

      // Ensure all default globals are present
      const mergedGlobals = defaultGlobals.map(dg => {
        const existing = currentGlobals.find(g => g.id === dg.id);
        if (existing) {
          return existing;
        }
        return dg;
      });
      currentGlobals = mergedGlobals;
    }

    // Calculate if any global material has progress/feedback
    const hasGlobalProgress = currentGlobals.some(g => (g.status && g.status !== '未开始') || (g.feedbackDueDate && g.feedbackDueDate.trim() !== ''));

    // Ensure only school-specific materials (which now includes 'rp') are kept in application lists
    const schoolSpecificDefaults = customSchoolSpecific || getSchoolSpecificMaterials();
    const cleanApplications = (student.applications || []).map(app => {
      const existingMaterials = app.materials || [];
      const appMaterials = schoolSpecificDefaults.map(sd => {
        const existing = existingMaterials.find(m => m.id === sd.id);
        if (existing) {
          return existing;
        }
        // If sd is 'rp', check if the student had 'rp' progress in their previous globalMaterials
        if (sd.id === 'rp') {
          const oldGlobalRp = (student.globalMaterials || []).find(g => g.id === 'rp');
          if (oldGlobalRp) {
            return {
              ...sd,
              status: oldGlobalRp.status,
              notes: oldGlobalRp.notes || '',
              feedbackDueDate: oldGlobalRp.feedbackDueDate || '',
              isRequired: oldGlobalRp.isRequired
            };
          }
        }
        return { ...sd };
      });
      
      const hasAppSpecificProgress = appMaterials.some(m => (m.status && m.status !== '未开始') || (m.feedbackDueDate && m.feedbackDueDate.trim() !== ''));
      const hasAnyMaterialProgress = hasGlobalProgress || hasAppSpecificProgress;

      let nextStatus = app.status || '未开始';
      if (nextStatus === '未开始' && hasAnyMaterialProgress) {
        nextStatus = '材料准备中';
      } else if (nextStatus === '材料准备中' && !hasAnyMaterialProgress) {
        nextStatus = '未开始';
      }

      return {
        ...app,
        status: nextStatus,
        materials: appMaterials
      };
    });

    return {
      ...student,
      globalMaterials: currentGlobals,
      applications: cleanApplications
    };
  });
};

export const initialStudents: Student[] = normalizeStudents(rawInitialStudents as any as Student[]);

export const initialNotifications: NotificationLog[] = [
  {
    id: 'notif-1',
    type: 'danger',
    studentId: 'student-3',
    studentName: '陈俊宇',
    message: '香港大学 (HKU) 截止日期为2026-09-30，距离现在不足75天，而个人陈述（PS）仍处于 “待修改” 状态，推荐信尚未联系！',
    timestamp: '2026-07-21 08:30:15',
    isRead: false,
  },
  {
    id: 'notif-2',
    type: 'warning',
    studentId: 'student-1',
    studentName: '林舒航',
    message: '卡内基梅隆大学 (CMU) 材料“推荐信 2”反馈截至时间为2026-08-10，状态为 “待修改”，建议今日沟通。',
    timestamp: '2026-07-21 09:12:00',
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'success',
    studentId: 'student-2',
    studentName: '张怡婷',
    message: '张怡婷已成功完成“皇家艺术学院 (RCA)”和“伦敦艺术大学 (UAL)”的毕业双证及成绩单英文版上传。',
    timestamp: '2026-07-20 16:45:00',
    isRead: true,
  },
  {
    id: 'notif-4',
    type: 'info',
    studentId: 'student-1',
    studentName: '林舒航',
    message: '已向林舒航发送微信进度提醒：请加快CMU推荐信大纲材料的提供。',
    timestamp: '2026-07-20 10:00:00',
    isRead: true,
  }
];
