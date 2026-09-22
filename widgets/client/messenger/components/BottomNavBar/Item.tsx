import * as React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { IconProps } from './Icons';
import useHover from '../../hooks/useHover';
import { getColor } from '../../utils/util';
import { __ } from '../../../utils';

type Props = {
  label?: string | React.ReactNode;
  icon: (props: IconProps) => React.ReactNode;
  outlineIcon: LucideIcon;
  isActive: boolean;
  handleClick: (route: string) => (event: React.MouseEvent) => void;
  route: string;
  badge?: number;
};

const Item: React.FC<Props> = ({
  label,
  icon,
  outlineIcon: OutlineIcon,
  isActive,
  handleClick,
  route,
  badge,
}) => {
  const [hoverRef, isHovered] = useHover();
  const accentColor = getColor() || '#673fbd';
  const showFilled = isActive || isHovered;

  return (
    <motion.li
      ref={hoverRef}
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={handleClick(route)}
      whileTap={{ scale: 0.9 }}
    >
      <div className="nav-content" style={{ position: 'relative' }}>
        {isActive && (
          <motion.span
            layoutId="nav-active-pill"
            className="nav-active-pill"
            style={{ backgroundColor: `${accentColor}1f` }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="nav-icon-wrap">
          {showFilled ? (
            icon({ filled: true, color: accentColor })
          ) : (
            <OutlineIcon size={22} color="#9D9EA1" strokeWidth={1.75} />
          )}
        </span>
        {badge && badge > 0 ? (
          <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
        ) : null}
        {label && (
          <span
            className="nav-label"
            style={isActive ? { color: accentColor } : undefined}
          >
            {typeof label === 'string' ? __(label) : label}
          </span>
        )}
      </div>
    </motion.li>
  );
};

export default Item;
