import { Config, IUser } from '../../types';
import { Container, MainContent } from '../../styles/main';

import Header from '../containers/Header';
import React from 'react';
import { getConfigColor } from '../../common/utils';

type Props = {
  topic: any;
  config: Config;
  children: any;
  currentUser: IUser;
  headerBottomComponent?: React.ReactNode;
  headingSpacing?: boolean;
  notificationsCount: number;
  lightHeader?: boolean;
};

function Layout({
  config,
  topic,
  children,
  currentUser,
  headingSpacing,
  headerBottomComponent,
  notificationsCount,
  lightHeader,
}: Props) {
  return (
    <>
      <Header
        config={config}
        currentUser={currentUser}
        headingSpacing={headingSpacing}
        headerHtml={config.headerHtml}
        headerBottomComponent={headerBottomComponent}
        notificationsCount={notificationsCount || 0}
        lightHeader={lightHeader}
      />

      <MainContent
        baseColor={getConfigColor(config, 'baseColor')}
        bodyColor={getConfigColor(config, 'bodyColor')}
        clipX={lightHeader}
      >
        <Container large={true}>
          {children({ config, topic, currentUser })}
        </Container>
      </MainContent>

      {config.footerHtml?.replace(/<[^>]*>/g, '').trim() && (
        <div dangerouslySetInnerHTML={{ __html: config.footerHtml }} />
      )}
    </>
  );
}

export default Layout;
