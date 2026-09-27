import * as React from 'react';
import * as classNames from 'classnames';

import { getColor } from '../../../utils/util';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: React.JSX.Element;
  full?: boolean;
  withDefaultStyle?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  icon,
  full,
  withDefaultStyle,
  type = 'button',
  className,
  style: styleProp,
  ...buttonProps
}) => {
  const color = getColor();

  // 주 버튼은 브랜드 색 단색 — 차분한 위젯 톤(그라데이션 제거)
  const style = color ? { background: color } : {};

  const buttonClassNames = classNames(
    'base-button',
    {
      'main-button': withDefaultStyle || children,
      'w-full': full,
    },
    className,
  );

  return (
    <button
      style={{ ...style, ...styleProp }}
      className={buttonClassNames}
      type={type}
      {...buttonProps}
    >
      {children}
      {icon}
    </button>
  );
};

export default Button;
