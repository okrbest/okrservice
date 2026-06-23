import { Config, IKbCategory, IKbParentCategory } from '../../types';
import { SidebarNav } from './styles';

import Link from 'next/link';
import React from 'react';

type Props = {
  parentCategories: IKbParentCategory[];
  category: IKbCategory;
  articleId?: string;
  config: Config;
};

const ERXES_TO_MATERIAL: Record<string, string> = {
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
};

function toMaterialIcon(erxesIcon: string): string {
  return ERXES_TO_MATERIAL[erxesIcon] || 'folder';
}

function SideBar({ parentCategories, category }: Props) {
  if (!parentCategories || parentCategories.length === 0) return null;

  const renderItem = (cat: any) => {
    const isActive = cat._id === category._id;
    return (
      <Link key={cat._id} href={`/knowledge-base/category?id=${cat._id}`}>
        <a className={`nav-item${isActive ? ' active' : ''}`}>
          <span className="material-icons">{toMaterialIcon(cat.icon)}</span>
          <span>{cat.title}</span>
        </a>
      </Link>
    );
  };

  return (
    <SidebarNav>
      <p className="nav-label">카테고리</p>
      <Link href="/knowledge-base?view=all">
        <a className="nav-item">
          <span className="material-icons">apps</span>
          <span>전체보기</span>
        </a>
      </Link>
      {parentCategories.map((cat) => (
        <React.Fragment key={cat._id}>
          {renderItem(cat)}
          {cat.childrens?.map((child) => renderItem(child))}
        </React.Fragment>
      ))}
    </SidebarNav>
  );
}

export default SideBar;
