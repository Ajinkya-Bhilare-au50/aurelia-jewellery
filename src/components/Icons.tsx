// Single source of icons for the app: Lucide (https://lucide.dev, ISC licence), wrapped with
// the design system's defaults (20px, thin 1.4 stroke, decorative/aria-hidden).
// Import icons ONLY from this file so size/stroke stay consistent and swapping libraries stays easy.
// Need a new icon? Find it on lucide.dev, add one line below.
import {
  ArrowRight as LArrowRight,
  Award,
  Camera,
  Check,
  ChevronDown as LChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Download,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Gem,
  Gift,
  Heart,
  Hourglass,
  House,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  KeyRound,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Sun,
  Package,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Store,
  TicketPercent,
  Trash2,
  TriangleAlert,
  Truck,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

export type IconProps = LucideProps;

function icon(Base: LucideIcon, defaults: LucideProps = {}) {
  const Icon = (p: LucideProps) => <Base size={20} strokeWidth={1.4} aria-hidden {...defaults} {...p} />;
  Icon.displayName = `Icon(${Base.displayName ?? "lucide"})`;
  return Icon;
}

// ---- Store chrome ----
export const BagIcon = icon(ShoppingBag);
export const UserIcon = icon(User);
export const SearchIcon = icon(Search);
export const MenuIcon = icon(Menu);
export const CloseIcon = icon(X);
export const PlusIcon = icon(Plus);
export const MinusIcon = icon(Minus);
export const ArrowRight = icon(LArrowRight);
export const ChevronDown = icon(LChevronDown);
export const ChevronLeftIcon = icon(ChevronLeft);
export const ChevronRightIcon = icon(ChevronRight);
export const UploadIcon = icon(ImageUp);
export const DownloadIcon = icon(Download);
export const CheckIcon = icon(Check);
export const FilterIcon = icon(SlidersHorizontal);
export const CopyIcon = icon(Copy);
export const HeartIcon = ({ filled, ...p }: LucideProps & { filled?: boolean }) => <Heart size={20} strokeWidth={1.4} aria-hidden fill={filled ? "currentColor" : "none"} {...p} />;
export const StarIcon = icon(Star, { fill: "currentColor", strokeWidth: 0 });

// ---- Trust / product ----
export const ShieldIcon = icon(ShieldCheck);
export const ReturnIcon = icon(RotateCcw);
export const DiamondIcon = icon(Gem);
export const GiftIcon = icon(Gift);
export const AwardIcon = icon(Award);
export const CardIcon = icon(CreditCard);
export const LockIcon = icon(Lock);

// ---- Orders & delivery ----
export const TruckIcon = icon(Truck);
export const PinIcon = icon(MapPin);
export const PackageIcon = icon(Package);
export const PackageCheckIcon = icon(PackageCheck);
export const HourglassIcon = icon(Hourglass);
export const HomeIcon = icon(House);
export const CancelledIcon = icon(CircleX);
export const SuccessIcon = icon(CircleCheck);
export const WarningIcon = icon(TriangleAlert);
export const InfoIcon = icon(Info);

// ---- Account & contact ----
export const PhoneIcon = icon(Phone);
export const MobileIcon = icon(Smartphone);
export const MailIcon = icon(Mail);
export const KeyIcon = icon(KeyRound);
export const ClockIcon = icon(Clock);
export const ChatIcon = icon(MessageCircle);
export const DocumentIcon = icon(FileText);
export const LogoutIcon = icon(LogOut);
export const CameraIcon = icon(Camera);
export const TrashIcon = icon(Trash2);
export const ZoomInIcon = icon(ZoomIn);
export const ZoomOutIcon = icon(ZoomOut);
export const RefreshIcon = icon(RefreshCw);
export const SunIcon = icon(Sun);
export const MoonIcon = icon(Moon);

// ---- Admin ----
export const DashboardIcon = icon(LayoutDashboard);
export const StoreIcon = icon(Store);
export const CouponIcon = icon(TicketPercent);
export const SaleIcon = icon(Sparkles);
export const UsersIcon = icon(Users);
