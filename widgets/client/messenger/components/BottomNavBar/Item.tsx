import * as React from "react";
import { m } from "framer-motion";
import { IconProps } from "./Icons";
import useHover from "../../hooks/useHover";
import { __ } from "../../../utils";

type Props = {
  label?: string;
  icon: (props: IconProps) => React.ReactNode;
  isActive: boolean;
  handleClick: (route: string) => (event: React.MouseEvent) => void;
  route: string;
  badge?: number;
};

const Item: React.FC<Props> = ({ label, icon, isActive, handleClick, route, badge }) => {
  const [hoverRef, isHovered] = useHover();

  return (
    <m.li
      ref={hoverRef}
      className={`nav-item ${isActive ? "active" : ""}`}
      onClick={handleClick(route)}
    >
      <m.div className="nav-content" style={{ position: "relative" }}>
        {icon({ filled: isActive || isHovered })}
        {badge && badge > 0 ? (
          <span style={{
            position: "absolute",
            top: "-4px",
            right: "-6px",
            backgroundColor: "#ff4d4f",
            color: "#fff",
            fontSize: "10px",
            fontWeight: "700",
            borderRadius: "10px",
            minWidth: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            lineHeight: 1,
          }}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
        {label && <span className="nav-label">{__(label)}</span>}
      </m.div>
    </m.li>
  );
};

export default Item;
