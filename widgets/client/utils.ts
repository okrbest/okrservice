import * as dayjs from "dayjs";
import T from "i18n-react";
import { FieldValue } from "./form/types";
import { ENV, IBrowserInfo, IRule } from "./types";

export const getSubdomain = (): string => {
  const hostnameParts = window.location.hostname.split(".");

  if (hostnameParts.length > 2) {
    return hostnameParts[0];
  }

  // return an empty string (for open-source environments with no subdomain)
  return "";
};

// get env config from process.env or window.env
export const getEnv = () => {
  const wenv = (window as any).erxesEnv || {};

  const subdomain = getSubdomain();

  const getItem = (name: string) => {
    const value = wenv[name] || process.env[name] || "";
    // Only replace '<subdomain>' if it exists in the value
    if (value.includes("<subdomain>")) {
      return value.replace("<subdomain>", subdomain);
    }

    return value;
  };

  return {
    API_URL: getItem("API_URL"),
    API_SUBSCRIPTIONS_URL: getItem("API_SUBSCRIPTIONS_URL"),
    // CALLS_APP_ID: getItem('CALLS_APP_ID'),
    // CALLS_APP_SECRET: getItem('CALLS_APP_SECRET'),
  };
};

declare const window: any;

export const postMessage = (source: string, message: string, postData = {}) => {
  window.parent.postMessage(
    {
      fromErxes: true,
      source,
      message,
      ...postData,
    },
    "*"
  );
};

type RequestBrowserInfoParams = {
  source: string;
  postData?: {};
  callback: (browserInfo: IBrowserInfo) => void;
};

export type LogicParams = {
  fieldId: string;
  operator: string;
  validation?: string;
  logicValue: FieldValue;
  fieldValue?: FieldValue;
  type?: string;
};

export const requestBrowserInfo = ({
  source,
  postData = {},
  callback,
}: RequestBrowserInfoParams) => {
  postMessage(source, "requestingBrowserInfo", postData);

  window.addEventListener("message", (event: any) => {
    const data = event.data || {};
    const { fromPublisher, message, browserInfo } = data;

    if (
      fromPublisher &&
      source === data.source &&
      message === "sendingBrowserInfo"
    ) {
      callback(browserInfo);
    }
  });
};

const setDayjsLocale = (code: string) => {
  import("dayjs/locale/" + code + ".js")
    .then(() => dayjs.locale(code))
    .catch(() => dayjs.locale("en"));
};

export const setLocale = (code: string = "en", callBack?: () => void) => {
  const validCode = typeof code === "string" && code ? code : "ko";

  import(`../locales/${validCode}.json`)
    .then((translations) => {
      T.setTexts(translations);
      setDayjsLocale(validCode);

      if (callBack) {
        callBack();
      }
    })
    .catch((e) => {
      console.error(`Failed to load locale: ${validCode}`, e);

      if (validCode !== "en") {
        console.log(`Falling back to 'en' locale`);
        setLocale("en", callBack);
      }
    });
};

export const __ = (key: string, options?: any) => {
  if (key && key.includes(".") && T.texts && typeof T.texts === "object") {
    const texts = T.texts as Record<string, any>;

    if (key in texts) {
      const value = texts[key];
      const formatted = T.format(value, options);
      return formatted ? formatted.toString() : "";
    }
  }

  const translation = T.translate(key, options);

  if (!translation) {
    return key;
  }

  return translation.toString();
};

export const scrollTo = (element: any, to: number, duration: number) => {
  const start = element.scrollTop;
  const change = to - start;
  const increment = 20;
  let currentTime = 0;

  const animateScroll = () => {
    const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
      t /= d / 2;
      if (t < 1) {
        return (c / 2) * t * t + b;
      }
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    currentTime += increment;

    const val = easeInOutQuad(currentTime, start, change, duration);

    if (element && element.scrollTop !== undefined) {
      element.scrollTop = val;
    }

    if (currentTime < duration) {
      setTimeout(animateScroll, increment);
    }
  };

  animateScroll();
};

export const makeClickableLink = (selector: string) => {
  const nodes = Array.from(document.querySelectorAll(selector));

  nodes.forEach((node) => {
    node.setAttribute("target", "__blank");
  });
};

// check if valid url
export const isValidURL = (url: string) => {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
};

/**
 * Request to get file's URL for view and download
 * @param {String} - value
 * @return {String} - URL
 */
export const readFile = (value: string, width?: number): string => {
  const { API_URL } = getEnv();

  if (!value || isValidURL(value) || value.includes("http")) {
    return value;
  }

  let url = `${API_URL}/read-file?key=${value}`;
  if (width) {
    url += `&width=${width}`;
  }

  return url;
};

export const checkRule = (rule: IRule, browserInfo: IBrowserInfo) => {
  const { language, url, city, country } = browserInfo || ({} as IBrowserInfo);
  const { value, kind, condition } = rule;
  const ruleValue: any = value;

  let valueToTest: any;

  if (kind === "browserLanguage") {
    valueToTest = language;
  }

  if (kind === "currentPageUrl") {
    valueToTest = url;
  }

  if (kind === "city") {
    valueToTest = city;
  }

  if (kind === "country") {
    valueToTest = country;
  }

  // is
  if (condition === "is" && valueToTest !== ruleValue) {
    return false;
  }

  // isNot
  if (condition === "isNot" && valueToTest === ruleValue) {
    return false;
  }

  // isUnknown
  if (condition === "isUnknown" && valueToTest) {
    return false;
  }

  // hasAnyValue
  if (condition === "hasAnyValue" && !valueToTest) {
    return false;
  }

  // startsWith
  if (
    condition === "startsWith" &&
    valueToTest &&
    !valueToTest.startsWith(ruleValue)
  ) {
    return false;
  }

  // endsWith
  if (
    condition === "endsWith" &&
    valueToTest &&
    !valueToTest.endsWith(ruleValue)
  ) {
    return false;
  }

  // contains
  if (
    condition === "contains" &&
    valueToTest &&
    !valueToTest.includes(ruleValue)
  ) {
    return false;
  }

  // greaterThan
  if (condition === "greaterThan" && valueToTest < parseInt(ruleValue, 10)) {
    return false;
  }

  if (condition === "lessThan" && valueToTest > parseInt(ruleValue, 10)) {
    return false;
  }

  if (condition === "doesNotContain" && valueToTest.includes(ruleValue)) {
    return false;
  }

  return true;
};

