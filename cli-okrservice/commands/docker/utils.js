const fs = require("fs");
const fse = require("fs-extra");
const yaml = require("yaml");
const { log, execCommand, filePath, execCurl } = require("../utils");

require("dotenv").config();

const {
  DEPLOYMENT_METHOD,
  SERVICE_INTERNAL_PORT = 80,
  GATEWAY_PORT = 3300,
  UI_PORT = 3000,
  MONGO_PORT = 27017,
  REDIS_PORT = 6379,
  RABBITMQ_PORT = 5672,
} = process.env;

const isSwarm = DEPLOYMENT_METHOD !== "docker-compose";

const buildPlugins = ["dev", "staging", "v2", "rc", "master", "v1"];

const commonEnvs = (configs) => {
  const enabledServices = (configs.plugins || []).map((plugin) => plugin.name);
  const be_env = configs.be_env || {};
  enabledServices.push("workers");
  const enabledServicesJson = JSON.stringify(enabledServices);

  const db_server_address = configs.db_server_address;
  const widgets = configs.widgets || {};
  const redis = configs.redis || {};
  const rabbitmq = configs.rabbitmq || {};

  const rabbitmq_host = `amqp://${rabbitmq.user}:${rabbitmq.pass}@${
    rabbitmq.server_address ||
    db_server_address ||
    (isSwarm ? "erxes-dbs_rabbitmq" : "rabbitmq")
  }:${db_server_address ? RABBITMQ_PORT : 5672}/${rabbitmq.vhost}`;

  return {
    ...be_env,
    ELASTIC_APM_HOST_NAME: configs.elastic_apm_host_name,
    DEBUG: configs.debug_level || "*error*",
    NODE_ENV: "production",
    DOMAIN: configs.domain,
    WIDGETS_DOMAIN: widgets.domain || `${configs.domain}/widgets`,
    REDIS_HOST: db_server_address || (isSwarm ? "erxes-dbs_redis" : "redis"),
    REDIS_PORT: db_server_address ? REDIS_PORT : 6379,
    REDIS_PASSWORD: redis.password || "",
    RABBITMQ_HOST: rabbitmq_host,
    ELASTICSEARCH_URL: `http://${
      db_server_address ||
      (isSwarm ? "erxes-dbs_elasticsearch" : "elasticsearch")
    }:9200`,
    ENABLED_SERVICES_JSON: enabledServicesJson,
    RELEASE: configs.image_tag || "",
    VERSION: configs.version || "os",
    MESSAGE_BROKER_PREFIX: rabbitmq.prefix || "",
  };
};

const cleaning = async () => {
  await execCommand("docker rm $(docker ps -a -q -f status=exited)", true);
  await execCommand("docker rmi $(docker images -f dangling=true -q)", true);
  await execCommand(
    "docker volume rm $(docker volume ls -q -f dangling=true)",
    true
  );
};

const mongoEnv = (configs, plugin) => {
  const mongo = configs.mongo || {};
  const db_server_address = configs.db_server_address;

  let db_name = mongo.db_name || "erxes";

  if (plugin && plugin.db_name) {
    db_name = plugin.db_name;
  }

  const mongo_url = `mongodb://${mongo.username}:${mongo.password}@${
    db_server_address || (isSwarm ? "erxes-dbs_mongo" : "mongo")
  }:${
    db_server_address ? MONGO_PORT : 27017
  }/${db_name}?authSource=admin&replicaSet=rs0`;

  return mongo_url;
};

const healthcheck = {
  test: [
    "CMD",
    "curl",
    "-i",
    `http://localhost:${SERVICE_INTERNAL_PORT}/health`,
  ],
  interval: "30s",
  start_period: "30s",
};

const generateLBaddress = (address) =>
  `${address}${
    SERVICE_INTERNAL_PORT !== 80 ? `:${SERVICE_INTERNAL_PORT}` : ""
  }`;

