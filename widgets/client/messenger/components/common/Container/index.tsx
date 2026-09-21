import * as React from 'react';
import { postMessage } from '../../../../utils';
import BottomNavBar from '../../BottomNavBar';
import {
  IconChevronLeft,
  IconZoomIn,
  IconZoomOut,
} from '../../../../icons/Icons';
import { getColor } from '../../../utils/util';
import { useRouter } from '../../../context/Router';

type Props = {
  withTopBar?: boolean;
  title?: string | React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  withBottomNavBar?: boolean;
  containerStyle?: React.CSSProperties;
  backRoute?: string;
  persistentFooter?: React.ReactNode;
  onBackButton?: () => void;
  showBackButton?: boolean;
  showZoomButton?: boolean;
};

const Container: React.FC<Props> = ({
  children,
  title,
  extra,
  withTopBar = false,
  withBottomNavBar = true,
  containerStyle,
  backRoute,
  persistentFooter,
  onBackButton,
  showBackButton = true,
  showZoomButton = true,
}) => {
  const color = getColor();
  const { setActiveRoute, isZoomed, setIsZoomed } = useRouter();
  const [isZoomHovered, setIsZoomHovered] = React.useState(false);

  const style = color
    ? {
        background: `linear-gradient(
      119deg,
      ${color} 2.96%,
      ${color} 51.52%,
      #caf4f7 100.08%
    )`,
      }
    : {};

  const handleBackClick = () => {
    if (onBackButton) {
      onBackButton();
      return;
    }
    if (backRoute) {
      setActiveRoute(backRoute);
      return;
    }
    setActiveRoute('home');
  };

  const handleZoomToggle = () => {
    const newZoomState = !isZoomed;
    setIsZoomed(newZoomState);
    postMessage('fromMessenger', 'ERXES_MESSENGER_ZOOM', {
      zoom: newZoomState,
    });
  };

  const shouldShowTopBar = withTopBar || title || showZoomButton;

  return (
    <div
      className="container"
      style={{ paddingTop: 2, boxSizing: 'border-box' }}
    >
      {shouldShowTopBar && (
        <div className="top-nav-container" style={{ ...style, paddingTop: 8 }}>
          <div className="top-nav" style={containerStyle}>
            {showBackButton && (
              <div className="icon" onClick={handleBackClick}>
                <IconChevronLeft />
              </div>
            )}
            {typeof title === 'string' ? (
              <div className="title">{title}</div>
            ) : (
              title
            )}
            {showZoomButton && (
              // 헤더에 아이콘 전용 버튼(새 채팅/채팅 이력 등)이 늘면서 크기·hover
              // 피드백을 맞춤 — 인라인 스타일로 지정해 .icon 전역 클래스(뒤로가기
              // 버튼 등)에는 영향 없음
              <div
                className="icon"
                onClick={handleZoomToggle}
                onMouseEnter={() => setIsZoomHovered(true)}
                onMouseLeave={() => setIsZoomHovered(false)}
                style={{
                  marginLeft: 'auto',
                  width: '32px',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: isZoomHovered
                    ? 'rgba(255,255,255,0.28)'
                    : 'transparent',
                  transition: 'background 0.12s ease',
                }}
              >
                {isZoomed ? <IconZoomOut /> : <IconZoomIn />}
              </div>
            )}
          </div>
          {extra && <div className="extra-content">{extra}</div>}
        </div>
      )}
      <div className="container-content">{children}</div>
      {persistentFooter && (
        <div className="persistent-footer">{persistentFooter}</div>
      )}
      {withBottomNavBar && <BottomNavBar />}
    </div>
  );
};

export default Container;
