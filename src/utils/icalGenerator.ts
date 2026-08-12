import { Student } from '../types';

/**
 * Generates an iCalendar (.ics) string containing all deadlines,
 * material feedback due dates, and todo items across all students.
 * Prevents duplicate entries for the same material.
 */
export function generateICalendarFeed(students: Student[]): string {
  const events: Array<{
    uid: string;
    title: string;
    date: string; // YYYY-MM-DD
    description: string;
    studentName: string;
  }> = [];

  const seenKeys = new Set<string>();

  students.forEach((student) => {
    // 1. Global materials feedback due dates (Primary source for global materials)
    student.globalMaterials?.forEach((m) => {
      if (m.feedbackDueDate) {
        const cleanName = m.name.replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
        const key = `${student.id}-${m.feedbackDueDate}-${cleanName}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          events.push({
            uid: `mat-global-${student.id}-${m.id}`,
            title: `[材料反馈] ${student.name}: ${m.name}`,
            date: m.feedbackDueDate,
            description: `学生: ${student.name}\n通用要件: ${m.name}\n状态: ${m.status}\n说明: ${m.notes || '无'}`,
            studentName: student.name,
          });
        }
      }
    });

    // 2. School applications & material deadlines
    student.applications?.forEach((app) => {
      app.materials?.forEach((m) => {
        if (m.feedbackDueDate) {
          const cleanName = m.name.replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
          const key = `${student.id}-${m.feedbackDueDate}-${app.id}-${cleanName}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            events.push({
              uid: `mat-app-${student.id}-${app.id}-${m.id}`,
              title: `[专属要件] ${student.name} - ${app.schoolName}: ${m.name}`,
              date: m.feedbackDueDate,
              description: `学生: ${student.name}\n目标高校: ${app.schoolName} (${app.program || ''})\n要件: ${m.name}\n状态: ${m.status}`,
              studentName: student.name,
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
              events.push({
                uid: `deadline-${student.id}-${app.id}-${round.id}`,
                title: `[申请截止] ${student.name} - ${app.schoolName} (${round.roundName})`,
                date: round.date,
                description: `学生: ${student.name}\n申请高校: ${app.schoolName}\n轮次: ${round.roundName}\n项目: ${app.program || '未定'}\n国家地区: ${app.country || ''}\n当前状态: ${app.status}`,
                studentName: student.name,
              });
            }
          }
        });
      } else if (app.deadline) {
        const key = `${student.id}-${app.deadline}-dl-${app.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          events.push({
            uid: `deadline-legacy-${student.id}-${app.id}`,
            title: `[申请截止] ${student.name} - ${app.schoolName}`,
            date: app.deadline,
            description: `学生: ${student.name}\n申请高校: ${app.schoolName}\n项目: ${app.program || ''}\n当前状态: ${app.status}`,
            studentName: student.name,
          });
        }
      }
    });

    // 3. Student todos (Skip auto-created material todos starting with todo-mat- or 【要件督办】 to prevent duplication)
    student.todos?.forEach((todo) => {
      if (todo.dueDate) {
        // Skip auto-synced duplicate material todo items
        if (todo.id.startsWith('todo-mat-') || todo.text.startsWith('【要件督办】') || todo.text.includes('要件督办')) {
          return;
        }

        const cleanTextKey = todo.text.replace(/【要件督办】/g, '').replace(/[\(\（].*?[\)\）]/g, '').trim().toLowerCase();
        const key = `${student.id}-${todo.dueDate}-${cleanTextKey}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          events.push({
            uid: `todo-${student.id}-${todo.id}`,
            title: `[督学待办] ${student.name}: ${todo.text}`,
            date: todo.dueDate,
            description: `学生: ${student.name}\n待办内容: ${todo.text}\n关联学校: ${todo.associatedSchool || '通用'}\n状态: ${todo.isCompleted ? '已完成' : '待处理'}`,
            studentName: student.name,
          });
        }
      }
    });
  });

  const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Advisor Student Management System//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:留学督导管理日历',
    'X-WR-CALDESC:留学网申督办系统-全员申请截止日与督学待办事项',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ];

  events.forEach((evt) => {
    // Parse date string YYYY-MM-DD directly without UTC timezone skew
    const parts = evt.date.split('-');
    if (parts.length !== 3) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return;

    const dateFormatted = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;

    // Next day for all-day DTEND
    const nextDt = new Date(y, m - 1, d + 1);
    const nextY = nextDt.getFullYear();
    const nextM = nextDt.getMonth() + 1;
    const nextD = nextDt.getDate();
    const nextDayFormatted = `${nextY}${String(nextM).padStart(2, '0')}${String(nextD).padStart(2, '0')}`;

    const cleanDesc = evt.description.replace(/\n/g, '\\n').replace(/,/g, '\\,');
    const cleanTitle = evt.title.replace(/,/g, '\\,');

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${evt.uid}@advisor.app`,
      `DTSTAMP:${nowIso}`,
      `DTSTART;VALUE=DATE:${dateFormatted}`,
      `DTEND;VALUE=DATE:${nextDayFormatted}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:督学提醒: ${cleanTitle}`,
      'TRIGGER:-P0DT9H0M0S',
      'END:VALARM',
      'END:VEVENT',

      // Also generate VTODO for native Task/Reminder clients & apps (e.g. TickTick, GoodTask, Outlook, OmniFocus)
      'BEGIN:VTODO',
      `UID:${evt.uid}-todo@advisor.app`,
      `DTSTAMP:${nowIso}`,
      `DUE;VALUE=DATE:${dateFormatted}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      'STATUS:NEEDS-ACTION',
      'PRIORITY:1',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:待办提醒: ${cleanTitle}`,
      'TRIGGER:-P0DT9H0M0S',
      'END:VALARM',
      'END:VTODO'
    );
  });

  icsLines.push('END:VCALENDAR');

  return icsLines.join('\r\n');
}

/**
 * Downloads the .ics file directly in the browser
 */
export function downloadICSFile(students: Student[], filename = 'advisor-calendar.ics') {
  const icsContent = generateICalendarFeed(students);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a Google Calendar single event Quick-Add URL
 */
export function getGoogleCalendarEventUrl(title: string, dateStr: string, details: string) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'https://calendar.google.com';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  const cleanDate = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  const nextDt = new Date(y, m - 1, d + 1);
  const nextDateStr = `${nextDt.getFullYear()}${String(nextDt.getMonth() + 1).padStart(2, '0')}${String(nextDt.getDate()).padStart(2, '0')}`;

  const datesParam = `${cleanDate}/${nextDateStr}`;
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const textParam = encodeURIComponent(title);
  const detailsParam = encodeURIComponent(details);

  return `${baseUrl}&text=${textParam}&dates=${datesParam}&details=${detailsParam}`;
}

/**
 * Pushes the current dynamically generated .ics feed to the backend server endpoint
 */
export async function syncICSToServer(students: Student[]): Promise<boolean> {
  try {
    const icsContent = generateICalendarFeed(students);
    const res = await fetch('/api/calendar/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icsContent })
    });
    return res.ok;
  } catch (e) {
    console.warn('[ICS Server Sync Warning]', e);
    return false;
  }
}

/**
 * Publishes or updates the .ics calendar feed on GitHub Repository or Gist
 * so that Apple Calendar / Google Calendar can subscribe via a 100% public, unauthenticated raw URL.
 */
export async function publishToGitHubCalendar(
  icsContent: string,
  token?: string,
  existingGistId?: string,
  owner = 'shapimaomao',
  repo = 'advisor-calendar'
): Promise<{ success: boolean; rawUrl?: string; webcalUrl?: string; gistId?: string; error?: string }> {
  const cleanToken = token?.trim();
  if (!cleanToken) {
    return { success: false, error: '请先提供有效的 GitHub Access Token' };
  }

  // 1. Try Publishing to GitHub Repository (Works with `repo` scope token)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${cleanToken}`,
      'User-Agent': 'AdvisorApp'
    };

    // Ensure repo exists
    const repoCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoCheck.status === 404) {
      await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: repo,
          description: '网申留学督导管理系统 - 实时日历订阅源 (.ics)',
          public: true,
          auto_init: true,
        }),
      });
    }

    // Check if calendar.ics exists to get sha
    const fileCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/calendar.ics`, { headers });
    let sha: string | undefined = undefined;
    if (fileCheck.ok) {
      const fileData = await fileCheck.json();
      sha = fileData.sha;
    }

    const contentBase64 = typeof btoa === 'function' 
      ? btoa(unescape(encodeURIComponent(icsContent))) 
      : Buffer.from(icsContent).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/calendar.ics`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Update advisor-calendar.ics feed',
        content: contentBase64,
        sha,
      }),
    });

    if (putRes.ok) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/calendar.ics`;
      const webcalUrl = `webcal://raw.githubusercontent.com/${owner}/${repo}/main/calendar.ics`;
      return {
        success: true,
        rawUrl,
        webcalUrl,
      };
    }
  } catch (repoErr) {
    console.warn('[GitHub Repo Sync Failed, falling back to Gist]', repoErr);
  }

  // 2. Fallback / Secondary: Try Gist Publishing (Works if token has `gist` scope)
  return publishToGitHubGist(icsContent, cleanToken, existingGistId);
}

