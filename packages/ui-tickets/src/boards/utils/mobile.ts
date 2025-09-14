import React from 'react';

// 모바일 디바이스 감지 유틸리티

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.innerWidth <= 768;
};

export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.innerWidth > 768 && window.innerWidth <= 1024;
};

export const isDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }
  
  return window.innerWidth > 1024;
};

// 화면 크기 변경 감지
export const useResponsive = () => {
  const [isMobile, setIsMobile] = React.useState(isMobileDevice());
  const [isTablet, setIsTablet] = React.useState(isTabletDevice());
  const [isDesktop, setIsDesktop] = React.useState(isDesktopDevice());

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
      setIsTablet(isTabletDevice());
      setIsDesktop(isDesktopDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// CSS 미디어 쿼리 기반 감지
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

// 모바일 전용 훅
export const useIsMobile = (): boolean => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // 디버깅을 위한 로그
  if (typeof window !== 'undefined') {
    console.log('useIsMobile - window.innerWidth:', window.innerWidth);
    console.log('useIsMobile - isMobile:', isMobile);
  }
  
  return isMobile;
};

// 태블릿 전용 훅
export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
};

// 데스크톱 전용 훅
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1025px)');
};
