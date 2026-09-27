import {
  CalendarDays,
  Clock,
  FileCheck2,
  FileText,
  GraduationCap,
  IdCard,
  KeyRound,
  LucideIcon,
  Megaphone,
  MessageSquareWarning,
  Receipt,
  Timer,
  UserRound,
  Users,
} from 'lucide-react';
import { ChatbotMenu } from './chatbotMenus';

// HR 메뉴 아이콘 — 답변 아래 패널과 입력 중 추천 팝업이 같은 아이콘을 쓴다.
// 메뉴별 아이콘이 없으면 카테고리 기본 아이콘.

const CATEGORY_ICONS: Record<ChatbotMenu['category'], LucideIcon> = {
  attendance: Clock,
  leave: CalendarDays,
  approval: FileCheck2,
  hr: UserRound,
  inquiry: FileText,
  settings: KeyRound,
};

const MENU_ICONS: Record<string, LucideIcon> = {
  salary: Receipt,
  notice: Megaphone,
  orgmembers: Users,
  otlist: Timer,
  otschedule: Timer,
  education: GraduationCap,
  tuition: GraduationCap,
  empcard: IdCard,
  grievance: MessageSquareWarning,
};

export const getMenuIcon = (menu: ChatbotMenu): LucideIcon =>
  MENU_ICONS[menu.id] || CATEGORY_ICONS[menu.category];
