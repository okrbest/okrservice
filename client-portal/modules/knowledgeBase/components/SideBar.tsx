import { IKbParentCategory } from '../../types';
import { SidebarNav } from './styles';
import { flattenCategories, stripCategoryNumber } from '../utils/faqDisplay';

import Link from 'next/link';
import React from 'react';

type Props = {
  parentCategories: IKbParentCategory[];
  activeCategoryId?: string;
  // "전체"를 선택 상태로 보여 줄지(전체 질문 화면)
  allActive?: boolean;
  // 분류별 질문 수(상위 분류는 하위 포함)와 전체 수 — useFaqArticles 기준
  counts: Record<string, number>;
  total: number;
};

export const ERXES_TO_MATERIAL: Record<string, string> = {
  alarm: 'alarm',
  briefcase: 'work',
  earthgrid: 'public',
  compass: 'explore',
  idea: 'lightbulb',
  diamond: 'diamond',
  piggybank: 'savings',
  piechart: 'pie_chart',
  scale: 'balance',
  megaphone: 'campaign',
  tools: 'build',
  umbrella: 'umbrella',
  'bar-chart': 'bar_chart',
  star: 'star',
  'head-1': 'person',
  settings: 'settings',
  users: 'group',
  paintpalette: 'palette',
  flag: 'flag',
  'phone-call': 'call',
  laptop: 'laptop',
  home: 'home',
  puzzle: 'extension',
  medal: 'military_tech',
  like: 'thumb_up',
  book: 'menu_book',
  clipboard: 'assignment',
  computer: 'computer',
  paste: 'content_paste',
  'folder-1': 'folder',
  sunset: 'wb_sunny',
  'heart-alt': 'favorite',
  'music-1': 'music_note',
  pencil: 'edit',
  database: 'storage',
  videocamera: 'videocam',
  'clipboard-1': 'note',
  camera: 'photo_camera',
  'shuffle-1': 'shuffle',
  hourglass: 'hourglass_empty',
  'envelope-alt': 'email',
  'graph-bar': 'bar_chart',
  'comment-alt-message': 'chat_bubble',
  chat: 'chat',
  smile: 'sentiment_satisfied',
  wallclock: 'schedule',
  trees: 'park',
  gift: 'card_giftcard',
  'moon-1': 'nights_stay',
  apps: 'apps',
  'corporate-fare': 'corporate_fare',
  payments: 'payments',
  badge: 'badge',
  'history-edu': 'history_edu',
  'help-outline': 'help_outline',
};

function toMaterialIcon(erxesIcon: string): string {
  return ERXES_TO_MATERIAL[erxesIcon] || 'folder';
}

function NavItem({ href, icon, label, count, active, child = false }) {
  return (
    <Link href={href}>
      <a
        className={`nav-item${active ? ' active' : ''}${child ? ' nav-item-child' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="material-icons" aria-hidden="true">
          {icon}
        </span>
        <span className="nav-item-label" title={label}>
          {label}
        </span>
        <span className="nav-item-count">{count}</span>
      </a>
    </Link>
  );
}

function SideBar({
  parentCategories,
  activeCategoryId,
  allActive,
  counts,
  total,
}: Props) {
  if (!parentCategories || parentCategories.length === 0) return null;

  return (
    <SidebarNav aria-label="분류">
      <p className="nav-label">분류</p>
      <NavItem
        href="/knowledge-base?view=all"
        icon="apps"
        label="전체"
        count={total}
        active={allActive}
      />
      {flattenCategories(parentCategories).map(({ category, isChild }) => (
        <NavItem
          key={category._id}
          href={`/knowledge-base/category?id=${category._id}`}
          icon={toMaterialIcon(category.icon)}
          label={stripCategoryNumber(category.title)}
          count={counts[category._id] || 0}
          active={category._id === activeCategoryId}
          child={isChild}
        />
      ))}
    </SidebarNav>
  );
}

export default SideBar;