const generatePluginBlock = (configs, plugin) => {
  const api_mongo_url = mongoEnv(configs, {});
  const mongo_url = plugin.mongo_url || mongoEnv(configs, plugin);
  const image_tag = plugin.image_tag || configs.image_tag || "federation";
  const registry = plugin.registry ? `${plugin.registry}/` : "";
  const docker_image_tag = plugin?.docker_image_tag;

  const extra_hosts = [];

  if (plugin.db_server_address || configs.db_server_address) {
    extra_hosts.push(
      `mongo:${
        plugin.db_server_address || configs.db_server_address || "127.0.0.1"
      }`
    );
  }

  if (configs.secondary_db_server_address) {
    extra_hosts.push(`mongo-secondary:${configs.secondary_db_server_address}`);
  }

  const conf = {
    image:
      docker_image_tag ||
      `${registry}okrservice/plugin-${plugin.name}-api:${image_tag}`,
    environment: {
      OTEL_SERVICE_NAME: plugin.name,
      SERVICE_NAME: plugin.name,
      PORT: plugin.port || SERVICE_INTERNAL_PORT || 80,
      API_MONGO_URL: api_mongo_url,
      MONGO_URL: mongo_url,
      NODE_INSPECTOR: configs.nodeInspector ? "enabled" : undefined,
      LOAD_BALANCER_ADDRESS: generateLBaddress(
        `http://plugin-${plugin.name}-api`
      ),
      ...commonEnvs(configs),
      ...(plugin.extra_env || {}),
    },
    networks: ["erxes"],
    extra_hosts,
  };

  if (isSwarm && plugin.replicas) {
    conf.deploy = {
      replicas: plugin.replicas,
    };
  }

  return conf;
};

const syncUI = async ({ name, image_tag, ui_location }) => {
  const configs = await fse.readJSON(filePath("configs.json"));
  const tag = image_tag || configs.image_tag;

  const plName = `plugin-${name}-ui`;

  if (!(await fse.exists(filePath(`plugin-uis/${plName}`)))) {
    await execCommand(`mkdir plugin-uis/${plName}`);
  }

  if (ui_location) {
    log(`Downloading ${name} ui build.tar from ${ui_location}`);

    await execCurl(ui_location, `plugin-uis/${plName}/build.tar`);
  } else {
    log(`Downloading ${name} ui build.tar from s3`);

    let s3_location = "";

    if (!tag) {
      s3_location = `https://okrservice-plugins.s3.ap-northeast-2.amazonaws.com/uis/${plName}`;
    } else {
      if (buildPlugins.includes(tag)) {
        s3_location = `https://okrservice-${tag}-plugins.s3.ap-northeast-2.amazonaws.com/uis/${plName}`;
      } else {
        s3_location = `https://okrservice-release-plugins.s3.ap-northeast-2.amazonaws.com/uis/${plName}/${tag}`;
      }
    }

    await execCurl(
      `${s3_location}/build.tar`,
      `plugin-uis/${plName}/build.tar`
    );
  }

  log(`Extracting build ......`);
  await execCommand(
    `tar -xf plugin-uis/${plName}/build.tar --directory=plugin-uis/${plName}`
  );

  log(`Removing build.tar ......`);
  await execCommand(`rm plugin-uis/${plName}/build.tar`);
};

const updateLocales = async () => {
  const configs = await fse.readJSON(filePath("configs.json"));
  const tag = configs.image_tag || "dev";

  let s3_location = "";

  if (tag === "dev") {
    s3_location = `https://okrservice-dev-plugins.s3.ap-northeast-2.amazonaws.com`;
  } else {
    s3_location = `https://okrservice-${tag}-plugins.s3.ap-northeast-2.amazonaws.com`;
  }

  log(`Downloading locales from ${s3_location}`);

  await execCurl(`${s3_location}/locales.tar`, `locales.tar`);

  log(`Extracting build ......`);

  if (!(await fse.exists(filePath("locales")))) {
    await execCommand("mkdir locales");
  }

  await execCommand(`tar -xf locales.tar --directory=locales`);

  log(`Removing locales.tar ......`);
  await execCommand(`rm locales.tar`);

  const plugins = configs.plugins || [];

  for (const plugin of plugins) {
    const localesPath = `plugin-uis/plugin-${plugin.name}-ui/locales`;

    if (!(await fse.exists(filePath(localesPath)))) {
      continue;
    }

    const files = await fse.readdir(localesPath);

    for (const file of files) {
      if (!(await fse.exists(filePath(`locales/${file}`)))) {
        continue;
      }

      const globalFile = await fse.readJSON(filePath(`locales/${file}`));
      const localFile = await fse.readJSON(filePath(`${localesPath}/${file}`));

      const combined = { ...globalFile, ...localFile };

      await fse.writeJSON(filePath(filePath(`locales/${file}`)), combined);
    }
  }
};

const generateNetworks = (configs) => {
  if (configs.db_server_address) {
    return {
      driver: "overlay",
    };
  }

  if (!isSwarm) {
    return {
      driver: "bridge",
    };
  }

  return {
    external: true,
  };
};

