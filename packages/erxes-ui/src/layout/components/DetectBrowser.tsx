import { AlertItem } from '@erxes/ui/src/utils/Alert/Alert';
import { CSSTransition } from 'react-transition-group';
import Icon from '@erxes/ui/src/components/Icon';
import React from 'react';
import { __ } from 'coreui/utils';
import { dimensions } from '@erxes/ui/src/styles';
import styled from 'styled-components';

const OldBrowserWarning = styled(AlertItem)`
  position: fixed;
  left: ${dimensions.headerSpacing}%;
  margin-left: -250px;
  width: 500px;
  transition: all 0.1s;

  > div {
    margin-top: ${dimensions.unitSpacing - 5}px;
    font-size: 12px;
  }

  .icon-cancel {
    float: right;
    cursor: pointer;
  }
`;

type State = {
  isVisible: boolean;
};

class DetectBrowser extends React.PureComponent<{}, State> {
  constructor(props: {}) {
    super(props);

    this.state = { isVisible: true };
  }

  closeAlert = () => {
    this.setState({ isVisible: false });
  };

  renderWarning(name: string, minVersion: number) {
    const { userAgent } = navigator;

    const splittedVersion = userAgent.split(name)[1];

    // UA에 해당 토큰이 없으면 버전을 알 수 없으므로 경고를 건너뛴다.
    // (없는 값을 split하면 TypeError가 나서 화면 전체가 크래시한다)
    if (!splittedVersion) {
      return null;
    }

    const browserVersion = splittedVersion.split('.')[0];

    if (Number(browserVersion) < minVersion) {
      return (
        <CSSTransition
          in={this.state.isVisible}
          appear={true}
          timeout={300}
          classNames="slide-in-small"
          unmountOnExit={true}
        >
          <OldBrowserWarning type="error">
            <b>
              {__('Please upgrade your browser to use erxes!')}
              <Icon icon="cancel" size={10} onClick={this.closeAlert} />
            </b>
            <div>
              {__(
                'Unfortunately, You are running on a browser that may not be fully compatible with erxes',
              )}{' '}
              {__(`Please use recommended version`)} - {name.replace('/', '')}{' '}
              {minVersion}+.
            </div>
          </OldBrowserWarning>
        </CSSTransition>
      );
    }

    return null;
  }

  render() {
    const { userAgent } = navigator;

    // iOS의 Chrome/Firefox는 모두 WebKit 엔진을 쓰고 "Version/" 토큰이 없어
    // 아래 Chrome/Safari 분기로 흘러가면 구형 Safari로 오판된다.
    // 각자의 고유 토큰(CriOS/FxiOS)으로 먼저 걸러낸다.
    if (userAgent.indexOf('CriOS') !== -1) {
      return this.renderWarning('CriOS/', 58);
    }

    if (userAgent.indexOf('FxiOS') !== -1) {
      return this.renderWarning('FxiOS/', 59);
    }

    if (userAgent.indexOf('Chrome') !== -1) {
      return this.renderWarning('Chrome/', 58);
    }

    if (
      userAgent.indexOf('Safari') !== -1 &&
      userAgent.indexOf('Chrome') === -1
    ) {
      return this.renderWarning('Version/', 11);
    }

    if (userAgent.indexOf('Firefox') !== -1) {
      return this.renderWarning('Firefox/', 59);
    }

    if (userAgent.indexOf('Opera') !== -1 || userAgent.indexOf('OPR') !== -1) {
      return this.renderWarning('Opera/', 45);
    }

    if (userAgent.indexOf('Edge') !== -1) {
      return this.renderWarning('Edge/', 16);
    }

    return null;
  }
}

export default DetectBrowser;
