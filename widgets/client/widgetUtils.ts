import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { ENV } from './types';

export const getEnv = (): ENV => {
  return (window as any).erxesEnv;
};

export const getStorage = () => {
  return localStorage.getItem("erxes") || "{}";
}

export const listenForCommonRequests = async (event: any, iframe: any) => {
  const raw = event?.data
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return
  }
  const { message, fromErxes, source, key, value } = raw as any

  if (fromErxes && iframe.contentWindow) {
    if (message === "requestingBrowserInfo") {
      iframe.contentWindow.postMessage(
        {
          fromPublisher: true,
          source,
          message: "sendingBrowserInfo",
          browserInfo: await getBrowserInfo()
        },
        "*"
      );
    }

    if (message === "setLocalStorageItem") {
      const callInfo = {
        key,
        value,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        stack: new Error().stack
      };

      const erxesStorage = JSON.parse(localStorage.getItem("erxes") || "{}");

      erxesStorage[key] = value;

      localStorage.setItem("erxes", JSON.stringify(erxesStorage));
    }
  }
}

declare const window: any;

/*
 * Generate <host>/<integration kind> from <host>/build/<integration kind>Widget.bundle.js
 * 동적 삽입·async 번들에서는 document.currentScript / "마지막 script"가 번들이 아닐 수 있어 src 로 DOM 전체를 스캔합니다.
 */
export const generateIntegrationUrl = (integrationKind: string): string => {
  const needle = `/build/${integrationKind}Widget.bundle.js`

  const fromScriptSrc = (src: string): string => {
    if (!src) return ''
    const base = src.split('?')[0]
    const i = base.indexOf(needle)
    if (i === -1) return ''
    return base.slice(0, i) + `/${integrationKind}`
  }

  const cur = document.currentScript
  if (cur instanceof HTMLScriptElement) {
    const u = fromScriptSrc(cur.src)
    if (u) return u
  }

  const scripts = document.getElementsByTagName('script')
  for (let k = scripts.length - 1; k >= 0; k--) {
    const el = scripts[k]
    if (el instanceof HTMLScriptElement && el.src) {
      const u = fromScriptSrc(el.src)
      if (u) return u
    }
  }

  return ''
}

export const getBrowserInfo = async () => {
  if (window.location.hostname === 'localhost') {
    return {
      url: window.location.pathname,
      hostname: window.location.href,
      language: navigator.language,
      userAgent: navigator.userAgent,
      countryCode: 'MN',
    };
  }

  let location;

  try {
    const response = await fetch('https://geo.erxes.io');

    location = await response.json();

  } catch (e) {
    location = {
      city: '',
      remoteAddress: '',
      region: '',
      country: '',
      countryCode: ''
    };
  }

  return {
    remoteAddress: location.network,
    region: location.region,
    countryCode: location.countryCode,
    city: location.city,
    country: location.countryName,
    url: window.location.pathname,
    hostname: window.location.origin,
    language: navigator.language,
    userAgent: navigator.userAgent
  };
};

export const postMessage = (source: string, message: string, postData = {}) => {
  window.parent.postMessage(
    {
      fromErxes: true,
      source,
      message,
      ...postData
    },
    '*'
  );
};

export const setErxesProperty = (name: string, value: any) => {
  const erxes = window.Erxes || {};

  erxes[name] = value;

  window.Erxes = erxes;
};

export const getVisitorId = async () => {
  const fp = await FingerprintJS.load();

  // The FingerprintJS agent is ready.
  const result = await fp.get();

  // This is the visitor identifier:
  return result.visitorId;
}