/**
 * Publishes or updates the .ics calendar feed on GitHub Gist
 * so that Apple Calendar / Google Calendar can subscribe via a 100% public, unauthenticated raw URL.
 */
export async function publishToGitHubGist(
  icsContent: string,
  token?: string,
  existingGistId?: string
): Promise<{ success: boolean; rawUrl?: string; webcalUrl?: string; gistId?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const gistData = {
      description: '网申留学督导管理系统 - 实时日历订阅 (.ics)',
      public: true,
      files: {
        'advisor-calendar.ics': {
          content: icsContent,
        },
      },
    };

    let response: Response;
    if (existingGistId && existingGistId.trim()) {
      response = await fetch(`https://api.github.com/gists/${existingGistId.trim()}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(gistData),
      });
      if (response.status === 404) {
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers,
          body: JSON.stringify(gistData),
        });
      }
    } else {
      response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers,
        body: JSON.stringify(gistData),
      });
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.message || `GitHub API 错误码 ${response.status}`,
      };
    }

    const data = await response.json();
    const file = data.files?.['advisor-calendar.ics'];
    const rawUrl = file?.raw_url || `https://gist.githubusercontent.com/raw/${data.id}/advisor-calendar.ics`;
    const webcalUrl = rawUrl.replace(/^https:\/\//i, 'webcal://');

    return {
      success: true,
      rawUrl,
      webcalUrl,
      gistId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || '网络连接失败，请检查网络配置',
    };
  }
}


