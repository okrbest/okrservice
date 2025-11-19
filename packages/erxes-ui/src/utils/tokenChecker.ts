/**
 * 쿠키에서 토큰 가져오기
 * 주의: httpOnly 쿠키는 JavaScript에서 읽을 수 없으므로,
 * 실제로는 서버에서만 접근 가능합니다.
 * 따라서 이 함수는 쿠키가 JavaScript에서 접근 가능한 경우에만 작동합니다.
 */
const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  
  try {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith('auth-token=')
    );
    
    if (!tokenCookie) {
      // 쿠키가 없으면 null 반환 (만료로 간주하지 않음)
      return null;
    }
    
    const token = tokenCookie.split('=').slice(1).join('=').trim();
    return token || null;
  } catch (e) {
    console.error('Error reading token from cookie:', e);
    return null;
  }
};

/**
 * JWT 토큰 디코딩 (검증 없이 디코딩만)
 * JWT는 base64로 인코딩되어 있으므로 디코딩 가능
 */
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// 개발 모드에서 토큰 만료를 강제로 시뮬레이션하기 위한 플래그
let forceExpired = false;

/**
 * 토큰이 만료되었는지 체크
 * 주의: httpOnly 쿠키는 JavaScript에서 읽을 수 없으므로,
 * 실제 토큰 만료 체크는 서버에서 이루어집니다.
 * 이 함수는 개발 모드에서 테스트용으로만 사용됩니다.
 */
export const isTokenExpired = (): boolean => {
  // 개발 모드에서 강제 만료 플래그가 설정되어 있으면 true 반환
  if (forceExpired) {
    return true;
  }
  
  // httpOnly 쿠키는 JavaScript에서 읽을 수 없으므로,
  // 실제 토큰 만료 체크는 불가능합니다.
  // 서버에서 "Login required" 에러가 발생하면 Apollo Client의 errorLink에서 처리됩니다.
  return false;
};

/**
 * 개발 모드에서 토큰 만료를 강제로 시뮬레이션
 * 브라우저 콘솔에서 사용: window.testTokenExpiration(true)
 */
export const setForceExpired = (expired: boolean) => {
  forceExpired = expired;
  console.log(`Token expiration forced to: ${expired ? 'EXPIRED' : 'VALID'}`);
};

/**
 * 현재 토큰 정보 확인 (디버깅용)
 * 브라우저 콘솔에서 사용: window.checkTokenInfo()
 * 
 * 주의: httpOnly 쿠키는 JavaScript에서 읽을 수 없으므로,
 * 실제 토큰 정보는 확인할 수 없습니다.
 */
export const checkTokenInfo = () => {
  console.log('ℹ️ httpOnly 쿠키는 JavaScript에서 읽을 수 없습니다.');
  console.log('ℹ️ 실제 토큰 만료 체크는 서버에서 이루어집니다.');
  console.log('ℹ️ 테스트를 위해서는 window.testTokenExpiration(true)를 사용하세요.');
  console.log('ℹ️ 토큰 만료는 서버에서 "Login required" 에러로 감지됩니다.');
  
  return {
    message: 'httpOnly 쿠키는 JavaScript에서 읽을 수 없습니다.',
    testCommand: 'window.testTokenExpiration(true) - 토큰 만료 시뮬레이션',
    resetCommand: 'window.testTokenExpiration(false) - 정상 상태로 복구'
  };
};

/**
 * 실제 API를 호출해서 토큰이 유효한지 확인
 * 브라우저 콘솔에서 사용: window.testTokenValidity()
 */
export const testTokenValidity = async () => {
  try {
    // getEnv를 동적으로 import
    const { getEnv } = await import('./core');
    const { REACT_APP_API_URL } = getEnv();
    
    if (!REACT_APP_API_URL) {
      console.error('❌ API URL을 찾을 수 없습니다.');
      return { valid: false, reason: 'No API URL' };
    }
    
    // 간단한 GraphQL 쿼리로 토큰 유효성 확인
    const response = await fetch(`${REACT_APP_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query {
            currentUser {
              _id
              email
            }
          }
        `
      })
    });

    const result = await response.json();
    
    if (result.errors && result.errors.some((e: any) => e.message === 'Login required')) {
      console.log('❌ 토큰이 만료되었습니다. (Login required 에러)');
      return { valid: false, reason: 'Login required' };
    }
    
    if (result.data && result.data.currentUser) {
      console.log('✅ 토큰이 유효합니다.');
      console.log('사용자 정보:', result.data.currentUser);
      return { valid: true, user: result.data.currentUser };
    }
    
    console.log('⚠️ 토큰 상태를 확인할 수 없습니다.');
    return { valid: false, reason: 'Unknown' };
  } catch (e) {
    console.error('❌ 토큰 확인 중 에러:', e);
    return { valid: false, reason: 'Error', error: e };
  }
};

/**
 * 서버에서 토큰을 강제로 만료시킴 (로그아웃)
 * 브라우저 콘솔에서 사용: window.forceTokenExpiration()
 */