const deployDbs = async () => {
  await cleaning();

  const configs = await fse.readJSON(filePath("configs.json"));

  const dockerComposeConfig = {
    version: "3.3",
    networks: {
      erxes: generateNetworks(configs),
    },
    services: {},
  };

  if (configs.kibana) {
    dockerComposeConfig.services.kibana = {
      image: "docker.elastic.co/kibana/kibana:7.6.0",
      ports: ["5601:5601"],
      networks: ["erxes"],
    };
  }

  if (configs.mongo) {
    if (!(await fse.exists(filePath("mongodata")))) {
      await execCommand("mkdir mongodata");
    }

    dockerComposeConfig.services.mongo = {
      hostname: "mongo",
      image: "mongo:4.4.25",
      ports: [`0.0.0.0:${MONGO_PORT}:27017`],
      environment: {
        MONGO_INITDB_ROOT_USERNAME: configs.mongo.username,
        MONGO_INITDB_ROOT_PASSWORD: configs.mongo.password,
      },
      networks: ["erxes"],
      volumes: ["./mongodata:/data/db"],
      command: ["--replSet", "rs0", "--bind_ip_all"],
      extra_hosts: ["mongo:127.0.0.1"],
    };
  }

  if (configs.mongo.replication) {
    if (!(await fse.exists(filePath(`mongo-key`)))) {
      log("mongo-key file not found ....", "red");

      return log(
        `Create this file using
          openssl rand -base64 756 > <path-to-keyfile>
          chmod 400 <path-to-keyfile>
          chmod 999:999 <path-to-keyfile>
      `,
        "red"
      );
    }

    dockerComposeConfig.services.mongo.volumes.push(
      "./mongo-key:/etc/mongodb/keys/mongo-key"
    );
    dockerComposeConfig.services.mongo.command.push("--keyFile");
    dockerComposeConfig.services.mongo.command.push(
      "/etc/mongodb/keys/mongo-key"
    );
    dockerComposeConfig.services.mongo.extra_hosts = [
      `mongo:${configs.db_server_address}`,
      `mongo-secondary:${configs.secondary_server_address}`,
    ];
  }

  if (configs.elasticsearch) {
    if (!(await fse.exists(filePath("elasticsearchData")))) {
      await execCommand("mkdir elasticsearchData");
    }

    dockerComposeConfig.services.elasticsearch = {
      image: "docker.elastic.co/elasticsearch/elasticsearch:7.8.0",
      environment: {
        "discovery.type": "single-node",
      },
      ports: ["9200:9200"],
      networks: ["erxes"],
      volumes: ["./elasticsearchData:/usr/share/elasticsearch/data"],
      ulimits: {
        memlock: {
          soft: -1,
          hard: -1,
        },
      },
    };
  }

  if (configs.redis) {
    if (!(await fse.exists(filePath("redisdata")))) {
      await execCommand("mkdir redisdata");
    }

    dockerComposeConfig.services.redis = {
      image: "redis:7.2.1",
      command: `redis-server --appendonly yes --requirepass ${configs.redis.password}`,
      ports: [`${REDIS_PORT}:6379`],
      networks: ["erxes"],
      volumes: ["./redisdata:/data"],
    };
  }

  if (configs.rabbitmq) {
    if (!(await fse.exists(filePath("rabbitmq-data")))) {
      await execCommand("mkdir rabbitmq-data");
    }

    dockerComposeConfig.services.rabbitmq = {
      image: "rabbitmq:3.7.17-management",
      hostname: "rabbitmq",
      environment: {
        RABBITMQ_VM_MEMORY_HIGH_WATERMARK: "2048MiB",
        RABBITMQ_ERLANG_COOKIE: configs.rabbitmq.cookie,
        RABBITMQ_DEFAULT_USER: configs.rabbitmq.user,
        RABBITMQ_DEFAULT_PASS: configs.rabbitmq.pass,
        RABBITMQ_DEFAULT_VHOST: configs.rabbitmq.vhost,
      },
      ports: [`${RABBITMQ_PORT}:5672`, "15672:15672"],
      networks: ["erxes"],
      volumes: ["./rabbitmq-data:/var/lib/rabbitmq"],
    };
  }

  const yamlString = yaml.stringify(dockerComposeConfig);

  log("Generating docker-compose-dbs.yml ....");

  fs.writeFileSync(filePath("docker-compose-dbs.yml"), yamlString);

  log("Deploy ......");

  if (isSwarm) {
    return execCommand(
      "docker stack deploy --compose-file docker-compose-dbs.yml erxes-dbs --with-registry-auth --resolve-image changed"
    );
  }

  return execCommand("docker-compose -f docker-compose-dbs.yml up -d");
};

