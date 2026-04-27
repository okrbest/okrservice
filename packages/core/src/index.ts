import * as dotenv from "dotenv";

// load environment variables
dotenv.config();

import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as telemetry from "erxes-telemetry";
import * as express from "express";
import * as helmet from "helmet";
import { createServer } from "http";
import * as mongoose from "mongoose";
import * as path from "path";
import { initApolloServer } from "./apolloClient";
import { templateExport } from "./data/modules/fileExporter/templateExport";
import { buildChartFile } from "./data/modules/insight/export";

import * as fs from "fs";

import {
  deleteFile,
  getEnv,
  handleUnsubscription,
  readFileRequest,
  registerOnboardHistory,
  routeErrorHandling,
  uploadsFolderPath,
} from "./data/utils";

import { debugBase, debugError, debugInit } from "./debuggers";

/** RFC 5987: Content-Disposition filename에 한글/특수문자 시 헤더 규격 위반 방지 */
function safeContentDisposition(
  disposition: "inline" | "attachment",
  filename: string
): string {
  const clean = (s: string) =>
    s.replace(/[\x00-\x1f\x7f"]/g, "").replace(/\\/g, "\\\\");
  const isAscii = /^[\x20-\x7E]*$/.test(filename);
  const ext = path.extname(filename) || "";
  const fallback = ext ? `file${ext}` : "file";

  if (isAscii && filename.length > 0) {
    return `${disposition}; filename="${clean(filename)}"`;
  }
  const safe = clean(fallback);
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

const READ_FILE_EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  heic: "image/heic",
  ico: "image/x-icon",
  pdf: "application/pdf",
};

const READ_FILE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

function readFileBodyToBuffer(body: unknown): Buffer {
  if (body == null) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (typeof body === "string") {
    return Buffer.from(body, "binary");
  }
  return Buffer.alloc(0);
}

/** 로그인 HTML·에러 페이지 등이 이미지로 저장되는 것 방지 */
function bufferLooksLikeHtmlDocument(buf: Buffer): boolean {
  if (!buf.length) {
    return false;
  }
  const head = buf.slice(0, Math.min(600, buf.length)).toString("utf8").trimStart();
  const lower = head.slice(0, 80).toLowerCase();
  if (lower.startsWith("<?xml")) {
    return false;
  }
  if (lower.startsWith("<svg")) {
    return false;
  }
  return (
    lower.startsWith("<!doctype html") ||
    lower.startsWith("<html") ||
    lower.startsWith("<head") ||
    lower.startsWith("<body")
  );
}

/** 확장자 없는 스토리지 키(UUID 등) 다운로드 시 macOS 미리보기가 텍스트로 오인하지 않도록 시그니처로 MIME 추론 */
function sniffMimeFromBuffer(buf: Buffer): string | null {
  if (!buf || buf.length < 12) {
    return null;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return "image/bmp";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 4, 8) === "ftyp"
  ) {
    const brand = buf.toString("ascii", 8, 12);
    if (
      ["heic", "heix", "hevc", "mif1", "msf1", "heim", "heis"].indexOf(brand) > -1
    ) {
      return "image/heic";
    }
  }
  return null;
}

import { initBroker, sendCommonMessage } from "./messageBroker";
import { uploader } from "./middlewares/fileMiddleware";
import {
  getService,
  getServices,
  isEnabled,
  join,
  leave,
} from "@erxes/api-utils/src/serviceDiscovery";
import logs from "./logUtils";

import init from "./startup";
import forms from "./forms";
import { generateModels } from "./connectionResolver";
import { authCookieOptions, getSubdomain } from "@erxes/api-utils/src/core";
import segments from "./segments";
import automations from "./automations";
import templates from "./templates";
import imports from "./imports";
import exporter from "./exporter";
import { moduleObjects } from "./data/permissions/actions/permission";
import { getEnabledServices } from "@erxes/api-utils/src/serviceDiscovery";
import { applyInspectorEndpoints } from "@erxes/api-utils/src/inspect";
import { handleCoreLogin, handleMagiclink, ssocallback } from "./saas";
import app from "@erxes/api-utils/src/app";
import sanitizeFilename from "@erxes/api-utils/src/sanitize-filename";
import search from "./search";
import tags from "./tags";
import {
  updateContactsValidationStatus,
  updateContactValidationStatus,
} from "./data/modules/coc/verifierUtils";
import { buildFile } from "./exporterByUrl";
import reports from "./reports/reports";
import { getOrganizationDetail } from "@erxes/api-utils/src/saas/saas";
import {
  authorizeClient,
  refreshAccessToken,
} from "./data/modules/oauth/controller";

const {
  JWT_TOKEN_SECRET,
  WIDGETS_DOMAIN,
  DOMAIN,
  CLIENT_PORTAL_DOMAINS,
  VERSION,
} = process.env;

if (!JWT_TOKEN_SECRET) {
  throw new Error("Please configure JWT_TOKEN_SECRET environment variable.");
}

// don't move it above telnyx controllers
app.use(express.urlencoded({ limit: "15mb", extended: true }));

app.use(
  express.json({
    limit: "15mb",
  })
);

app.use(cookieParser());

const corsOptions = {
  credentials: true,
  origin: [
    DOMAIN || "http://localhost:3000",
    WIDGETS_DOMAIN || "http://localhost:3200",
    ...(CLIENT_PORTAL_DOMAINS || "").split(","),
    ...(process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((c) => c && RegExp(c)),
  ],
};

app.use(cors(corsOptions));

app.use(helmet({ frameguard: { action: "sameorigin" } }));

app.get(
  "/initial-setup",
  routeErrorHandling(async (req: any, res) => {
    console.debug("initial setup");
    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    const userCount = await models.Users.countDocuments();

    if (userCount === 0) {
      return res.send("no owner");
    }

    await models.FieldsGroups.createSystemGroupsFields();

    if (req.query && req.query.update) {
      const services = await getServices();

      for (const serviceName of services) {
        const service = await getService(serviceName);
        const meta = service.config?.meta || {};

        if (meta && meta.initialSetup && meta.initialSetup.generateAvailable) {
          await sendCommonMessage({
            subdomain,
            action: "initialSetup",
            serviceName,
            data: {},
          });
        }
      }
    }

    const envMaps = JSON.parse(req.query.envs || "{}");

    for (const key of Object.keys(envMaps)) {
      res.cookie(key, envMaps[key], authCookieOptions({ secure: req.secure }));
    }

    const configs = await models.Configs.find({
      code: new RegExp(`.*THEME_.*`, "i"),
    }).lean();

    await models.FieldsGroups.createSystemGroupsFields();

    return res.json(configs);
  })
);

app.get(
  "/v3/initial-setup",
  routeErrorHandling(async (req: any, res) => {
    console.debug("initial setup");
    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    const VERSION = getEnv({ name: "VERSION" });

    let organizationInfo;

    if (VERSION === "saas") {
      organizationInfo = await getOrganizationDetail({ subdomain, models });
    } else {
      organizationInfo = {
        type: "os",
        config: {},
      };
    }

    const userCount = await models.Users.countDocuments();

    if (userCount === 0) {
      organizationInfo.hasOwner = false;

      res.json(organizationInfo);
    } else {
      organizationInfo.hasOwner = true;
    }

    await models.FieldsGroups.createSystemGroupsFields();

    if (req.query && req.query.update) {
      const services = await getServices();

      for (const serviceName of services) {
        const service = await getService(serviceName);
        const meta = service.config?.meta || {};

        if (meta && meta.initialSetup && meta.initialSetup.generateAvailable) {
          await sendCommonMessage({
            subdomain,
            action: "initialSetup",
            serviceName,
            data: {},
          });
        }
      }
    }

    const envMaps = JSON.parse(req.query.envs || "{}");

    for (const key of Object.keys(envMaps)) {
      res.cookie(key, envMaps[key], authCookieOptions({ secure: req.secure }));
    }

    const configs = await models.Configs.find({
      code: new RegExp(`.*THEME_.*`, "i"),
    }).lean();

    await models.FieldsGroups.createSystemGroupsFields();

    organizationInfo.configs = configs;

    return res.json(organizationInfo);
  })
);

app.get("/get-frontend-plugins", async (_req, res) => {
  const plugins: { name: string; url: string }[] = [];

  plugins.push({
    name: "inbox",
    url: "https://plugins.erxes.io/latest/inbox_ui/remoteEntry.js",
  });

  return res.json({ plugins });
});

// app.post('/webhooks/:id', webhookMiddleware);

app.use("/static", express.static(path.join(__dirname, "private")));

app.get(
  "/chart-table-export",
  routeErrorHandling(async (req: any, res) => {
    const { query } = req;

    const subdomain = getSubdomain(req);

    const result = await buildChartFile(subdomain, query);

    res.attachment(`${result.name}.xlsx`);

    return res.send(result.response);
  })
);

app.get(
  "/download-template",
  routeErrorHandling(async (req: any, res) => {
    const name = req.query.name;

    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    registerOnboardHistory({ models, type: `${name}Download`, user: req.user });

    return res.redirect(
      `https://erxes-docs.s3-us-west-2.amazonaws.com/templates/${name}`
    );
  })
);

app.get(
  "/template-export",
  routeErrorHandling(async (req: any, res) => {
    const { importType } = req.query;

    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    registerOnboardHistory({
      models,
      type: `importDownloadTemplate`,
      user: req.user,
    });

    const { name, response } = await templateExport(req.query);

    res.attachment(`${name}.${importType}`);
    return res.send(response);
  })
);

/** 스토리지 objectId 접두(영숫자·-_ 20자+) 뒤 한글 파일명이 붙은 key에서 제안 파일명만 남김 */
function stripStoragePrefixBeforeHangulForFilename(
  base: string,
  minPrefixLen = 20,
): string {
  if (!base || typeof base !== "string") {
    return base;
  }
  const cleaned = base.replace(/^upload_[^_]+_/, "");
  const idx = cleaned.search(/\p{Script=Hangul}/u);
  if (idx <= 0) {
    return cleaned;
  }
  const prefix = cleaned.slice(0, idx).replace(/[_\s-]+$/, "");
  if (/^[A-Za-z0-9_-]+$/.test(prefix) && prefix.length >= minPrefixLen) {
    return cleaned.slice(idx);
  }
  return cleaned;
}

function readFileDispositionBasename(key: string, name: unknown): string {
  const nameTrim =
    name != null && String(name).trim() ? String(name).trim() : "";
  const rawForLabel = nameTrim
    ? nameTrim
    : (() => {
        try {
          const decoded = decodeURIComponent(String(key));
          return decoded.split("/").pop() || decoded;
        } catch {
          return String(key).split("/").pop() || String(key);
        }
      })();
  return stripStoragePrefixBeforeHangulForFilename(rawForLabel);
}

// read file
app.get("/read-file", async (req: any, res, next) => {
  const subdomain = getSubdomain(req);
  const models = await generateModels(subdomain);

  try {
    const { key, inline, name, width } = req.query;

    if (!key) {
      return res.send("Invalid key");
    }

    const response = await readFileRequest({
      key,
      subdomain,
      models,
      userId: req.headers.userid,
      width,
    });

    const buf = readFileBodyToBuffer(response);
    if (!buf.length) {
      return res.status(404).send("Not found");
    }
    if (bufferLooksLikeHtmlDocument(buf)) {
      return res
        .status(502)
        .send("Invalid file payload (received HTML instead of binary)");
    }

    const baseName = readFileDispositionBasename(String(key), name);
    const extFromName = path.extname(baseName).toLowerCase();
    const extKeyFromName = extFromName.startsWith(".")
      ? extFromName.slice(1)
      : "";

    let contentType =
      extKeyFromName && READ_FILE_EXT_TO_MIME[extKeyFromName]
        ? READ_FILE_EXT_TO_MIME[extKeyFromName]
        : null;

    if (!contentType) {
      const keyStr = String(key);
      const extFromKey = path.extname(keyStr).toLowerCase();
      const ek = extFromKey.startsWith(".") ? extFromKey.slice(1) : "";
      if (ek && READ_FILE_EXT_TO_MIME[ek]) {
        contentType = READ_FILE_EXT_TO_MIME[ek];
      }
    }

    if (!contentType && buf.length) {
      contentType = sniffMimeFromBuffer(buf);
    }

    let dispositionName = baseName;
    const hasExtOnName = Boolean(extFromName);
    if (!hasExtOnName && contentType && READ_FILE_MIME_TO_EXT[contentType]) {
      dispositionName = `${baseName}${READ_FILE_MIME_TO_EXT[contentType]}`;
    }

    const isInline = inline === "true";
    res.setHeader(
      "Content-disposition",
      safeContentDisposition(
        isInline ? "inline" : "attachment",
        dispositionName,
      ),
    );
    res.setHeader("Content-Type", contentType || "application/octet-stream");

    return res.send(buf);
  } catch (e) {
    if ((e as Error).message.includes("key does not exist")) {
      return res.status(404).send("Not found");
    }

    debugError(e);

    return next(e);
  }
});

app.get(
  "/file-export",
  routeErrorHandling(async (req: any, res) => {
    const { query } = req;
    const { segment } = query;
    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    const result = await buildFile(models, subdomain, query);

    res.attachment(`${result.name}.xlsx`);

    if (segment) {
      try {
        models.Segments.removeSegment(segment);
      } catch (e) {
        console.error((e as Error).message);
      }
    }

    return res.send(result.response);
  })
);

app.post(
  `/verifier/webhook`,
  routeErrorHandling(async (req, res) => {
    const { emails, phones, email, phone } = req.body;
    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    if (email) {
      await updateContactValidationStatus(models, email);
    } else if (emails) {
      await updateContactsValidationStatus(models, "email", emails);
    } else if (phone) {
      await updateContactValidationStatus(models, phone);
    } else if (phones) {
      await updateContactsValidationStatus(models, "phone", phones);
    }

    return res.send("success");
  })
);

app.post("/oauth/token", authorizeClient);
app.post("/oauth/refresh", refreshAccessToken);

app.get("/verify", async (req, res) => {
  const { p } = req.query;

  const data = JSON.parse(Buffer.from(p as string, "base64").toString("utf8"));

  const { email, customerId } = data;

  const subdomain = getSubdomain(req);
  const models = await generateModels(subdomain);

  const customer = await models.Customers.findOne({ _id: customerId });

  if (!customer) {
    return res.send("Can not find customer");
  }

  if (customer.primaryEmail !== email) {
    return res.send("Customer email does not match");
  }

  if (customer.emails?.findIndex((e) => e === email) === -1) {
    return res.send("Customer email does not match");
  }

  await models.Customers.updateOne(
    { _id: customerId },
    { $set: { primaryEmail: email, emailValidationStatus: "valid" } }
  );

  return res.send("Successfully verified, you can close this tab now");
});

// delete file
app.post(
  "/delete-file",
  routeErrorHandling(async (req: any, res) => {
    // require login
    if (!req.headers.userid) {
      return res.end("forbidden");
    }

    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    const status = await deleteFile(models, req.body.fileName);

    if (status === "ok") {
      return res.send(status);
    }

    return res.status(500).send(status);
  })
);

// unsubscribe
app.get(
  "/unsubscribe",
  routeErrorHandling(async (req: any, res) => {
    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    await handleUnsubscription(models, subdomain, req.query);

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    const template = fs.readFileSync(
      __dirname + "/private/emailTemplates/unsubscribe.html"
    );

    return res.send(template);
  })
);

app.post("/upload-file", uploader);

app.post("/upload-file&responseType=json", uploader);

app.get("/ml-callback", (req: any, res) => handleMagiclink(req, res));
app.get("/core-login", (req: any, res) => handleCoreLogin(req, res));
app.get("/sso-callback", ssocallback);

// Error handling middleware
app.use((error, _req, res, _next) => {
  debugError(error.message);
  res.status(500).send(error.message);
});

app.get("/get-import-file/:fileName", async (req, res) => {
  const fileName = req.params.fileName;

  const sanitizeFileName = sanitizeFilename(fileName);

  const filePath = path.join(uploadsFolderPath, sanitizeFileName);

  res.sendFile(filePath);
});

app.get("/plugins/enabled/:name", async (req, res) => {
  const result = await isEnabled(req.params.name);
  res.json(result);
});

app.get("/plugins/enabled", async (_req, res) => {
  const result = (await getEnabledServices()) || [];
  res.json(result);
});

applyInspectorEndpoints("core");

// Wrap the Express server
const httpServer = createServer(app);

const PORT = getEnv({ name: "PORT" });
const MONGO_URL = getEnv({ name: "MONGO_URL" });

httpServer.listen(PORT, async () => {
  await initApolloServer(app, httpServer);

  await initBroker();

  init()
    .then(() => {
      telemetry.trackCli("server_started");
      telemetry.startBackgroundUpdate();

      debugBase("Startup successfully started");
    })
    .catch((e) => {
      debugError(`Error occured while starting init: ${e.message}`);
    });

  await join({
    name: "core",
    port: PORT,
    hasSubscriptions: false,
    meta: {
      isSearchable: true,
      logs: { providesActivityLog: true, consumers: logs },
      forms,
      segments,
      automations,
      templates,
      search,
      permissions: moduleObjects,
      tags,
      imports,
      exporter,
      cronjobs: {
        handle10MinutelyJobAvailable: VERSION === "saas" ? true : false,
      },
      reports,
    },
  });

  debugInit(`GraphQL Server is now running on ${PORT}`);
});

// GRACEFULL SHUTDOWN
process.stdin.resume(); // so the program will not close instantly

async function closeMongooose() {
  try {
    await mongoose.connection.close();
    console.debug("Mongoose connection disconnected ");
  } catch (e) {
    console.error(e);
  }
}

async function leaveServiceDiscovery() {
  try {
    await leave("core", PORT);
    console.debug("Left from service discovery");
  } catch (e) {
    console.error(e);
  }
}

async function closeHttpServer() {
  try {
    await new Promise<void>((resolve, reject) => {
      // Stops the server from accepting new connections and finishes existing connections.
      httpServer.close((error: Error | undefined) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

// If the Node process ends, close the http-server and mongoose.connection and leave service discovery.
(["SIGINT", "SIGTERM"] as NodeJS.Signals[]).forEach((sig) => {
  process.on(sig, async () => {
    await closeHttpServer();
    await closeMongooose();
    await leaveServiceDiscovery();
    process.exit(0);
  });
});
