import * as React from 'react';

// 위쪽 막대 아이콘에 마우스를 올리거나 키보드로 가면 바로 이름을 보여 준다.
// 브라우저 기본 풍선(title)은 1초쯤 뒤에야 뜨고, 꺼진 버튼에는 아예 안 떠서 쓰지 않는다.
// 왼쪽 끝 아이콘이 위젯 밖으로 잘리지 않게 이름은 아이콘 왼쪽 끝에 맞춰 아래에 띄운다.
const TIP_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 20,
  padding: '4px 8px',
  borderRadius: 6,
  background: '#1f2033',
  color: '#fff',
  fontSize: 11.5,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  boxShadow: '0 4px 12px rgba(26, 27, 37, 0.18)',
};

const ChatbotHeaderTip: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span role="tooltip" style={TIP_STYLE}>
          {label}
        </span>
      )}
    </span>
  );
};

export default ChatbotHeaderTip;
