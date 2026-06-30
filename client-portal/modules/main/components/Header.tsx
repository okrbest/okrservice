import 'reactjs-popup/dist/index.css';

import { Alert, renderUserFullName } from '../../utils';
import {
  Badge,
  BottomComponent,
  Container,
  HamburgerMenuWrapper,
  Header as Head,
  HeaderLinks,
  HeaderLogo,
  HeaderRight,
  HeaderNavLinks,
  HeaderTitle,
  HeaderTop,
  LinkItem,
  NotificationsBadge,
  SupportMenus,
} from '../../styles/main';
import { Config, IUser } from '../../types';
import React, { useState } from 'react';
import { getConfigColor, readFile } from '../../common/utils';

import Button from '../../common/Button';
import { Dropdown } from 'react-bootstrap';
import DropdownToggle from '../../common/DropdownToggle';
import ForgotPasswordContainer from '../../user/containers/ForgotPassword';
import Icon from '../../common/Icon';
import Link from 'next/link';
import LoginContainer from '../../user/containers/Login';
import Modal from '../../common/Modal';
import NameCard from '../../common/nameCard/NameCard';
import Notifications from '../components/notifications/Notifications';
import Popup from 'reactjs-popup';
import RegisterContainer from '../../user/containers/Register';
import { withRouter } from 'next/router';
import { __ } from '../../../utils';

type Props = {
  config: Config;
  currentUser: IUser;
  logout: () => void;
  router: any;
  headerHtml?: string;
  headingSpacing?: boolean;
  headerBottomComponent?: React.ReactNode;
  notificationsCount: number;
};

