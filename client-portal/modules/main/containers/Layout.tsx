import 'erxes-icon/css/erxes.min.css';

import AppProvider, { AppConsumer } from '../../appContext';

import DumbLayout from '../components/Layout';
import Head from 'next/head';
import React from 'react';
import { Store } from '../../types';
import { readFile } from '../../common/utils';

type Props = {
  children: (values: any) => JSX.Element;
  headerBottomComponent?: React.ReactNode;
  headingSpacing?: boolean;
  // FAQ 화면에서만 흰 위쪽 바로 그린다
  lightHeader?: boolean;
};

const Layout = (props: Props) => {
  return (
    <AppProvider>
      <AppConsumer>
        {({ config, topic, currentUser, ...otherProps }: Store) => {
          const { baseFont } = (config || ({} as any)).styles || {};

          return (
            <>
              <Head>
                {config.icon && (
                  <link
                    rel="shortcut icon"
                    href={readFile(config.icon || '/static/favicon.png')}
                    type="image/x-icon"
                  />
                )}
                {config.name && <title>{config.name}</title>}
                {baseFont && (
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                      body {
                        font-family: ${baseFont} !important;
                      }
                  `,
                    }}
                  />
                )}
              </Head>
              <DumbLayout
                {...props}
                {...otherProps}
                config={config}
                currentUser={currentUser}
                topic={topic}
              />
            </>
          );
        }}
      </AppConsumer>
    </AppProvider>
  );
};

export default Layout;