const up = async ({ uis, downloadLocales, fromInstaller }) => {
  await cleaning();

  const configs = await fse.readJSON(filePath("configs.json"));
  const be_env = configs.be_env || {};
  const image_tag = configs.image_tag || "federation";
  const domain = configs.domain;
  const gateway_url = `${domain}/gateway`;
  const subscription_url = `wss://${gateway_url.replace(
    "https://",
    ""
  )}/graphql`;
  const widgets = configs.widgets || {};
  const dashboard = configs.dashboard;
  const widgets_domain = widgets.domain || `${domain}/widgets`;
  const dashboard_domain = `${domain}/dashboard/api`;
  const db_server_address = configs.db_server_address;
  const secondary_db_server_address = configs.secondary_db_server_address;

  const NGINX_HOST = domain.replace("https://", "");

  const extra_hosts = [];

  if (db_server_address) {
    extra_hosts.push(`mongo:${db_server_address || "127.0.0.1"}`);
  }

  if (secondary_db_server_address) {
    extra_hosts.push(`mongo-secondary:${secondary_db_server_address}`);
  }

  const { RABBITMQ_HOST } = commonEnvs(configs);

  // update the directory on the Docker system to have 0777 or drwxrwxrwx permssion, so that all users have read/write/execute permission.
  // chmod 0777 core-api-uploads
  if (!(await fse.exists(filePath("core-api-uploads")))) {
    await execCommand("mkdir core-api-uploads");
  }

  const dockerComposeConfig = {
    version: "3.7",
    networks: {
      erxes: generateNetworks(configs),
    },
    services: {
      coreui: {
        image: `okrservice/erxes:${(configs.coreui || {}).image_tag || image_tag}`,
        environment: {
          REACT_APP_PUBLIC_PATH: "",
          REACT_APP_CDN_HOST: widgets_domain,
          REACT_APP_API_URL: gateway_url,
          REACT_APP_DASHBOARD_URL: dashboard_domain,
          REACT_APP_API_SUBSCRIPTION_URL: subscription_url,
          NGINX_PORT:
            (configs.coreui || {}).NGINX_PORT || SERVICE_INTERNAL_PORT,
          NGINX_HOST,
          NODE_ENV: "production",
          REACT_APP_FILE_UPLOAD_MAX_SIZE: 524288000,
          REACT_APP_RELEASE: configs.image_tag || "",
          ...((configs.coreui || {}).extra_env || {}),
        },
        ports: [`${UI_PORT}:${SERVICE_INTERNAL_PORT}`],
        volumes: [
          "./plugins.js:/usr/share/nginx/html/js/plugins.js",
          "./plugin-uis:/usr/share/nginx/html/js/plugins",
          "./locales:/usr/share/nginx/html/locales",
        ],
        networks: ["erxes"],
      },
      "plugin-core-api": {
        image: `okrservice/core:${(configs.core || {}).image_tag || image_tag}`,
        environment: {
          OTEL_SERVICE_NAME: "plugin-core-api",
          SERVICE_NAME: "core-api",
          PORT: SERVICE_INTERNAL_PORT,
          CLIENT_PORTAL_DOMAINS: configs.client_portal_domains || "",
          JWT_TOKEN_SECRET: configs.jwt_token_secret,
          LOAD_BALANCER_ADDRESS: generateLBaddress("http://plugin-core-api"),
          MONGO_URL: mongoEnv(configs),
          NODE_INSPECTOR: configs.nodeInspector ? "enabled" : undefined,
          EMAIL_VERIFIER_ENDPOINT:
            configs.email_verifier_endpoint ||
            "https://email-verifier.erxes.io",
          ...commonEnvs(configs),
          ...((configs.core || {}).extra_env || {}),
        },
        extra_hosts,
        volumes: [
          "./permissions.json:/erxes/packages/core/permissions.json",
          "./core-api-uploads:/erxes/packages/core/src/private/uploads",
        ],
        networks: ["erxes"],
      },
      gateway: {
        image: `okrservice/gateway:${
          (configs.gateway || {}).image_tag || image_tag
        }`,
        environment: {
          OTEL_SERVICE_NAME: "gateway",
          SERVICE_NAME: "gateway",
          PORT: SERVICE_INTERNAL_PORT,
          LOAD_BALANCER_ADDRESS: generateLBaddress("http://gateway"),
          JWT_TOKEN_SECRET: configs.jwt_token_secret,
          CLIENT_PORTAL_DOMAINS: configs.client_portal_domains || "",
          MONGO_URL: mongoEnv(configs),
          NODE_INSPECTOR: configs.nodeInspector ? "enabled" : undefined,
          ...commonEnvs(configs),
          ...((configs.gateway || {}).extra_env || {}),
        },
        healthcheck,
        extra_hosts,
        ports: [`${GATEWAY_PORT}:${SERVICE_INTERNAL_PORT}`],
        networks: ["erxes"],
      },
      crons: {
        image: `okrservice/crons:${image_tag}`,
        environment: {
          OTEL_SERVICE_NAME: "crons",
          NODE_INSPECTOR: configs.nodeInspector ? "enabled" : undefined,
          MONGO_URL: mongoEnv(configs),
          ...commonEnvs(configs),
        },
        networks: ["erxes"],
      },
      "plugin-workers-api": {
        image: `okrservice/workers:${image_tag}`,
        environment: {
          OTEL_SERVICE_NAME: "workers",
          SERVICE_NAME: "workers",
          PORT: SERVICE_INTERNAL_PORT,
          JWT_TOKEN_SECRET: configs.jwt_token_secret,
          LOAD_BALANCER_ADDRESS: generateLBaddress("http://plugin-workers-api"),
          MONGO_URL: mongoEnv(configs),
          NODE_INSPECTOR: configs.nodeInspector ? "enabled" : undefined,
          ...commonEnvs(configs),
          ...((configs.workers || {}).extra_env || {}),
        },
        extra_hosts,
        networks: ["erxes"],
      },
    },
  };

  if (isSwarm) {
    const deploy = {
      mode: "replicated",
      replicas: 2,
      update_config: {
        order: "start-first",
        failure_action: "rollback",
        delay: "1s",
      },
    };

    dockerComposeConfig.services["plugin-core-api"].deploy = deploy;
    if (configs.core && Number(configs.core.replicas)) {
      dockerComposeConfig.services["plugin-core-api"].deploy.replicas = Number(
        configs.core.replicas
      );
    }
    dockerComposeConfig.services.coreui.deploy = deploy;
    dockerComposeConfig.services.gateway.deploy = deploy;
  }

  if (configs.essyncer) {
    const essyncer_tag = configs.essyncer.image_tag || image_tag;
    dockerComposeConfig.services.essyncer = {
      image: `okrservice/essyncer:${essyncer_tag}`,
      environment: {
        ELASTICSEARCH_URL: `http://${
          configs.db_server_address ||
          (isSwarm ? "erxes-dbs_elasticsearch" : "elasticsearch")
        }:9200`,
        MONGO_URL: `${mongoEnv(configs)}${
          (configs.essyncer || {}).mongoOptions || ""
        }`,
      },
      volumes: ["./essyncerData:/data/essyncerData"],
      extra_hosts,
      networks: ["erxes"],
    };
  }

  if (configs.widgets) {
    dockerComposeConfig.services.widgets = {
      image: `okrservice/widgets:${image_tag}`,
      environment: {
        ...be_env,
        PORT: "3200",
        ROOT_URL: widgets_domain,
        API_URL: gateway_url,
        API_SUBSCRIPTIONS_URL: subscription_url,
      },
      ports: ["3200:3200"],
      networks: ["erxes"],
    };
  }

  if (configs.installer) {
    await fse.copy(`${__dirname}/../../installer`, filePath("installer"));

    await execCommand(`cd installer && npm install`);

    if (!fromInstaller) {
      let host = RABBITMQ_HOST;

      if (!configs.db_server_address) {
        host = host.replace("erxes-dbs_rabbitmq", "127.0.0.1");
      }

      await execCommand(`cd installer && npm run pm2 delete all`, true);
      await execCommand(
        `cd installer && RABBITMQ_HOST=${host} npm run pm2 start index.js`
      );
    }
  }

  let pluginsMapLocation =
    "https://okrservice-plugins.s3.ap-northeast-2.amazonaws.com/pluginsMap.js";

  if (configs.image_tag) {
    if (buildPlugins.includes(configs.image_tag)) {
      pluginsMapLocation = `https://okrservice-${configs.image_tag}-plugins.s3.ap-northeast-2.amazonaws.com/pluginsMap.js`;
    } else {
      pluginsMapLocation = `https://okrservice-release-plugins.s3.ap-northeast-2.amazonaws.com/${image_tag}/pluginsMap.js`;
    }
  }

  log(`Downloading pluginsMap.js from ${pluginsMapLocation} ....`);
  await execCurl(pluginsMapLocation, "pluginsMap.js");

  const pluginsMap = require(filePath("pluginsMap.js"));

  if (configs.private_plugins_map) {
    log("Downloading private plugins map ....");

    await execCurl(configs.private_plugins_map, "privatePluginsMap.js");

    log("Merging plugin maps ....");

    const privatePluginsMap = require(filePath("privatePluginsMap.js"));

    for (const key of Object.keys(privatePluginsMap)) {
      pluginsMap[key] = privatePluginsMap[key];
    }
  }

  if (downloadLocales) {
    updateLocales();
  }

  const uiPlugins = [];
  const essyncerJSON = {
    plugins: [
      {
        db_name: configs.mongo.db_name || "erxes",
        collections: [
          {
            name: "users",
            schema: '{"customFieldsData": <nested>}',
            script: "",
          },
          {
            name: "conformities",
            schema: ` 
            {
              "mainType": {
                "type": "keyword"
              },
              "mainTypeId": {
                "type": "keyword"
              },
              "relType": {
                "type": "keyword"
              },
              "relTypeId": {
                "type": "keyword"
              }
            }
          `,
            script: "",
          },
          {
            name: "tags",
            schema: "{}",
            script: "",
          },
          {
            name: "forms",
            schema: "{}",
            script: "",
          },
          {
            name: "fields",
            schema: "{}",
            script: "",
          },
          {
            name: "fields_groups",
            schema: "{}",
            script: "",
          },
          {
            name: "form_submissions",
            schema: "{ 'value': { 'type': 'text' } }",
            script: "",
          },
          {
            name: "customers",
            schema:
              "{'createdAt': { 'type': 'date' }, 'organizationId': { 'type': 'keyword' }, 'state': { 'type': 'keyword' }, 'primaryEmail': { 'type': 'text', 'analyzer': 'uax_url_email_analyzer', 'fields': { 'keyword' : { 'type':'keyword' } } }, 'primaryPhone': { 'type': 'text', 'fields': { 'raw': { 'type': 'keyword' } } }, 'primaryAddress': { 'type': 'text', 'fields': { 'raw': { 'type': 'keyword' } } }, 'code': { 'type': 'text', 'fields': { 'raw': { 'type': 'keyword' } } }, 'integrationId': { 'type': 'keyword' }, 'relatedIntegrationIds': { 'type': 'keyword' }, 'scopeBrandIds': { 'type': 'keyword' }, 'ownerId': { 'type': 'keyword' }, 'position': { 'type': 'keyword' }, 'leadStatus': { 'type': 'keyword' }, 'tagIds': { 'type': 'keyword' }, 'companyIds': { 'type': 'keyword' }, 'mergedIds': { 'type': 'keyword' }, 'status': { 'type': 'keyword' }, 'emailValidationStatus': { 'type': 'keyword' }, 'customFieldsData': <nested>, 'trackedData': <nested>}",
            script:
              "if (ns.indexOf('customers') > -1) { if (doc.urlVisits) { delete doc.urlVisits } if (doc.trackedDataBackup) { delete doc.trackedDataBackup } if (doc.customFieldsDataBackup) { delete doc.customFieldsDataBackup } if (doc.messengerData) { delete doc.messengerData } if (doc.data) {delete doc.data}}",
          },
          {
            name: "companies",
            schema:
              "{ 'createdAt': { 'type': 'date' }, 'primaryEmail': { 'type': 'text', 'analyzer': 'uax_url_email_analyzer', 'fields': { 'keyword' : { 'type':'keyword' } } }, 'primaryName': { 'type': 'text', 'fields': { 'raw': { 'type': 'keyword' } } }, 'primaryAddress': { 'type': 'text', 'fields': { 'raw': { 'type': 'keyword' } } }, 'scopeBrandIds': { 'type': 'keyword' }, 'plan': { 'type': 'keyword' }, 'industry': { 'type': 'keyword' }, 'parentCompanyId': { 'type': 'keyword' }, 'ownerId': { 'type': 'keyword' }, 'tagIds': { 'type': 'keyword' }, 'mergedIds': { 'type': 'keyword' }, 'status': { 'type': 'keyword' }, 'businessType': { 'type': 'keyword' }, 'customFieldsData' : <nested>, 'trackedData': <nested> }",
            script: "",
          },
          {
            name: "products",
            schema:
              "{ 'code': { 'type': 'keyword' }, 'name': { 'type': 'keyword' }, 'shortName': { 'type': 'keyword' }, 'status': { 'type': 'keyword' }, 'barcodeDescription': { 'type': 'keyword' }, 'order': { 'type': 'keyword' }, 'description': { 'type': 'keyword' }, 'tagIds': { 'type': 'keyword' }, 'categoryId': { 'type': 'keyword' }, 'type': { 'type': 'keyword' }, 'unitPrice': { 'type': 'float' }, 'createdAt': { 'type': 'date' }, 'uom': { 'type': 'keyword' }, 'vendorId': { 'type': 'keyword' }, 'sameMasks': { 'type': 'keyword' }, 'sameDefault': { 'type': 'keyword' }, 'customFieldsData': <nested>, 'attachment': <nested>, 'attachmentMore': <nested>, 'subUoms': <nested>, 'barcodes': { 'type': 'keyword' } }",
            script:
              "if (ns.indexOf('products') > -1) { if (doc.variants) { delete doc.variants }}",
          },
        ],
      },
    ],
  };

  const permissionsJSON = [];

  for (const plugin of configs.plugins || []) {
    dockerComposeConfig.services[`plugin-${plugin.name}-api`] =
      generatePluginBlock(configs, plugin);

    if (pluginsMap[plugin.name]) {
      const uiConfig = pluginsMap[plugin.name].ui;

      if (uiConfig) {
        uiPlugins.push(
          JSON.stringify({
            name: plugin.name,
            ...pluginsMap[plugin.name].ui,
          })
        );
      }

      const apiConfig = pluginsMap[plugin.name].api;

      if (apiConfig) {
        if (apiConfig.essyncer) {
          const pluginExtraEnv = plugin.extra_env || {};
          const match = (pluginExtraEnv.MONGO_URL || "").match(
            /\/([^/?]+)(\?|$)/
          );

          const db_name = match ? match[1] : null;

          essyncerJSON.plugins.push({
            db_name: db_name || configs.mongo.db_name || "erxes",
            collections: apiConfig.essyncer,
          });
        }

        if (apiConfig.permissions) {
          permissionsJSON.push(apiConfig.permissions);
        }
      }
    }
  }

  if (!(await fse.exists(filePath("plugin-uis")))) {
    await execCommand("mkdir plugin-uis", true);
  }

  if (uis) {
    for (const plugin of configs.plugins || []) {
      if (pluginsMap[plugin.name] && pluginsMap[plugin.name].ui) {
        await syncUI(plugin);
      }
    }
  }

  log("Generating ui plugins.js ....");

  await fs.promises.writeFile(
    filePath("plugins.js"),
    `
    window.plugins = [
      ${uiPlugins.join(",")}
    ]
  `.replace(/plugin-uis.s3.us-west-2.amazonaws.com/g, NGINX_HOST)
  );

  const extraServices = configs.extra_services || {};

  for (const serviceName of Object.keys(extraServices)) {
    const service = extraServices[serviceName];

    dockerComposeConfig.services[serviceName] = {
      ...service,
      networks: ["erxes"],
    };
  }

  const yamlString = yaml.stringify(dockerComposeConfig);

  log("Generating permissions json ....");
  await fse.writeJSON(filePath("permissions.json"), permissionsJSON);

  // essyncer
  if (!(await fse.exists(filePath("essyncerData")))) {
    await execCommand("mkdir essyncerData", true);
  }

  log("Generating essyncer json ....");
  await fse.writeJSON(filePath("essyncerData/plugins.json"), essyncerJSON);

  log("Generating docker-compose.yml ....");

  fs.writeFileSync(filePath("docker-compose.yml"), yamlString);

  log("Generating nginx.conf ....");

  const commonParams = `
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Server $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
  `;

  const commonConfig = `
    proxy_set_header Upgrade $http_upgrade;
    ${commonParams}
  `;

  await fs.promises.writeFile(
    filePath("nginx.conf"),
    `
    server {
            listen 80;
            server_name ${NGINX_HOST};

            index index.html;
            error_log /var/log/nginx/erxes.error.log;
            access_log /var/log/nginx/erxes.access.log;
            location / {
                    proxy_pass http://127.0.0.1:${UI_PORT}/;
                    ${commonParams}
            }
            location /widgets/ {
                    proxy_pass http://127.0.0.1:3200/;
                    ${commonConfig}
            }
            location /gateway/ {
                    proxy_pass http://127.0.0.1:${GATEWAY_PORT}/;
                    ${commonConfig}
            }

            location /dashboard/api {
                proxy_pass http://127.0.0.1:4300/;
                ${commonConfig}
            }
    }
  `
  );

  log("Deploy ......");

  if (isSwarm) {
    await execCommand("docker service rm erxes_gateway", true);

    return execCommand(
      "docker stack deploy --compose-file docker-compose.yml erxes --with-registry-auth --resolve-image changed"
    );
  }

  return execCommand("docker-compose up -d");
};