function Header({
  config,
  currentUser,
  logout,
  router,
  headerHtml,
  headingSpacing,
  headerBottomComponent,
  notificationsCount,
}: Props) {
  const [showlogin, setLogin] = useState(false);
  const [showregister, setRegister] = useState(false);
  const [showResetPassword, setResetPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const onClick = (url: string) => {
    if (!currentUser && url.includes('tickets')) {
      Alert.error('Log in first to create or manage ticket cards');

      return setLogin(true);
    }
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

  const renderMenuLink = (url: string, label: string) => {
    if (isExternalUrl(url)) {
      return (
        <LinkItem
          key={`${label}-${url}`}
          color={getConfigColor(config, 'headingColor')}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        </LinkItem>
      );
    }

    return (
      <LinkItem
        key={`${label}-${url}`}
        active={router && router.pathname === url}
        onClick={() => onClick(url)}
        color={getConfigColor(config, 'headingColor')}
      >
        <Link
          href={url}
          onClick={(e) => {
            if (!currentUser && url.includes('tickets')) {
              e.preventDefault();
            }
          }}
        >
          {label}
        </Link>
      </LinkItem>
    );
  };

  const renderMenu = (url: string, label: string) => renderMenuLink(url, label);

  const renderHeaderExternalLinks = () => {
    const links = config.externalLinks || {};
    const entries = Object.entries(links).filter(([, url]) =>
      Boolean(url && String(url).trim())
    );

    if (entries.length === 0) {
      return null;
    }

    const linkColor = getConfigColor(config, 'headingColor');

    return (
      <HeaderNavLinks color={linkColor}>
        {entries.map(([label, url]) => {
          const href = String(url);

          if (isExternalUrl(href)) {
            return (
              <a
                key={`${label}-${href}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
                <span className="material-icons">open_in_new</span>
              </a>
            );
          }

          return (
            <Link key={`${label}-${href}`} href={href}>
              <a>{label}</a>
            </Link>
          );
        })}
      </HeaderNavLinks>
    );
  };

  const hasHamburgerItems = () => {
    if (config.publicTaskToggle) {
      return true;
    }

    if (currentUser) {
      return Boolean(
        config.ticketToggle ||
          config.dealToggle ||
          config.purchaseToggle ||
          config.taskToggle,
      );
    }

    return false;
  };

  const renderAuth = () => {
    if (!config.ticketToggle && !config.taskToggle && !config.dealToggle) {
      return null;
    }

    return (
      <>
        <Button
          className="border"
          btnStyle="link"
          uppercase={false}
          onClick={() => setRegister(true)}
        >
          Sign up
        </Button>
        <Button
          btnStyle="ghost"
          className="ghost"
          uppercase={false}
          onClick={() => setLogin(true)}
        >
          Sign in
        </Button>
      </>
    );
  };

  const renderCurrentUser = () => {
    return (
      <>
        <Popup
          trigger={
            <NotificationsBadge>
              {notificationsCount > 0 && <Badge>{notificationsCount}</Badge>}
              <Icon icon="bell" size={22} />
            </NotificationsBadge>
          }
          position="bottom center"
          contentStyle={{ width: '350px' }}
        >
          <Notifications
            count={notificationsCount}
            currentUser={currentUser}
            config={config}
          />
        </Popup>

        <Dropdown>
          <Dropdown.Toggle as={DropdownToggle} id="dropdown-custom-components">
            <NameCard user={currentUser} avatarSize={28} hideUserName={true} />
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item
              className="d-flex align-items-center justify-content-between"
              eventKey="1"
              href="/profile"
            >
              <div>
                <Icon icon="user" />
                {renderUserFullName(currentUser)}
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              className="d-flex align-items-center justify-content-between"
              eventKey="2"
              href="/settings"
            >
              <div>
                <Icon icon="settings" />
              {__('Settings')}
              </div>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              eventKey="3"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                }
                logout();
              }}
            >
              <Icon icon="logout-1" />
              {__('Logout')}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </>
    );
  };

  const renderNavigationMenu = () => {
    if (!hasHamburgerItems()) {
      return null;
    }

    return (
      <HamburgerMenuWrapper>
        <Dropdown>
          <Dropdown.Toggle as={DropdownToggle} id="dropdown-custom-components1">
            <Icon icon="subject" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <HeaderLinks
              backgroundColor={getConfigColor(config, 'headerColor')}
            >
              {config.publicTaskToggle
                ? renderMenu(
                    '/publicTasks',
                    config.taskPublicLabel || 'Public Task',
                  )
                : null}

              {config.ticketToggle && currentUser
                ? renderMenu('/tickets', config.ticketLabel || 'Ticket')
                : null}

              {config.dealToggle && currentUser
                ? renderMenu('/deals', config.dealLabel || 'Sales pipeline')
                : null}
              {config.purchaseToggle && currentUser
                ? renderMenu(
                    '/purchases',
                    config.purchaseLabel || 'Purchase pipeline',
                  )
                : null}
              {config.taskToggle && currentUser
                ? renderMenu('/tasks', config.taskLabel || 'Task')
                : null}
            </HeaderLinks>
          </Dropdown.Menu>
        </Dropdown>
      </HamburgerMenuWrapper>
    );
  };

  const renderTopHeader = () => {
    if (headerHtml)
      return <div dangerouslySetInnerHTML={{ __html: headerHtml }} />;

    return (
      <Container large={true}>
        <HeaderTop>
          <HeaderLogo>
            <Link href="/">
              <img
                src={
                  config.logo
                    ? readFile(config.logo)
                    : '/static/logos/erxes-logo-white.svg'
                }
              />
            </Link>
            <HeaderTitle color={getConfigColor(config, 'headingColor')}>
              {config.name}
            </HeaderTitle>
          </HeaderLogo>

          <HeaderRight>
            <SupportMenus
              color={getConfigColor(config, 'headingColor')}
              baseColor={getConfigColor(config, 'baseColor')}
            >
              {renderHeaderExternalLinks()}
              {currentUser && Object.keys(currentUser).length !== 0
                ? renderCurrentUser()
                : renderAuth()}

              {renderNavigationMenu()}
            </SupportMenus>
          </HeaderRight>
        </HeaderTop>
      </Container>
    );
  };

  return (
    <Head
      background={getConfigColor(config, 'headerColor')}
      color={getConfigColor(config, 'headingColor')}
      headingSpacing={headingSpacing}
    >
      {renderTopHeader()}
      {(config.description || headerBottomComponent) && (
        <BottomComponent>
          {config.description && <h3>{config.description}</h3>}
          {headerBottomComponent}
        </BottomComponent>
      )}
      <Modal
        content={() => (
          <LoginContainer
            setLogin={setLogin}
            setRegister={setRegister}
            setResetPassword={setResetPassword}
          />
        )}
        onClose={() => setLogin(false)}
        isOpen={showlogin}
      />
      <Modal
        content={() => (
          <RegisterContainer setLogin={setLogin} setRegister={setRegister} />
        )}
        onClose={() => setRegister(false)}
        isOpen={showregister}
      />
      <Modal
        content={() => (
          <ForgotPasswordContainer
            setLogin={setLogin}
            clientPortalId={config._id}
            setResetPassword={setResetPassword}
          />
        )}
        onClose={() => setResetPassword(false)}
        isOpen={showResetPassword}
      />
    </Head>
  );
}

export default withRouter(Header);