export const checkRules = (
  rules: IRule[],
  browserInfo: IBrowserInfo
): boolean => {
  let passedAllRules = true;

  for (const rule of rules) {
    const result = checkRule(rule, browserInfo);

    if (result === false) {
      passedAllRules = false;
    }
  }

  return passedAllRules;
};

export const striptags = (htmlString: string) => {
  const _div = document.createElement("div");
  let _text = "";

  _div.innerHTML = htmlString;
  _text = _div.textContent ? _div.textContent.trim() : "";
  _text = _text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
  return _text;
};

export const fixErrorMessage = (msg: string) =>
  msg.replace("GraphQL error: ", "");

export const newLineToBr = (content: string) => {
  return content.replace(/\r\n|\r|\n/g, "<br />");
};

export const urlify = (text: string) => {
  // validate url except html a tag
  const urlRegex =
    /(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w-]+)+[\w\-_~:/?#[\]@!&',;=.]+(?![^<>]*>|[^"]*?<\/a)/g;

  if (!text) {
    return text;
  }

  return text.replace(urlRegex, (url) => {
    if (url.startsWith("http")) {
      return `<a href="${url}" target="_blank">${url}</a>`;
    }

    return `<a href="http://${url}" target="_blank">${url}</a>`;
  });
};

export const checkLogicFulfilled = (logics: LogicParams[]) => {
  const values: { [key: string]: boolean } = {};

  for (const logic of logics) {
    const { fieldId, operator, logicValue, fieldValue, validation, type } =
      logic;
    const key = `${fieldId}_${logicValue}`;
    values[key] = false;

    // if fieldValue is set
    if (operator === "hasAnyValue") {
      if (fieldValue) {
        values[key] = true;
      } else {
        values[key] = false;
      }
    }

    // if fieldValue is not set
    if (operator === "isUnknown") {
      if (!fieldValue) {
        values[key] = true;
      } else {
        values[key] = false;
      }
    }

    // if fieldValue equals logic value
    if (operator === "is") {
      if (logicValue === fieldValue) {
        values[key] = true;
      } else {
        values[key] = false;
      }
    }

    // if fieldValue not equal to logic value
    if (operator === "isNot") {
      if (logicValue !== fieldValue) {
        values[key] = true;
      } else {
        values[key] = false;
      }
    }

    if (validation === "number") {
      // if number value: is greater than
      if (operator === "greaterThan" && fieldValue) {
        if (Number(fieldValue) > Number(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }

      // if number value: is less than
      if (operator === "lessThan" && fieldValue) {
        if (Number(fieldValue) < Number(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }
    }

    if (typeof logicValue === "string") {
      // if string value contains logicValue
      if (operator === "contains") {
        if (String(fieldValue).includes(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }

      // if string value does not contain logicValue
      if (operator === "doesNotContain") {
        if (!String(fieldValue).includes(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }

      // if string value startsWith logicValue
      if (operator === "startsWith") {
        if (String(fieldValue).startsWith(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }

      // if string value endsWith logicValue
      if (operator === "endsWith") {
        if (!String(fieldValue).endsWith(logicValue)) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }
    }

    if (validation && validation.includes("date")) {
      const dateValueToCheck = new Date(String(fieldValue));
      const logicDateValue = new Date(String(logicValue));

      // date is greather than
      if (operator === "dateGreaterThan") {
        if (dateValueToCheck > logicDateValue) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }

      // date is less than
      if (operator === "dateLessThan") {
        if (logicDateValue > dateValueToCheck) {
          values[key] = true;
        } else {
          values[key] = false;
        }
      }
    }

    if (type === "check") {
      if (
        fieldValue &&
        typeof fieldValue === "string" &&
        typeof logicValue === "string"
      ) {
        if (operator === "isNot") {
          if (!fieldValue.includes(logicValue)) {
            values[key] = true;
          } else {
            values[key] = false;
          }
        }

        if (operator === "is") {
          if (fieldValue.includes(logicValue)) {
            values[key] = true;
          } else {
            values[key] = false;
          }
        }
      }
    }
  }

  const result = [];

  for (const key of Object.keys(values)) {
    result.push(values[key]);
  }

  if (result.filter((val) => !val).length === 0) {
    return true;
  }

  return false;
};

export const loadMapApi = (apiKey: string, locale?: string) => {
  if (!apiKey) {
    return "";
  }

  const mapsURL = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places&language=${
    locale || "en"
  }&v=quarterly`;
  const scripts: any = document.getElementsByTagName("script");
  // Go through existing script tags, and return google maps api tag when found.
  for (const script of scripts) {
    if (script.src.indexOf(mapsURL) === 0) {
      return script;
    }
  }

  const googleMapScript = document.createElement("script");
  googleMapScript.src = mapsURL;
  googleMapScript.async = true;
  googleMapScript.defer = true;
  window.document.body.appendChild(googleMapScript);

  return googleMapScript;
};