const update = async ({ serviceNames, noimage, uis }) => {
  await cleaning();

  const configs = await fse.readJSON(filePath("configs.json"));

  for (const name of serviceNames.split(",")) {
    const pluginConfig = (configs.plugins || []).find((p) => p.name === name);
    const image_tag =
      (pluginConfig && pluginConfig.image_tag) ||
      (configs[name] && configs[name].image_tag) ||
      configs.image_tag ||
      "federation";

    if (!noimage) {
      log(`Updating image ${name}......`);

      if (["crons", "gateway", "client-portal"].includes(name)) {
        await execCommand(
          `docker service update erxes_${name} --image okrservice/${name}:${image_tag}`
        );
        continue;
      }

      if (["dashboard-api"].includes(name)) {
        await execCommand(
          `docker service update erxes_dashboard --image okrservice/dashboard:${image_tag}`
        );
        continue;
      }

      if (name === "coreui") {
        await execCommand(
          `docker service update erxes_coreui --image okrservice/erxes:${image_tag}`
        );
        continue;
      }

      if (name === "widgets") {
        await execCommand(
          `docker service update erxes_widgets --image okrservice/widgets:${image_tag}`
        );
        continue;
      }

      if (name === "core") {
        await execCommand(
          `docker service update erxes_plugin-core-api --image okrservice/core:${image_tag}`
        );
        continue;
      }

      if (name === "workers") {
        await execCommand(
          `docker service update erxes_plugin-workers-api --image okrservice/workers:${image_tag}`
        );
        continue;
      }

      if (pluginConfig) {
        const tag = pluginConfig.image_tag || configs.image_tag || "federation";
        const registry = pluginConfig.registry
          ? `${pluginConfig.registry}/`
          : "";

        const docker_image_tag = pluginConfig?.docker_image_tag;

        await execCommand(
          `docker service update erxes_plugin-${name}-api --image ${docker_image_tag ? `${docker_image_tag}` : `${registry}okrservice/plugin-${name}-api:${tag}`} --with-registry-auth`
        );
      } else {
        console.error("No plugin found");
      }
    }

    if (pluginConfig) {
      if (uis) {
        await execCommand(`rm -rf plugin-uis/${`plugin-${name}-ui`}`, true);
        await syncUI(pluginConfig);
      }
    } else {
      console.error("No plugin found");
    }
  }

  if (uis) {
    log("Restart core ui ....");
    await execCommand(`docker service update --force erxes_coreui`);
  }

  log("Updating gateway ....");
  await execCommand(`docker service update --force erxes_gateway`);
};

