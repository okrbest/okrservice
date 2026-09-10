import '@nateradebaugh/react-datetime/css/react-datetime.css';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';
import 'erxes-icon/css/erxes.min.css';

import { getEnv, readFile } from 'modules/common/utils';

import { ApolloProvider } from '@apollo/client';
import { AppProvider } from './appContext';
// global style
import { GlobalStyle } from '@erxes/ui/src/styles/global-styles';
import React from 'react';
import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import { getThemeItem } from '@erxes/ui/src/utils/core';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc, { parseLocal: true });

const NO_OWNER = 'no owner';

const root = createRoot(document.getElementById('root') as any);
const envs = getEnv();

/**
 * 테마 설정 저장. iOS 등에서 사이트 데이터가 차단되어 있으면
 * localStorage 접근만으로 SecurityError가 발생한다. 테마는 부가 기능이므로
 * 실패해도 앱 구동을 막지 않는다.
 */
const storeThemeConfigs = (themeConfigs: string) => {
  try {
    localStorage.setItem('erxes_theme_configs', themeConfigs);
  } catch (e) {
    console.error(`테마 설정을 저장하지 못했습니다: ${(e as Error).message}`);
  }
};

const applyFavicon = () => {
  try {
    const link = document.createElement('link');
    link.id = 'favicon';
    link.rel = 'shortcut icon';

    const favicon = getThemeItem('favicon');
    link.href =
      favicon && typeof favicon === 'string'
        ? readFile(favicon)
        : '/favicon.png';

    document.head.appendChild(link);
  } catch (e) {
    console.error(`파비콘을 적용하지 못했습니다: ${(e as Error).message}`);
  }
};

let hasRendered = false;

/**
 * 초기 설정 조회 결과와 무관하게 앱을 반드시 렌더링한다.
 * 이 함수가 호출되지 않으면 #root가 빈 채로 남아 로딩 화면에서 멈춘다.
 */
const renderApp = (initialSetup?: string) => {
  if (hasRendered) {
    return;
  }
  hasRendered = true;

  const apolloClient = require('./apolloClient').default;
  const { OwnerDescription } = require('modules/auth/components/OwnerSetup');
  const OwnerSetup = require('modules/auth/containers/OwnerSetup').default;
  const Routes = require('./routes').default;
  const AuthLayout =
    require('@erxes/ui/src/layout/components/AuthLayout').default;

  const body =
    initialSetup === NO_OWNER ? (
      <AuthLayout
        col={{ first: 5, second: 6 }}
        content={<OwnerSetup />}
        description={<OwnerDescription />}
      />
    ) : (
      <Routes />
    );

  root.render(
    <ApolloProvider client={apolloClient}>
      <AppProvider>
        <GlobalStyle />
        {body}
      </AppProvider>
    </ApolloProvider>,
  );
};

fetch(`${envs.REACT_APP_API_URL}/initial-setup?envs=${JSON.stringify(envs)}`, {
  credentials: 'include',
})
  .then((response) => response.text())
  .then((res) => {
    if (res !== NO_OWNER) {
      storeThemeConfigs(res);
      applyFavicon();
    }

    renderApp(res);
  })
  .catch((e) => {
    // 초기 설정 조회에 실패해도 로그인 화면까지는 진입할 수 있어야 한다.
    console.error(`초기 설정을 불러오지 못했습니다: ${e.message}`);

    renderApp();
  });
