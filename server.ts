import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const publicIcsPath = path.join(process.cwd(), 'public', 'calendar.ics');

  let cachedIcsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Advisor Student Management System//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:留学督导管理日历',
    'X-WR-CALDESC:留学网申督办系统-全员申请截止日与督学待办事项',
    'X-WR-TIMEZONE:Asia/Shanghai',
    'END:VCALENDAR'
  ].join('\r\n');

  if (fs.existsSync(publicIcsPath)) {
    try {
      const content = fs.readFileSync(publicIcsPath, 'utf-8');
      if (content.includes('BEGIN:VCALENDAR')) {
        cachedIcsContent = content;
      }
    } catch (e) {
      console.warn('Failed to read public/calendar.ics', e);
    }
  }

  // API endpoint for frontend client to push live updated .ics calendar feed
  app.post('/api/calendar/update', (req, res) => {
    const { icsContent } = req.body;
    if (typeof icsContent === 'string' && icsContent.includes('BEGIN:VCALENDAR')) {
      cachedIcsContent = icsContent;
      try {
        fs.writeFileSync(publicIcsPath, icsContent, 'utf-8');
        const distIcsPath = path.join(process.cwd(), 'dist', 'calendar.ics');
        if (fs.existsSync(path.dirname(distIcsPath))) {
          fs.writeFileSync(distIcsPath, icsContent, 'utf-8');
        }
      } catch (e) {
        console.warn('Failed to write calendar.ics to disk', e);
      }
      return res.json({ status: 'ok', length: icsContent.length });
    }
    return res.status(400).json({ error: 'Invalid icsContent format' });
  });

  // Serve calendar.ics with correct text/calendar MIME headers & CORS for Apple / Google Calendar agents
  const handleCalendarFeed = (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).send(cachedIcsContent);
  };

  app.get('/calendar.ics', handleCalendarFeed);
  app.head('/calendar.ics', handleCalendarFeed);
  app.get('/api/calendar.ics', handleCalendarFeed);
  app.head('/api/calendar.ics', handleCalendarFeed);
  app.get('/public/calendar.ics', handleCalendarFeed);
  app.head('/public/calendar.ics', handleCalendarFeed);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