export const forceTokenExpiration = async () => {
  try {
    // getEnv를 동적으로 import
    const { getEnv } = await import('./core');
    const { REACT_APP_API_URL } = getEnv();
    
    if (!REACT_APP_API_URL) {
      console.error('❌ API URL을 찾을 수 없습니다.');
      return { success: false, reason: 'No API URL' };
    }
    
    console.log('🔄 서버에서 토큰을 만료시키는 중...');
    
    // 로그아웃 mutation 호출
    const response = await fetch(`${REACT_APP_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation {
            logout
          }
        `
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ 로그아웃 실패:', result.errors);
      return { success: false, errors: result.errors };
    }
    
    if (result.data && result.data.logout) {
      console.log('✅ 토큰이 성공적으로 만료되었습니다. (로그아웃 완료)');
      console.log('이제 로그인 화면으로 리다이렉트됩니다...');
      
      // 로그인 화면으로 리다이렉트
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
      return { success: true, message: 'Token expired' };
    }
    
    console.log('⚠️ 로그아웃 결과를 확인할 수 없습니다.');
    return { success: false, reason: 'Unknown' };
  } catch (e) {
    console.error('❌ 토큰 만료 중 에러:', e);
    return { success: false, reason: 'Error', error: e };
  }
};

// 개발 모드에서만 전역 객체에 함수 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).testTokenExpiration = setForceExpired;
  (window as any).checkTokenInfo = checkTokenInfo;
  (window as any).isTokenExpired = isTokenExpired;
  (window as any).testTokenValidity = testTokenValidity;
  (window as any).forceTokenExpiration = forceTokenExpiration;
}

/**
 * 실제 API를 호출해서 토큰 만료 여부 확인
 */
const checkTokenExpirationWithAPI = async (): Promise<boolean> => {
  try {
    const { getEnv } = await import('./core');
    const { REACT_APP_API_URL } = getEnv();
    
    if (!REACT_APP_API_URL) {
      return false;
    }
    
    const response = await fetch(`${REACT_APP_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query {
            currentUser {
              _id
            }
          }
        `
      })
    });

    const result = await response.json();
    
    // "Login required" 에러가 있으면 토큰이 만료된 것
    if (result.errors && result.errors.some((e: any) => e.message === 'Login required')) {
      return true; // 만료됨
    }
    
    return false; // 유효함
  } catch (e) {
    // 에러 발생 시 만료로 간주하지 않음
    return false;
  }
};

/**
 * 전역 클릭 이벤트 리스너 설정
 * 페이지 로드 시, 탭 활성화 시, 그리고 정확한 만료 시점에 토큰 만료 체크
 */
export const setupTokenExpirationChecker = () => {
  if (typeof window === 'undefined') return () => {};
  
  let timeoutId: NodeJS.Timeout | null = null;
  let isChecking = false; // 중복 체크 방지
  
  const checkAndRedirect = async () => {
    // 이미 체크 중이면 무시
    if (isChecking) {
      return;
    }
    
    // 로그인 관련 페이지에서는 체크하지 않음
    const pathname = window.location.pathname;
    if (
      pathname === '/' ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')
    ) {
      return;
    }
    
    // 클라이언트 강제 만료 플래그 체크
    if (isTokenExpired()) {
      window.location.href = '/';
      return;
    }
    
    // 실제 API로 토큰 상태 확인
    isChecking = true;
    try {
      const isExpired = await checkTokenExpirationWithAPI();
      if (isExpired) {
        console.log('토큰이 만료되었습니다. 로그인 화면으로 리다이렉트합니다.');
        window.location.href = '/';
      }
    } catch (e) {
      // 에러 발생 시 무시
    } finally {
      isChecking = false;
    }
  };
  
  // 정확한 만료 시점에 체크하도록 스케줄링
  const scheduleExpirationCheck = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // 로그인 관련 페이지에서는 스케줄링하지 않음
    const pathname = window.location.pathname;
    if (
      pathname === '/' ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')
    ) {
      return;
    }
    
    // JWT 토큰은 httpOnly 쿠키라서 읽을 수 없으므로
    // API를 호출해서 토큰 상태를 확인하고, 만료 시간을 추정
    try {
      const { getEnv } = await import('./core');
      const { REACT_APP_API_URL } = getEnv();
      
      if (!REACT_APP_API_URL) {
        return;
      }
      
      const response = await fetch(`${REACT_APP_API_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { currentUser { _id } }`
        })
      });

      const result = await response.json();
      
      // 토큰이 만료되었으면 즉시 리다이렉트
      if (result.errors && result.errors.some((e: any) => e.message === 'Login required')) {
        window.location.href = '/';
        return;
      }
      
      // 토큰이 유효하면, JWT 토큰은 1일(24시간) 만료이므로
      // 23시간 후에 다시 체크하도록 스케줄링 (만료 1시간 전)
      const checkInterval = 23 * 60 * 60 * 1000; // 23시간
      
      timeoutId = setTimeout(() => {
        scheduleExpirationCheck(); // 재귀적으로 다시 스케줄링
      }, checkInterval);
      
    } catch (e) {
      // 에러 발생 시 1시간 후에 다시 시도
      timeoutId = setTimeout(() => {
        scheduleExpirationCheck();
      }, 60 * 60 * 1000);
    }
  };
  
  // 클릭 이벤트 핸들러
  const handleClick = (e: MouseEvent) => {
    const pathname = window.location.pathname;
    if (
      pathname === '/' ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')
    ) {
      return;
    }
    
    // 클라이언트 강제 만료 플래그만 체크 (빠른 응답)
    if (isTokenExpired()) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = '/';
    }
  };
  
  // 초기 체크 및 스케줄링
  checkAndRedirect();
  scheduleExpirationCheck();
  
  // 탭이 다시 활성화될 때도 체크
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // 탭이 다시 활성화되었을 때 체크
      checkAndRedirect();
      scheduleExpirationCheck(); // 스케줄링도 다시 설정
    }
  };
  
  // 캡처 단계에서 이벤트 리스너 추가 (다른 핸들러보다 먼저 실행)
  document.addEventListener('click', handleClick, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

