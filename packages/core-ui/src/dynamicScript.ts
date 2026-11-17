// 플러그인 진입 파일(remoteEntry.js)을 페이지에 한 번만 붙인다.
//
// 플러그인 화면 조각이 다시 만들어질 때마다 진입 파일을 또 붙이면 플러그인이 다시 실행돼 window[scope]가
// 새 묶음으로 바뀐다. 그 뒤에 불러온 조각(티켓 상세의 활동 기록 등)은 메인과 연결이 어긋난 묶음에서 와서
// "Invalid hook call"이 나고, 그 여파로 티켓 상세 창이 두 개 겹쳐 남았다(링크로 티켓을 바로 열 때 가끔).

const loading = new Map<string, Promise<void>>();

/** 플러그인 진입 파일이 실행돼 window[scope]가 준비될 때까지 기다린다(이미 있으면 바로) */
export const ensurePluginScript = (
  scope: string,
  url: string,
): Promise<void> => {
  if ((window as any)[scope]) {
    return Promise.resolve();
  }

  const pending = loading.get(scope);

  if (pending) {
    return pending;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const element = document.createElement('script');

    element.src = url;
    element.id = `dynamic-script-${scope}`;
    element.type = 'text/javascript';
    element.async = true;

    element.addEventListener('load', () => resolve());
    element.addEventListener('error', () => {
      // 실패한 태그는 치우고, 다음 요청 때 다시 시도할 수 있게 한다
      loading.delete(scope);
      element.remove();
      reject(new Error(`Dynamic Script Error: ${url}`));
    });

    document.head.appendChild(element);
  });

  loading.set(scope, promise);

  return promise;
};

/** 테스트 전용 */
export const __resetDynamicScriptsForTest = () => loading.clear();