const restart = async (name) => {
  await cleaning();

  log(`Restarting .... ${name}`);

  if (["gateway", "coreui", "crons"].includes(name)) {
    await execCommand(`docker service update --force erxes_${name}`);
    return;
  }

  await execCommand(`docker service update --force erxes_plugin-${name}-api`);
};

module.exports.installerUpdateConfigs = async () => {
  const type = process.argv[3];
  const name = process.argv[4];

  const configs = await fse.readJSON(filePath("configs.json"));

  if (type === "install") {
    const prevEntry = configs.plugins.find((p) => p.name === name);

    if (!prevEntry) {
      configs.plugins.push({ name: name });
    }
  }

  if (type === "uninstall") {
    configs.plugins = configs.plugins.filter((p) => p.name !== name);
  }

  log("Updating configs.json ....");

  await fse.writeJSON(filePath("configs.json"), configs);
};

module.exports.removeService = async () => {
  const name = process.argv[3];

  log(`Removing ${name} service ....`);

  await execCommand(`docker service rm ${name}`, true);
};

module.exports.up = (program) => {
  return up({
    uis: program.uis,
    fromInstaller: program.fromInstaller,
    downloadLocales: program.locales,
  });
};

const dumpDb = async (program) => {
  if (process.argv.length < 4) {
    return console.log("Pass db name !!!");
  }

  const dbName = process.argv[3];

  const configs = await fse.readJSON(filePath("configs.json"));

  await execCommand(
    `docker ps --format "{{.Names}}" | grep mongo > docker-mongo-name.txt`
  );
  const dockerMongoName = fs
    .readFileSync("docker-mongo-name.txt")
    .toString()
    .replace("\n", "");

  log("Running mongodump ....");
  await execCommand(
    `docker exec ${dockerMongoName} mongodump -u ${configs.mongo.username} -p ${configs.mongo.password} --authenticationDatabase admin --db ${dbName}`
  );

  if (program.copydump) {
    log("Copying dump ....");
    await execCommand(`docker cp ${dockerMongoName}:/dump .`);

    log("Compressing dump ....");
    await execCommand(`tar -cf dump.tar dump`);

    log("Removing dump from container ....");
    await execCommand(`docker exec ${dockerMongoName} rm -rf dump`);

    log("Removing uncompressed dump folder ....");
    await execCommand(`rm -rf dump`);
  }
};

module.exports.deployDbs = deployDbs;
module.exports.dumpDb = dumpDb;

module.exports.update = (program) => {
  if (process.argv.length < 4) {
    return console.log("Pass service names !!!");
  }

  const serviceNames = process.argv[3];

  return update({ serviceNames, noimage: program.noimage, uis: program.uis });
};

module.exports.restart = () => {
  const name = process.argv[3];
  return restart(name);
};

module.exports.syncui = () => {
  const name = process.argv[3];
  const ui_location = process.argv[4];

  return syncUI({ name, ui_location });
};
