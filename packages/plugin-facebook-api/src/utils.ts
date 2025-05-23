import * as graph from "fbgraph";
import { FacebookAdapter } from "botbuilder-adapter-facebook-erxes";
import * as AWS from "aws-sdk";
import * as fs from "fs";
import fetch from "node-fetch";
import { pipeline } from "node:stream/promises";

import { IModels } from "./connectionResolver";
import { debugBase, debugError, debugFacebook } from "./debuggers";
import { IIntegrationDocument } from "./models/Integrations";
import { generateAttachmentUrl, getConfig } from "./commonUtils";
import { IAttachment, IAttachmentMessage } from "./types";
import { getFileUploadConfigs } from "./messageBroker";
import { randomAlphanumeric } from "@erxes/api-utils/src/random";
import { getSubdomain } from "@erxes/api-utils/src/core";
import { BOT_SUBSCRIBE_FIELDS } from "./constants";

export const graphRequest = {
  base(method: string, path?: any, accessToken?: any, ...otherParams) {
    // set access token
    graph.setAccessToken(accessToken);
    graph.setVersion("7.0");

    return new Promise((resolve, reject) => {
      graph[method](path, ...otherParams, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  get(...args): any {
    return this.base("get", ...args);
  },

  post(...args): any {
    return this.base("post", ...args);
  },

  delete(...args): any {
    return this.base("del", ...args);
  }
};
export const getPostDetails = async (
  pageId: string,
  pageTokens: { [key: string]: string },
  postId: string
) => {
  let pageAccessToken;

  try {
    pageAccessToken = getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(`Error occurred while getting page access token: ${e.message}`);
    throw new Error();
  }

  try {
    const response: any = await graphRequest.get(
      `/${postId}?fields=permalink_url,message,created_time`,
      pageAccessToken
    );

    return response;
  } catch (e) {
    debugError(`Error occurred while getting facebook post: ${e.message}`);
    return null;
  }
};
export const getPageList = async (
  models: IModels,
  accessToken?: string,
  kind?: string
) => {
  const response: any = await graphRequest.get(
    "/me/accounts?limit=100",
    accessToken
  );

  const pages: any[] = [];

  for (const page of response.data) {
    const integration = await models.Integrations.findOne({
      facebookPageIds: page.id,
      kind
    });

    pages.push({
      id: page.id,
      name: page.name,
      isUsed: integration ? true : false
    });
  }

  return pages;
};

export const getPageAccessToken = async (
  pageId: string,
  userAccessToken: string
) => {
  const response = await graphRequest.get(
    `${pageId}/?fields=access_token`,
    userAccessToken
  );

  return response.access_token;
};

export const refreshPageAccesToken = async (
  models: IModels,
  pageId: string,
  integration: IIntegrationDocument
) => {
  const account = await models.Accounts.getAccount({
    _id: integration.accountId
  });

  const facebookPageTokensMap = integration.facebookPageTokensMap || {};

  const pageAccessToken = await getPageAccessToken(pageId, account.token);

  facebookPageTokensMap[pageId] = pageAccessToken;

  await models.Integrations.updateOne(
    { _id: integration._id },
    { $set: { facebookPageTokensMap } }
  );

  return facebookPageTokensMap;
};

export const getPageAccessTokenFromMap = (
  pageId: string,
  pageTokens: { [key: string]: string }
): string => {
  return (pageTokens || {})[pageId];
};

export const subscribePage = async (
  models: IModels,
  pageId,
  pageToken
): Promise<{ success: true } | any> => {

  let subscribed_fields = [
    "conversations",
    "feed",
    "messages",
    "standby",
    "messaging_handovers"
  ]

  const bot = await models.Bots.findOne({ pageId })

  if (bot) {
    subscribed_fields = [...new Set([...subscribed_fields, ...BOT_SUBSCRIBE_FIELDS])]
  }

  return graphRequest.post(`${pageId}/subscribed_apps`, pageToken, {
    subscribed_fields
  });
};

export const getPostLink = async (
  pageId: string,
  pageTokens: { [key: string]: string },
  postId: string
) => {
  let pageAccessToken;

  try {
    pageAccessToken = getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(`Error occurred while getting page access token: ${e.message}`);
    throw new Error();
  }

  try {
    const response: any = await graphRequest.get(
      `/${postId}?fields=permalink_url`,
      pageAccessToken
    );
    return response.permalink_url ? response.permalink_url : "";
  } catch (e) {
    debugError(`Error occurred while getting facebook post: ${e.message}`);
    return null;
  }
};

export const unsubscribePage = async (
  pageId,
  pageToken
): Promise<{ success: true } | any> => {
  return graphRequest
    .delete(`${pageId}/subscribed_apps`, pageToken)
    .then((res) => res)
    .catch((e) => {
      debugError(e);
      throw e;
    });
};

export const getFacebookUser = async (
  models: IModels,
  pageId: string,
  pageTokens: { [key: string]: string },
  fbUserId: string
) => {
  let pageAccessToken;

  try {
    pageAccessToken = getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(`Error occurred while getting page access token: ${e.message}`);
    return null;
  }

  const pageToken = pageAccessToken;

  try {
    const response = await graphRequest.get(`/${fbUserId}`, pageToken);

    return response;
  } catch (e) {
    if (e.message.includes("access token")) {
      await models.Integrations.updateOne(
        { facebookPageIds: pageId },
        { $set: { healthStatus: "page-token", error: `${e.message}` } }
      );
    }

    throw new Error(e);
  }
};

export const uploadMedia = async (
  subdomain: string,
  url: string,
  video: boolean
) => {
  const mediaFile = `${randomAlphanumeric()}.${video ? "mp4" : "jpg"}`;

  const { AWS_BUCKET } = await getFileUploadConfigs(subdomain);
  const s3 = await createAWS(subdomain);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `uploadMedia: unexpected response ${response.statusText}`
      );
    }

    const uploadParams = {
      Bucket: AWS_BUCKET,
      Key: mediaFile,
      Body: response.body,
      ACL: "public-read",
      ContentDisposition: "inline", // Set this header to make it viewable in the browser
      ContentType: video ? "video/mp4" : "image/jpeg" // Set the appropriate Content-Type
    };

    const data = await s3.upload(uploadParams).promise(); // Use .promise() for cleaner code
    return data.Location; // Return the public URL of the uploaded file
  } catch (e) {
    debugError(`Error occurred while uploading media: ${e.message}`);
    return null;
  }
};

export const getFacebookUserProfilePic = async (
  pageId: string,
  pageTokens: { [key: string]: string },
  fbId: string,
  subdomain: string
): Promise<string | null> => {
  let pageAccessToken: string;

  try {
    pageAccessToken = getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(`Error occurred while getting page access token: ${e.message}`);
    throw new Error();
  }

  try {
    const response: any = await graphRequest.get(
      `/${fbId}/picture?height=600`,
      pageAccessToken
    );

    const { UPLOAD_SERVICE_TYPE } = await getFileUploadConfigs(subdomain);

    if (UPLOAD_SERVICE_TYPE === "AWS") {
      const awsResponse = await uploadMedia(
        subdomain,
        response.location,
        false
      );

      return awsResponse as string; // Ensure the return type is string
    }

    // Return the profile picture URL directly if not uploading to AWS
    return response.location as string; // Type assertion to ensure it's a string
  } catch (e) {
    debugError(
      `Error occurred while getting facebook user profile pic: ${e.message}`
    );
    return null;
  }
};

export const restorePost = async (
  postId: string,
  pageId: string,
  pageTokens: { [key: string]: string }
) => {
  let pageAccessToken;

  try {
    pageAccessToken = await getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(
      `Error ocurred while trying to get page access token with ${e.message}`
    );
  }

  const fields = `/${postId}?fields=caption,description,link,picture,source,message,from,created_time,comments.summary(true)`;

  try {
    return await graphRequest.get(fields, pageAccessToken);
  } catch (e) {
    throw new Error(e);
  }
};

export const sendReply = async (
  models: IModels,
  url: string,
  data: any,
  recipientId: string,
  integrationId: string
) => {
  const integration = await models.Integrations.getIntegration({
    erxesApiId: integrationId
  });

  const { facebookPageTokensMap = {} } = integration;

  let pageAccessToken;

  try {
    pageAccessToken = getPageAccessTokenFromMap(
      recipientId,
      facebookPageTokensMap
    );
  } catch (e) {
    debugError(
      `Error ocurred while trying to get page access token with ${e.message}`
    );
    return e;
  }

  try {
    const response = await graphRequest.post(`${url}`, pageAccessToken, {
      ...data
    });
    debugFacebook(`Successfully sent data to facebook ${JSON.stringify(data)}`);
    return response;
  } catch (e) {
    debugError(
      `Error ocurred while trying to send post request to facebook ${e.message
      } data: ${JSON.stringify(data)}`
    );

    if (e.message.includes("access token")) {
      await models.Integrations.updateOne(
        { _id: integration._id },
        { $set: { healthStatus: "page-token", error: `${e.message}` } }
      );
    } else if (e.code !== 10) {
      await models.Integrations.updateOne(
        { _id: integration._id },
        { $set: { healthStatus: "account-token", error: `${e.message}` } }
      );
    }

    if (e.message.includes("does not exist")) {
      throw new Error("Comment has been deleted by the customer");
    }

    throw new Error(e.message);
  }
};

export const generateAttachmentMessages = (
  subdomain: string,
  attachments: IAttachment[]
) => {
  const messages: IAttachmentMessage[] = [];

  for (const attachment of attachments || []) {
    let type = "file";

    if (attachment.type.startsWith("image")) {
      type = "image";
    }

    const url = generateAttachmentUrl(subdomain, attachment.url);

    messages.push({
      attachment: {
        type,
        payload: {
          url
        }
      }
    });
  }

  return messages;
};

export const fetchPagePost = async (postId: string, accessToken: string) => {
  const fields = "message,created_time,full_picture,picture,permalink_url";

  const response = await graphRequest.get(
    `/${postId}?fields=${fields}&access_token=${accessToken}`
  );

  return response || null;
};

export const fetchPagePosts = async (pageId: string, accessToken: string) => {
  const fields = "message,created_time,full_picture,picture,permalink_url";
  const response = await graphRequest.get(
    `/${pageId}/posts?fields=${fields}&access_token=${accessToken}`
  );

  return response.data || [];
};

export const fetchPagesPosts = async (pageId: string, accessToken: string) => {
  const fields = "message,created_time,full_picture,picture,permalink_url";
  const response = await graphRequest.get(
    `/${pageId}/posts?fields=${fields}&access_token=${accessToken}`
  );

  return response.data || [];
};

export const fetchPagesPostsList = async (
  pageIds: string[],
  tokensMap: Record<string, string>,
  limit: number
) => {
  const fields = "message,created_time,full_picture,picture,permalink_url";
  const postsPromises = pageIds.map(async (pageId) => {
    const accessToken = tokensMap[pageId];
    if (!accessToken) {
      console.warn(`No access token found for page ${pageId}`);
      return [];
    }

    try {
      const response = await graphRequest.get(
        `/${pageId}/posts?fields=${fields}&access_token=${accessToken}&limit=${limit}`
      );
      return response.data || [];
    } catch (error) {
      debugError(`Error fetching posts for page ${pageId}:`, error);
      return [];
    }
  });

  const allPosts = await Promise.all(postsPromises);
  return allPosts.flat()
};
export const checkFacebookPages = async (models: IModels, pages: any) => {
  for (const page of pages) {
    const integration = await models.Integrations.findOne({ pageId: page.id });

    page.isUsed = integration ? true : false;
  }

  return pages;
};

export const getAdapter = async (models: IModels): Promise<any> => {
  const accessTokensByPageId = {};

  const FACEBOOK_VERIFY_TOKEN = await getConfig(
    models,
    "FACEBOOK_VERIFY_TOKEN"
  );
  const FACEBOOK_APP_SECRET = await getConfig(models, "FACEBOOK_APP_SECRET");

  if (!FACEBOOK_VERIFY_TOKEN || !FACEBOOK_APP_SECRET) {
    return debugBase("Invalid facebook config");
  }

  return new FacebookAdapter({
    verify_token: FACEBOOK_VERIFY_TOKEN,
    app_secret: FACEBOOK_APP_SECRET,
    getAccessTokenForPage: async (pageId: string) => {
      return accessTokensByPageId[pageId];
    }
  });
};

export const createAWS = async (subdomain: string) => {
  const {
    AWS_FORCE_PATH_STYLE,
    AWS_COMPATIBLE_SERVICE_ENDPOINT,
    AWS_BUCKET,
    AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY_ID
  } = await getFileUploadConfigs(subdomain);

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_BUCKET) {
    throw new Error("AWS credentials are not configured");
  }

  const options: {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    s3ForcePathStyle?: boolean;
  } = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  };

  if (AWS_FORCE_PATH_STYLE === "true") {
    options.s3ForcePathStyle = true;
  }

  if (AWS_COMPATIBLE_SERVICE_ENDPOINT) {
    options.endpoint = AWS_COMPATIBLE_SERVICE_ENDPOINT;
  }

  // initialize s3
  return new AWS.S3(options);
};

export const checkIsAdsOpenThread = (entry: any[] = []) => {
  const messaging = entry[0]?.messaging || [];

  const referral = (messaging || [])[0]?.message?.referral;

  if (!referral) {
    return false;
  }

  const isSourceAds = referral?.source === "ADS";
  const isTypeOpenThread = referral?.type === "OPEN_THREAD";
  const hasAdsContextData = !referral?.ads_context_data;

  return isSourceAds && isTypeOpenThread && hasAdsContextData;
};
