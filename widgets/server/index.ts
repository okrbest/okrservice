import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as path from 'path';
const compression = require('compression');

dotenv.config();

const app = express();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.send('ok');
});

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/build', express.static(path.join(__dirname, '../static')));
app.use('/static', express.static('public'));

// Helper function to extract subdomain
const getSubdomain = (hostname: string): string => hostname.split('.')[0];

// Helper function to handle the header value
const getHeaderValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]; // Use the first value if it's an array
  }
  return value || ''; // Return empty string if undefined
};

function buildClientPortalWidgetTestLocals(
  req: express.Request,
  env: string,
) {
  const email = String(req.query.email ?? '');
  const code = String(req.query.code ?? req.query.password ?? '');
  const clientPortalId = String(req.query.clientPortalId ?? '');
  const name = String(req.query.name ?? '');
  const settingsObj: Record<string, string> = {};
  if (email) settingsObj.email = email;
  if (code) settingsObj.code = code;
  if (clientPortalId) settingsObj.clientPortalId = clientPortalId;
  if (name) settingsObj.name = name;
  return {
    env,
    email,
    code,
    clientPortalId,
    name,
    settingsObj,
  };
}

// Helper function to generate environment variables based on subdomain
const getEnv = (req: express.Request) => {
  const {
    ROOT_URL = '',
    API_URL = '',
    API_SUBSCRIPTIONS_URL = '',
    CALLS_APP_ID = '',
    CALLS_APP_SECRET = '',
    HR_BASE_URL = '',
  } = process.env;

  const replaceSubdomain = (url: string, subdomain: string) => {
    // Only replace <subdomain> if it exists in the URL
    return url.includes('<subdomain>')
      ? url.replace('<subdomain>', subdomain)
      : url;
  };

  // Check if ROOT_URL contains <subdomain> (SaaS mode)
  if (ROOT_URL.includes('<subdomain>')) {
    const subdomain = getSubdomain(
      getHeaderValue(req.headers['nginx-hostname']) ||
        req.hostname ||
        req.headers['host'] ||
        '',
    );
    return JSON.stringify({
      ROOT_URL: replaceSubdomain(ROOT_URL, subdomain),
      API_URL: replaceSubdomain(API_URL, subdomain),
      API_SUBSCRIPTIONS_URL: replaceSubdomain(API_SUBSCRIPTIONS_URL, subdomain),
      CALLS_APP_ID: replaceSubdomain(CALLS_APP_ID, subdomain),
      CALLS_APP_SECRET: replaceSubdomain(CALLS_APP_SECRET, subdomain),
      HR_BASE_URL,
    });
  }

  // If <subdomain> is not in ROOT_URL (open-source mode or no subdomain)
  return JSON.stringify({
    ROOT_URL,
    API_URL,
    API_SUBSCRIPTIONS_URL,
    CALLS_APP_ID,
    CALLS_APP_SECRET,
    HR_BASE_URL,
  });
};

// Widget routes
app.get('/events', (req, res) => {
  res.render('widget', { type: 'events', env: getEnv(req) });
});

app.get('/messenger', (req, res) => {
  res.render('widget', { type: 'messenger', env: getEnv(req) });
});

app.get('/form', (req, res) => {
  res.render('widget', { type: 'form', env: getEnv(req) });
});

app.get('/knowledgebase', (req, res) => {
  res.render('widget', {
    type: 'knowledgebase',
    env: getEnv(req),
    kbTopicId: req.query.topicId,
  });
});

app.get('/clientportal', (req, res) => {
  res.render('widget', { type: 'clientportal', env: getEnv(req) });
});

/** 로컬 테스트 페이지: public 의 HTML (실제 URL은 /static/...) */
app.get('/clientportal-test', (_req, res) => {
  res.redirect(302, '/static/clientportal-test.html');
});
app.get('/clientportal-test.html', (_req, res) => {
  res.redirect(302, '/static/clientportal-test.html');
});

app.get('/clientportal-widget-test.html', (_req, res) => {
  res.redirect(302, '/static/clientportal-widget-test.html');
});

/** 클라이언트 포털 임베드(clientportalWidget) 전용 테스트 — 쿼리: email, code, clientPortalId?, name? */
app.get('/clientportal-widget-test', (req, res) => {
  res.render(
    'widget-clientportal-test',
    buildClientPortalWidgetTestLocals(req, getEnv(req)),
  );
});

/**
 * TeamplGPT AI 채팅 프록시 — API 키를 서버에서만 보관하고 SSE 스트림을 그대로 전달
 * 클라이언트 번들에 developer API 키가 노출되지 않도록 위젯은 이 경로만 호출한다.
 */
app.post('/ai-chat/stream', async (req, res) => {
  const {
    TEAMPLGPT_BASE_URL = 'https://demo.teamplgpt.com',
    TEAMPLGPT_WORKSPACE = '5240',
    TEAMPLGPT_API_KEY = '',
  } = process.env;

  if (!TEAMPLGPT_API_KEY) {
    res.status(503).json({ error: 'AI chat is not configured' });
    return;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message : '';
  const sessionId =
    typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';

  if (!message.trim() || !sessionId) {
    res.status(400).json({ error: 'message and sessionId are required' });
    return;
  }

  const upstreamUrl = `${TEAMPLGPT_BASE_URL.replace(/\/$/, '')}/api/v1/workspace/${TEAMPLGPT_WORKSPACE}/stream-chat`;

  const controller = new AbortController();
  // 클라이언트가 응답 완료 전에 연결을 끊으면 upstream 스트림도 중단
  // (req 'close'는 Node 16+에서 body 수신 완료 시 발화하므로 사용 금지)
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEAMPLGPT_API_KEY}`,
      },
      body: JSON.stringify({ message, mode: 'chat', sessionId }),
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).json({ error: 'AI chat upstream error' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      res.end();
      return;
    }
    if (res.headersSent) {
      res.end();
    } else {
      res.status(502).json({ error: 'AI chat upstream error' });
    }
  }
});

app.get('/test', (req, res) => {
  const { form_id, brand_id, topic_id, integration_id, type } = req.query;
  const env = getEnv(req);

  if (type === 'clientportal') {
    return res.render(
      'widget-clientportal-test',
      buildClientPortalWidgetTestLocals(req, env),
    );
  }

  res.render(`widget-${type}-test`, {
    topic_id,
    brand_id,
    form_id,
    integration_id,
    env,
  });
});

const port = process.env.PORT || 3200;
app.listen(port, () => {
  console.debug(`Widget scripts are running on port ${port}`);
});
