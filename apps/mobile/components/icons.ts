/**
 * Every icon the app uses, imported one file at a time.
 *
 * `import { MapPin } from 'lucide-react-native'` pulls the package barrel, and
 * Metro has no tree-shaking to undo that: it walked all ~1500 icon modules and
 * added 2 MB to the Hermes bundle for the dozen glyphs actually on screen.
 * The per-icon subpath costs only what it names.
 *
 * Adding an icon means adding a line here, which is the point: the cost of a
 * new glyph stays visible instead of being hidden behind a barrel.
 *
 * Names here are the PascalCase React ones; the files are kebab-case, and the
 * two do not always match (CheckCircle2 is `circle-check-big`), so check
 * dist/esm/icons before assuming.
 */
export { default as BadgeCheck } from 'lucide-react-native/icons/badge-check'
export { default as Bell } from 'lucide-react-native/icons/bell'
export { default as BookOpen } from 'lucide-react-native/icons/book-open'
export { default as CalendarDays } from 'lucide-react-native/icons/calendar-days'
export { default as CalendarX } from 'lucide-react-native/icons/calendar-x'
export { default as CheckCircle2 } from 'lucide-react-native/icons/circle-check-big'
export { default as ChevronRight } from 'lucide-react-native/icons/chevron-right'
export { default as Compass } from 'lucide-react-native/icons/compass'
export { default as Flame } from 'lucide-react-native/icons/flame'
export { default as LayoutGrid } from 'lucide-react-native/icons/layout-grid'
export { default as MapPin } from 'lucide-react-native/icons/map-pin'
export { default as MessageCircle } from 'lucide-react-native/icons/message-circle'
export { default as Target } from 'lucide-react-native/icons/target'
export { default as TrendingUp } from 'lucide-react-native/icons/trending-up'
export { default as Trophy } from 'lucide-react-native/icons/trophy'
export { default as User } from 'lucide-react-native/icons/user'
export { default as UserPlus } from 'lucide-react-native/icons/user-plus'
export { default as Users } from 'lucide-react-native/icons/users'
export { default as XCircle } from 'lucide-react-native/icons/circle-x'

export type { LucideIcon } from 'lucide-react-native'
