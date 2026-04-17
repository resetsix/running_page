import React, {
  lazy,
  useState,
  Suspense,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import VirtualList from 'rc-virtual-list';
import { useNavigate } from 'react-router-dom';
import styles from './style.module.css';
import { useLanguage } from '@/hooks/useLanguage';
import useLabels from '@/hooks/useLabels';
import rawActivities from '@/static/activities.json';
import { getLocalizedSvgPath } from '@/utils/language';
import { totalStat, yearSummaryStats } from '@assets/index';
import { loadSvgComponent, SvgComponent } from '@/utils/svgUtils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';
import {
  DIST_UNIT,
  M_TO_DIST,
  normalizeActivitySportType,
} from '@/utils/utils';
import RoutePreview from '@/components/RoutePreview';
import { Activity } from '@/utils/utils';
import { filterVisibleActivities } from '@/utils/activityVisibility';

const visibleActivities = filterVisibleActivities(rawActivities as Activity[]);
// Layout constants (avoid magic numbers)
const ITEM_WIDTH = 280;
const ITEM_GAP = 20;

const VIRTUAL_LIST_STYLES = {
  horizontalScrollBar: {},
  horizontalScrollBarThumb: {
    background:
      'var(--color-primary, var(--color-scrollbar-thumb, rgba(0,0,0,0.4)))',
  },
  verticalScrollBar: {},
  verticalScrollBarThumb: {
    background:
      'var(--color-primary, var(--color-scrollbar-thumb, rgba(0,0,0,0.4)))',
  },
};
const MonthOfLifeSvg = (sportType: string, language: 'zh-CN' | 'en') => {
  const path = sportType === 'all' ? './mol.svg' : `./mol_${sportType}.svg`;
  return lazy(() =>
    loadSvgComponent(totalStat, getLocalizedSvgPath(path, language))
  );
};

// Cache for year summary lazy components to prevent flickering
const yearSummaryCache: Record<string, React.LazyExoticComponent<SvgComponent>> =
  {};
const getYearSummarySvg = (year: string, language: 'zh-CN' | 'en') => {
  const cacheKey = `${year}-${language}`;
  if (!yearSummaryCache[cacheKey]) {
    yearSummaryCache[cacheKey] = lazy(() =>
      loadSvgComponent(
        yearSummaryStats,
        getLocalizedSvgPath(`./year_summary_${year}.svg`, language)
      )
    );
  }
  return yearSummaryCache[cacheKey];
};

interface ActivitySummary {
  totalDistance: number;
  totalTime: number;
  totalElevationGain: number;
  count: number;
  dailyDistances: number[];
  maxDistance: number;
  maxSpeed: number;
  location: string;
  totalHeartRate: number; // Add heart rate statistics
  heartRateCount: number;
  activities: Activity[]; // Add activities array for day interval
}

interface DisplaySummary {
  totalDistance: number;
  averageSpeed: number;
  totalTime: number;
  count: number;
  maxDistance: number;
  maxSpeed: number;
  location: string;
  totalElevationGain?: number;
  averageHeartRate?: number; // Add heart rate display
}

interface ChartData {
  day: number;
  distance: string;
}

interface ActivityCardProps {
  period: string;
  summary: DisplaySummary;
  dailyDistances: number[];
  interval: string;
  activities?: Activity[]; // Add activities for day interval
}

interface ActivityGroups {
  [key: string]: ActivitySummary;
}

type IntervalType = 'year' | 'month' | 'week' | 'day' | 'life';
type SportTypeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};
type IntervalOption = {
  value: IntervalType;
  label: string;
};

// A row group contains multiple activity card data items that will be rendered in one virtualized row
type RowGroup = Array<{ period: string; summary: ActivitySummary }>;

const ChevronDownIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 7.5L10 12.5L15 7.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SportTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'running':
      return (
        <svg aria-hidden="true" viewBox="0 0 64 64" fill="none">
          <path
            fill="#a8d600"
            d="M7.6 13.2s1.7-2.2 9.2 1.2c5.9 2.7-10.4 10.4-12 7.2c-1-1.9 2.8-8.4 2.8-8.4"
          />
          <path
            fill="#5b636b"
            d="M52 38.1c-9.2-6.4-18.8-25.4-20-25.4c-3.4 0-5.6 1.3-5.6 1.3l21.9 31.8c0 .1 4.9-6.9 3.7-7.7"
          />
          <path fill="#333" d="M56.5 41.1c-1.4-1.2-5.4-2-6.5-3.1c-4.2-4.6-13-12.7-20.5-26.4c-2.7-5.1-15.2 3.8-15.2 3.8l21.8 34.7c.2 0 25.6-4.7 20.4-9" />
          <path
            fill="#5b636b"
            d="M36.9 47.9c1.3-1.1 1.2-7.1.1-8.6c-6.8-9.8-18-24.6-22.4-24.6c-4.6 0-5.4 6.2-8 6.2c-2.2 0 .9-7.8.9-7.8c-4.2 4.7-4.9 19.7-4.9 19.7s17.8 29.3 34.3 15.1"
          />
          <path
            fill="#69727a"
            d="M22.2 49.6c4.6-10.7 24.4.1 34.3-8.5c1.6.2 4.8 5.7 4.8 5.7s-3.6 14.4-39.1 2.8"
          />
          <path
            fill="#d0d0d0"
            d="M2.7 31c-1 0-.8 6.9 0 8c5.3 6.6 10.8 8.3 18.1 17.1C29.6 66.6 62 61.6 62 52.6c0-7.4-.9-6.7-.9-6.7c-2.3 6-22.8 7.3-30.3 5.7C14.3 48.2 3.8 31 2.7 31"
          />
          <g fill="#333">
            <ellipse cx="14.8" cy="18.2" rx="1.4" ry="1.7" />
            <ellipse cx="18.8" cy="22.8" rx="1.4" ry="1.7" />
            <ellipse cx="22.4" cy="27.2" rx="1.4" ry="1.7" />
            <ellipse cx="26.1" cy="32.7" rx="1.4" ry="1.7" />
            <ellipse cx="29.6" cy="36.9" rx="1.4" ry="1.7" />
            <ellipse cx="33.3" cy="41.8" rx="1.4" ry="1.7" />
          </g>
          <path fill="#a8d600" d="M33.3 43c-.2 0-.5-.1-.7-.3c-.4-.5-.4-1.2 0-1.7c.2-.3 5.6-6.6 15.8-6.6c.5 0 1 .5 1 1.2c0 .6-.4 1.2-1 1.2c-9.4 0-14.4 5.9-14.5 5.9q-.15.3-.6.3m-3.6-4.9q-.3 0-.6-.3c-.4-.4-.5-1.1-.2-1.6c.2-.3 4.4-6.6 16.2-6.6c.5 0 1 .5 1 1.2c0 .6-.4 1.2-1 1.2c-10.7 0-14.6 5.7-14.7 5.7c-.1.2-.4.4-.7.4m-3.5-4.2c-.2 0-.5-.1-.7-.3c-.4-.4-.4-1.2-.1-1.7c4.8-6.4 16.1-6.5 16.6-6.5s1 .5 1 1.2c0 .6-.4 1.2-1 1.2c-.1 0-10.9.1-15.2 5.7c-.1.3-.4.4-.6.4m-3.7-5.6c-.3 0-.6-.2-.8-.5c-.3-.5-.2-1.3.2-1.6c.2-.2 6-5.3 16.8-5.3c.5 0 1 .5 1 1.2s-.4 1.2-1 1.2c-10.1 0-15.6 4.8-15.6 4.9c-.2.1-.4.1-.6.1M18.9 24c-.3 0-.6-.2-.8-.4c-.3-.5-.3-1.2.2-1.7c.2-.2 5.7-5.4 17.5-5.4c.5 0 1 .5 1 1.2c0 .6-.4 1.2-1 1.2c-11.1 0-16.2 4.9-16.3 4.9c-.2.1-.4.2-.6.2" />
        </svg>
      );
    case 'walking':
      return (
        <svg aria-hidden="true" viewBox="0 0 64 64" fill="none">
          <path
            fill="#fbbf67"
            d="M17.265 26.688c-2.265 1.689-3.41 3.975-2.568 5.104s3.363.678 5.623-1.015l8.409-6.283c2.262-1.689 3.409-3.973 2.567-5.107c-.844-1.13-3.367-.678-5.629 1.01z"
          />
          <path
            fill="#249561"
            d="M25 27.28c0-.509-.441-5.281-.261-6.756l1.518-.756c2.527-1.257 5.089-1.249 5.716.012c1.09 2.157-6.973 7.5-6.973 7.5"
          />
          <path fill="#28b473" d="M36.781 35.12c0 3.336-2.282 6.04-5.099 6.04c-2.813 0-5.098-2.704-5.098-6.04v-12.4c0-3.336 2.285-6.04 5.098-6.04c2.816 0 5.099 2.704 5.099 6.04z" />
          <path
            fill="#249561"
            d="M35.594 38.954a6.7 6.7 0 0 0 1.188-3.834v-12.4c0-1.804-.683-3.406-1.738-4.512c-4.683 3.854-3.709 15.362.55 20.746"
          />
          <path fill="#193e6b" d="M25.372 57.824c-1.75 3.533-4.443 5.765-6.01 4.988c-1.565-.78-1.414-4.273.337-7.805l6.522-13.144c1.752-3.529 4.446-5.769 6.01-4.987c1.565.775 1.417 4.271-.335 7.803z" />
          <path
            fill="#d1d2d2"
            d="M14.051 58.811c-.365.735 1.254 2.284 3.627 3.461c2.368 1.174 4.581 1.531 4.946.793c.368-.739-.648-3.51-3.02-4.686c-2.371-1.175-5.189-.309-5.556.432"
          />
          <path fill="#1c447d" d="M45.973 53.38c2.233 2.995 2.836 6.327 1.336 7.439c-1.496 1.123-4.521-.397-6.752-3.395l-8.313-11.135c-2.238-2.99-2.835-6.327-1.34-7.444c1.499-1.112 4.522.406 6.758 3.397z" />
          <path
            fill="#d1d2d2"
            d="M41.509 63.62c.495.658 2.607-.09 4.731-1.672c2.115-1.582 3.433-3.396 2.941-4.055s-3.424-1.01-5.541.573c-2.12 1.584-2.62 4.493-2.131 5.154"
          />
          <path fill="#1c447d" d="M26.142 42.11h11.233c.092 0-.503-6.299-.503-7.153c0-.058-4.796-.106-7.109-.106c-1.471 0-3.214-.005-3.216 0c0 0-.5 7.259-.405 7.259" />
          <path
            fill="#193e6b"
            d="M27.03 34.85h-.482s-.5 7.26-.405 7.26h4.065c-1.77-1.994-2.6-4.557-3.178-7.26"
          />
          <path
            fill="#249561"
            d="M28.625 18.767c1.132-.14 4.782-.583 5.501-.67c.045-.004-.628-3.082-.679-3.5c-.004-.033-5.061.555-5.061.555s.195 3.619.239 3.615"
          />
          <path
            fill="#fbbf67"
            d="M46.03 28.759c1.859 2.121 2.506 4.595 1.445 5.527c-1.061.925-3.427-.037-5.287-2.161l-6.924-7.894c-1.857-2.122-2.504-4.598-1.445-5.53c1.062-.929 3.435.041 5.297 2.161z"
          />
          <path
            fill="#28b473"
            d="M38.441 27.855c.19-.469 1.396-4.281 1.787-5.719l-1.112-1.274c-1.862-2.12-4.235-3.09-5.298-2.161c-1.06.933-.411 3.408 1.445 5.53z"
          />
          <path
            fill="#fbbf67"
            d="M31.409 3.528c-3.03-1.114-4.562-1.902-6.288 1.093c-1.346 2.338-2.597 5.156-2.35 7.95c.261 2.975 4.249 4.149 6.697 4.162c2.851.012 5.958-1.352 6.474-4.45c.613-3.709-.434-7.247-4.533-8.755"
          />
          <path fill="#633d19" d="M37.13 4.473c.394-.082.731-.245.583-.563c-.716-1.52-2.453-2.371-4.068-2.568c-.938-.115-2.02.119-2.893-.242C29.648.656 26.103-.1 25.833.011c-2.142.875-5.54 3.607-5.087 6.253c.106.629 2.053-.061 2.093-.094l-.015.029s.812 4.557 2.04.008c.255-.945.862-1.767 1.487-2.481c.286-.045.569-.074.85-.095c.362.099.731.115 1.07.017c.51.065.952.23 1.239.534c.558.591.58 1.799.668 2.547c.029.226.349.337.729.35c1.348.698 3.661 2.855 4.218 2.699c1.992-.546 3.725-.933 3.865-1.594c.387-1.829-.803-2.598-1.86-3.711" />
        </svg>
      );
    case 'cycling':
      return (
        <svg aria-hidden="true" viewBox="0 0 128 128" fill="none">
          <path fill="#F0A007" d="m61.5 58.26l-6.04-2.15s-4.95 2.99-4.5 6.82s3.96 9.01 5.11 10.8s6.84 10.55 6.84 10.55l5.18-2.11l.77-14.06l-7.35-9.84z" />
          <path fill="#858585" d="m66.93 81.35l-4.34 2.71s.9 1.52 1.21 2.03s1.13 2.14 1.13 2.14l1.17 2.25l-.83 1.73l.06 2.24l2.94 2.62l2.81-5.88l-4.16-9.83z" />
          <path fill="#00BDA3" d="m67.32 87.99l-2.42.22s.29 1.27.37 2.21s0 2.13 0 2.13l3.91-.28l-1.85-4.28z" />
          <path fill="#F09E00" d="M27.07 56.05s5.74-3.03 7.96-3.93c3.14-1.28 5.31-1.47 5.31-1.47l1.08 9.63l-14.34-4.22z" />
          <path fill="#9A9A9A" d="M106.5 102.59c.96-2.53.9-6.2-2.56-7.69s-6.56.38-7.55 2.19c-.98 1.81-1.5 6.3 2.03 8.14c3.45 1.8 7.02.15 8.08-2.65z" />
          <path fill="#606265" d="M100.54 123.18c-12.82 0-23.26-10.42-23.26-23.22s10.43-23.22 23.26-23.22s23.26 10.42 23.26 23.22s-10.43 23.22-23.26 23.22m0-42.13c-10.44 0-18.94 8.48-18.94 18.9s8.5 18.91 18.94 18.91s18.94-8.48 18.94-18.91s-8.5-18.9-18.94-18.9m-72.99 43.12c-12.87 0-23.34-10.49-23.34-23.38s10.47-23.38 23.34-23.38s23.34 10.49 23.34 23.38s-10.47 23.38-23.34 23.38m0-42.43c-10.49 0-19.02 8.55-19.02 19.05s8.53 19.05 19.02 19.05s19.02-8.55 19.02-19.05s-8.53-19.05-19.02-19.05" />
          <path fill="#9A9A9A" d="M25.34 104.56c2.36 1.42 5.29.57 6.52-1.79s.72-4.9-1.72-6.33s-5.03-.37-6.22 1.7c-1.07 1.87-1.08 4.92 1.42 6.42" />
          <path fill="#B0B0B0" d="M102.03 94c-1.23-1.89-16.04-23.26-16.04-23.26l3.68-10.3s3.5-1.13 3.5-3.4s-4.91-3.02-4.91-3.02L81.18 71.4s-12.75-1.04-20.97-1.98s-13.6-1.42-14.64-1.79s-.54-1.19-.16-2.8s1.77-4.95 1.77-4.95l-4.44-1.61S27.53 95.68 26.97 97.19s-1.89 4.16 0 5.1c1.6.8 2.93-.66 3.97-3.21s9.92-22.76 9.92-22.76L64.1 100.5l13.79 3.31s17.26-.1 19.63-.1s4.43-.66 5.6-2.72c1.46-2.58.17-5.1-1.05-6.98zm-35.31.55L44.99 71.6l32.97 3.02l-6.8 21.06zm30.81 5.12c-1.04.09-19.48.17-19.48.17l-2.83-1.04s8.6-23.71 8.78-23.71c0 0 14.57 20.25 15.19 21.5c.34.67.4 1.5.04 2.08s-1.18.95-1.7 1" />
        </svg>
      );
    case 'hiking':
      return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <circle cx="11.2" cy="3.4" r="1.6" fill="currentColor" />
          <path
            d="M10.2 5.5L8.7 9.6L6 12.8M10.3 5.5L13.1 8.1L15.5 7.2M8.8 9.6L10.2 15M10.2 9.7L12.5 12.2M4.7 15.6H15.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'swimming':
      return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <circle cx="8.1" cy="6" r="1.6" fill="currentColor" />
          <path
            d="M9.6 7.1L12.9 8.2L15 6.9M9.5 8.8L11.4 10.2M3 12.6C4 11.8 5 11.8 6 12.6C7 13.4 8 13.4 9 12.6C10 11.8 11 11.8 12 12.6C13 13.4 14 13.4 15 12.6C16 11.8 17 11.8 18 12.6M3 15.5C4 14.7 5 14.7 6 15.5C7 16.3 8 16.3 9 15.5C10 14.7 11 14.7 12 15.5C13 16.3 14 16.3 15 15.5C16 14.7 17 14.7 18 15.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'skiing':
      return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <circle cx="10.9" cy="3.5" r="1.6" fill="currentColor" />
          <path
            d="M10.3 5.7L8.7 9.3L6.1 11.6M10.3 5.7L12.8 8.5L15.3 7.4M9.2 10.1L11.1 12.2M4 15.4L9.9 13.4M7.2 17L13.8 14.7M14.4 5.2V14.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'all':
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <rect x="3.2" y="3.2" width="5.3" height="5.3" rx="1.1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11.5" y="3.2" width="5.3" height="5.3" rx="1.1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="3.2" y="11.5" width="5.3" height="5.3" rx="1.1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11.5" y="11.5" width="5.3" height="5.3" rx="1.1" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
  }
};

const ActivityCardInner: React.FC<ActivityCardProps> = ({
  period,
  summary,
  dailyDistances,
  interval,
  activities = [],
}) => {
  const { language } = useLanguage();
  const labels = useLabels();
  const [isFlipped, setIsFlipped] = useState(false);
  const handleCardClick = () => {
    if (interval === 'day' && activities.length > 0) {
      setIsFlipped(!isFlipped);
    }
  };
  const summaryDateLocale = language === 'zh-CN' ? 'zh-CN' : 'en-US';
  const generateLabels = (): number[] => {
    if (interval === 'month') {
      const [year, month] = period.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    } else if (interval === 'week') {
      return Array.from({ length: 7 }, (_, i) => i + 1);
    } else if (interval === 'year') {
      return Array.from({ length: 12 }, (_, i) => i + 1); // Generate months 1 to 12
    }
    return [];
  };

  const data: ChartData[] = generateLabels().map((day) => ({
    day,
    distance: (dailyDistances[day - 1] || 0).toFixed(2), // Keep two decimal places
  }));

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}${labels.timeHoursLabel} ${m}${labels.timeMinutesLabel} ${s}${labels.timeSecondsLabel}`;
  };

  const formatPace = (speed: number): string => {
    if (speed === 0) return `0:00 ${labels.paceMinutesLabel}/${DIST_UNIT}`;
    const pace = 60 / speed; // min/DIST_UNIT
    const totalSeconds = Math.round(pace * 60); // Total seconds per DIST_UNIT
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} ${labels.paceMinutesLabel}/${DIST_UNIT}`;
  };

  const displayPeriod = useMemo(() => {
    if (interval !== 'day') return period;
    const date = new Date(`${period}T00:00:00`);
    if (Number.isNaN(date.getTime())) return period;
    return date.toLocaleDateString(summaryDateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [interval, period, summaryDateLocale]);

  // Calculate Y-axis maximum value and ticks
  const yAxisMax = Math.ceil(
    Math.max(...data.map((d) => parseFloat(d.distance))) + 10
  ); // Round up and add buffer
  const yAxisTicks = Array.from(
    { length: Math.ceil(yAxisMax / 5) + 1 },
    (_, i) => i * 5
  ); // Generate arithmetic sequence

  return (
    <div
      className={`${styles.activityCard} ${interval === 'day' ? styles.activityCardFlippable : ''}`}
      onClick={handleCardClick}
      style={{
        cursor:
          interval === 'day' && activities.length > 0 ? 'pointer' : 'default',
      }}
    >
      <div className={`${styles.cardInner} ${isFlipped ? styles.flipped : ''}`}>
        {/* Front side - Activity details */}
        <div className={styles.cardFront}>
          <h2 className={styles.activityName}>{displayPeriod}</h2>
          <div className={styles.activityDetails}>
            <p>
              <strong>{labels.activityTotal.TOTAL_DISTANCE_TITLE}:</strong>{' '}
              {summary.totalDistance.toFixed(2)} {DIST_UNIT}
            </p>
            {SHOW_ELEVATION_GAIN &&
              summary.totalElevationGain !== undefined && (
                <p>
                  <strong>
                    {labels.activityTotal.TOTAL_ELEVATION_GAIN_TITLE}:
                  </strong>{' '}
                  {summary.totalElevationGain.toFixed(0)} m
                </p>
              )}
            <p>
              <strong>{labels.activityTotal.AVERAGE_SPEED_TITLE}:</strong>{' '}
              {formatPace(summary.averageSpeed)}
            </p>
            <p>
              <strong>{labels.activityTotal.TOTAL_TIME_TITLE}:</strong>{' '}
              {formatTime(summary.totalTime)}
            </p>
            {summary.averageHeartRate !== undefined && (
              <p>
                <strong>
                  {labels.activityTotal.AVERAGE_HEART_RATE_TITLE}:
                </strong>{' '}
                {summary.averageHeartRate.toFixed(0)} {labels.heartRateUnitLabel}
              </p>
            )}
            {interval !== 'day' && (
              <>
                <p>
                  <strong>{labels.activityTotal.ACTIVITY_COUNT_TITLE}:</strong>{' '}
                  {summary.count}
                </p>
                <p>
                  <strong>{labels.activityTotal.MAX_DISTANCE_TITLE}:</strong>{' '}
                  {summary.maxDistance.toFixed(2)} {DIST_UNIT}
                </p>
                <p>
                  <strong>{labels.activityTotal.MAX_SPEED_TITLE}:</strong>{' '}
                  {formatPace(summary.maxSpeed)}
                </p>
                <p>
                  <strong>
                    {labels.activityTotal.AVERAGE_DISTANCE_TITLE}:
                  </strong>{' '}
                  {(summary.totalDistance / summary.count).toFixed(2)}{' '}
                  {DIST_UNIT}
                </p>
              </>
            )}
            {['month', 'week', 'year'].includes(interval) && (
              <div className={styles.chart}>
                <ResponsiveContainer>
                  <BarChart
                    data={data}
                    margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-run-row-hover-background)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'var(--color-run-table-thead)' }}
                    />
                    <YAxis
                      label={{
                        value: DIST_UNIT,
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--color-run-table-thead)',
                      }}
                      domain={[0, yAxisMax]}
                      ticks={yAxisTicks}
                      tick={{ fill: 'var(--color-run-table-thead)' }}
                    />
                    <Tooltip
                      formatter={(value) => `${value} ${DIST_UNIT}`}
                      contentStyle={{
                        backgroundColor:
                          'var(--color-run-row-hover-background)',
                        border:
                          '1px solid var(--color-run-row-hover-background)',
                        color: 'var(--color-run-table-thead)',
                      }}
                      labelStyle={{ color: 'var(--color-primary)' }}
                    />
                    <Bar dataKey="distance" fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Back side - Route preview */}
        {interval === 'day' && activities.length > 0 && (
          <div className={styles.cardBack}>
            <div className={styles.routeContainer}>
              <RoutePreview activities={activities} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// custom equality for memo: compare key summary fields, dailyDistances values and activities length
const activityCardAreEqual = (
  prev: ActivityCardProps,
  next: ActivityCardProps
) => {
  if (prev.period !== next.period) return false;
  if (prev.interval !== next.interval) return false;
  const s1 = prev.summary;
  const s2 = next.summary;
  if (
    s1.totalDistance !== s2.totalDistance ||
    s1.averageSpeed !== s2.averageSpeed ||
    s1.totalTime !== s2.totalTime ||
    s1.count !== s2.count ||
    s1.maxDistance !== s2.maxDistance ||
    s1.maxSpeed !== s2.maxSpeed ||
    s1.location !== s2.location ||
    (s1.totalElevationGain ?? undefined) !==
      (s2.totalElevationGain ?? undefined) ||
    (s1.averageHeartRate ?? undefined) !== (s2.averageHeartRate ?? undefined)
  ) {
    return false;
  }
  const d1 = prev.dailyDistances || [];
  const d2 = next.dailyDistances || [];
  if (d1.length !== d2.length) return false;
  for (let i = 0; i < d1.length; i++) if (d1[i] !== d2[i]) return false;
  const a1 = prev.activities || [];
  const a2 = next.activities || [];
  if (a1.length !== a2.length) return false;
  return true;
};

const ActivityCard = React.memo(ActivityCardInner, activityCardAreEqual);

const ActivityList: React.FC = () => {
  const { language } = useLanguage();
  const labels = useLabels();
  const activities = visibleActivities;
  const [interval, setInterval] = useState<IntervalType>('month');
  const [sportType, setSportType] = useState<string>('all');
  const [isSportTypeMenuOpen, setIsSportTypeMenuOpen] = useState(false);
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const sportTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const intervalMenuRef = useRef<HTMLDivElement | null>(null);
  const isSportTypeDisabledInLife = (type: string) =>
    interval === 'life' && type !== 'all';
  const normalizedSportType = useMemo(
    () =>
      sportType === 'all' ? 'all' : normalizeActivitySportType(sportType),
    [sportType]
  );
  const sportTypeOptions = useMemo(() => {
    const sportTypeSet = new Set(
      activities.map((activity) => normalizeActivitySportType(activity.type))
    );

    const preferredOrder = [
      'running',
      'cycling',
      'walking',
      'hiking',
      'swimming',
      'skiing',
    ];

    return [
      'all',
      ...preferredOrder.filter((type) => sportTypeSet.has(type)),
      ...[...sportTypeSet].filter((type) => !preferredOrder.includes(type)),
    ];
  }, [activities]);

  const intervalOptions = useMemo<IntervalOption[]>(
    () => [
      { value: 'year', label: labels.activityTotal.YEARLY_TITLE },
      { value: 'month', label: labels.activityTotal.MONTHLY_TITLE },
      { value: 'week', label: labels.activityTotal.WEEKLY_TITLE },
      { value: 'day', label: labels.activityTotal.DAILY_TITLE },
      { value: 'life', label: labels.lifeLabel },
    ],
    [labels]
  );

  // Get available years from activities
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    activities.forEach((activity) => {
      const year = new Date(activity.start_date_local).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [activities]);

  // Keyboard navigation for year selection in Life view
  useEffect(() => {
    if (interval !== 'life') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      // Prevent default scrolling behavior
      e.preventDefault();

      // Remove focus from current element to avoid visual confusion
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const currentIndex = selectedYear
        ? availableYears.indexOf(selectedYear)
        : -1;

      if (e.key === 'ArrowLeft') {
        // Move to newer year (left in UI, lower index since sorted descending)
        if (currentIndex === -1) {
          // No year selected, select the last (oldest) year
          setSelectedYear(availableYears[availableYears.length - 1]);
        } else if (currentIndex > 0) {
          setSelectedYear(availableYears[currentIndex - 1]);
        } else if (currentIndex === 0) {
          // At the most recent year, deselect to show Life view
          setSelectedYear(null);
        }
      } else if (e.key === 'ArrowRight') {
        // Move to older year (right in UI, higher index since sorted descending)
        if (currentIndex === -1) {
          // No year selected, select the first (most recent) year
          setSelectedYear(availableYears[0]);
        } else if (currentIndex < availableYears.length - 1) {
          setSelectedYear(availableYears[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interval, selectedYear, availableYears]);

  useEffect(() => {
    if (sportType !== normalizedSportType) {
      setSportType(normalizedSportType);
    }
  }, [normalizedSportType, sportType]);

  useEffect(() => {
    if (
      normalizedSportType !== 'all' &&
      !sportTypeOptions.includes(normalizedSportType)
    ) {
      setSportType('all');
    }
  }, [normalizedSportType, sportTypeOptions]);

  // 添加useEffect监听interval变化
  useEffect(() => {
    if (interval === 'life' && normalizedSportType !== 'all') {
      setSportType('all');
    }
  }, [interval, normalizedSportType]);

  useEffect(() => {
    setIsSportTypeMenuOpen(false);
    setIsIntervalMenuOpen(false);
  }, [interval]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        sportTypeMenuRef.current &&
        !sportTypeMenuRef.current.contains(event.target as Node)
      ) {
        setIsSportTypeMenuOpen(false);
      }
      if (
        intervalMenuRef.current &&
        !intervalMenuRef.current.contains(event.target as Node)
      ) {
        setIsIntervalMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSportTypeMenuOpen(false);
        setIsIntervalMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate('/');
  };

  const currentSportTypeLabel =
    labels.sportTypeLabels[normalizedSportType] ?? normalizedSportType;
  const currentIntervalLabel =
    intervalOptions.find((option) => option.value === interval)?.label ?? interval;

  const sportTypeDropdownOptions = useMemo<SportTypeOption[]>(
    () =>
      sportTypeOptions.map((type) => ({
        value: type,
        label: labels.sportTypeLabels[type] ?? type,
        disabled: isSportTypeDisabledInLife(type),
      })),
    [labels.sportTypeLabels, sportTypeOptions, interval]
  );

  const handleSportTypeSelect = (type: string) => {
    if (isSportTypeDisabledInLife(type)) {
      return;
    }

    setSportType(type);
    setIsSportTypeMenuOpen(false);
  };

  function toggleInterval(newInterval: IntervalType): void {
    setInterval(newInterval);
  }

  const handleIntervalSelect = (nextInterval: IntervalType) => {
    toggleInterval(nextInterval);
    setIsIntervalMenuOpen(false);
  };

  function convertTimeToSeconds(time: string): number {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  function groupActivitiesFn(
    intervalArg: IntervalType,
    sportTypeArg: string
  ): ActivityGroups {
    return (activities as Activity[])
      .filter((activity) => {
        if (sportTypeArg === 'all') return true;
        return normalizeActivitySportType(activity.type) === sportTypeArg;
      })
      .reduce((acc: ActivityGroups, activity) => {
        const date = new Date(activity.start_date_local);
        let key: string;
        let index: number;
        switch (intervalArg) {
          case 'year':
            key = date.getFullYear().toString();
            index = date.getMonth();
            break;
          case 'month':
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            index = date.getDate() - 1;
            break;
          case 'week': {
            const currentDate = new Date(date.valueOf());
            currentDate.setDate(
              currentDate.getDate() + 4 - (currentDate.getDay() || 7)
            );
            const yearStart = new Date(currentDate.getFullYear(), 0, 1);
            const weekNum = Math.ceil(
              ((currentDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
            );
            key = `${currentDate.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
            index = (date.getDay() + 6) % 7;
            break;
          }
          case 'day':
            key = activity.start_date_local.slice(0, 10);
            index = 0;
            break;
          default:
            key = date.getFullYear().toString();
            index = 0;
        }

        if (!acc[key])
          acc[key] = {
            totalDistance: 0,
            totalTime: 0,
            totalElevationGain: 0,
            count: 0,
            dailyDistances: [],
            maxDistance: 0,
            maxSpeed: 0,
            location: '',
            totalHeartRate: 0,
            heartRateCount: 0,
            activities: [],
          };

        const distance = activity.distance / M_TO_DIST;
        const timeInSeconds = convertTimeToSeconds(activity.moving_time);
        const speed = timeInSeconds > 0 ? distance / (timeInSeconds / 3600) : 0;

        acc[key].totalDistance += distance;
        acc[key].totalTime += timeInSeconds;

        if (SHOW_ELEVATION_GAIN && activity.elevation_gain)
          acc[key].totalElevationGain += activity.elevation_gain;

        if (activity.average_heartrate) {
          acc[key].totalHeartRate += activity.average_heartrate;
          acc[key].heartRateCount += 1;
        }

        acc[key].count += 1;
        if (intervalArg === 'day') acc[key].activities.push(activity);
        acc[key].dailyDistances[index] =
          (acc[key].dailyDistances[index] || 0) + distance;
        if (distance > acc[key].maxDistance) acc[key].maxDistance = distance;
        if (speed > acc[key].maxSpeed) acc[key].maxSpeed = speed;
        if (intervalArg === 'day')
          acc[key].location = activity.location_country || '';

        return acc;
      }, {} as ActivityGroups);
  }

  const activitiesByInterval = useMemo(
    () => groupActivitiesFn(interval, normalizedSportType),
    [activities, interval, normalizedSportType]
  );

  const dataList = useMemo(
    () =>
      Object.entries(activitiesByInterval)
        .sort(([a], [b]) => {
          if (interval === 'day') {
            return new Date(b).getTime() - new Date(a).getTime(); // Sort by date
          } else if (interval === 'week') {
            const [yearA, weekA] = a.split('-W').map(Number);
            const [yearB, weekB] = b.split('-W').map(Number);
            return yearB - yearA || weekB - weekA; // Sort by year and week number
          } else {
            const [yearA, monthA = 0] = a.split('-').map(Number);
            const [yearB, monthB = 0] = b.split('-').map(Number);
            return yearB - yearA || monthB - monthA; // Sort by year and month
          }
        })
        .map(([period, summary]) => ({ period, summary })),
    [activitiesByInterval, interval]
  );

  const itemWidth = ITEM_WIDTH;
  const gap = ITEM_GAP;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [itemsPerRow, setItemsPerRow] = useState(0);
  const [rowHeight, setRowHeight] = useState<number>(360);
  const sampleRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState<number>(500);

  // ref to the VirtualList DOM node so we can control scroll position
  const virtualListRef = useRef<HTMLDivElement | null>(null);

  const calculateItemsPerRow = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    // Calculate how many items can fit in one row (considering gaps)
    const count = Math.floor((containerWidth + gap) / (itemWidth + gap));
    setItemsPerRow(count);
  }, [gap, itemWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Calculate immediately once
    calculateItemsPerRow();

    // Use ResizeObserver to monitor container size changes
    const resizeObserver = new ResizeObserver(calculateItemsPerRow);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [calculateItemsPerRow]);

  // when the interval changes, scroll the virtual list to top to improve UX
  useEffect(() => {
    // attempt to find the virtual list DOM node and reset scrollTop
    const resetScroll = () => {
      // prefer an explicit ref if available
      const el =
        virtualListRef.current || document.querySelector('.rc-virtual-list');
      if (el) {
        try {
          el.scrollTop = 0;
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Defer to next frame so the list has time to re-render with new data
    const id = requestAnimationFrame(() => requestAnimationFrame(resetScroll));
    // also fallback to a short timeout
    const t = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, [interval, normalizedSportType]);

  // compute list height = viewport height - filter container height
  useEffect(() => {
    const updateListHeight = () => {
      const filterH = filterRef.current?.clientHeight || 0;
      const containerEl = containerRef.current;
      let topOffset = 0;
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        topOffset = Math.max(0, rect.top);
      }
      const base = topOffset || filterH || 0;
      // Try to compute a dynamic bottom padding by checking the container's parent element's bottom
      let bottomPadding = 16; // fallback
      if (containerEl && containerEl.parentElement) {
        try {
          const parentRect = containerEl.parentElement.getBoundingClientRect();
          const containerRect = containerEl.getBoundingClientRect();
          const distanceToParentBottom = Math.max(
            0,
            parentRect.bottom - containerRect.bottom
          );
          // Use a small fraction of that distance (or clamp) to avoid huge paddings
          bottomPadding = Math.min(
            48,
            Math.max(8, Math.round(distanceToParentBottom / 4))
          );
        } catch (e) {
          console.error(e);
        }
      }
      const h = Math.max(100, window.innerHeight - base - bottomPadding);
      setListHeight(h);
    };

    // initial
    updateListHeight();

    // window resize
    window.addEventListener('resize', updateListHeight);

    // observe filter size changes
    const ro = new ResizeObserver(updateListHeight);
    if (filterRef.current) ro.observe(filterRef.current);

    return () => {
      window.removeEventListener('resize', updateListHeight);
      ro.disconnect();
    };
  }, []);

  // measure representative card height using a hidden sample and ResizeObserver
  useEffect(() => {
    const el = sampleRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      if (h && h !== rowHeight) setRowHeight(h);
    };
    // initial
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dataList, rowHeight]);

  const calcGroup: RowGroup[] = useMemo(() => {
    if (itemsPerRow < 1) return [];
    const groupLength = Math.ceil(dataList.length / itemsPerRow);
    const arr: RowGroup[] = [];
    for (let i = 0; i < groupLength; i++) {
      const start = i * itemsPerRow;
      arr.push(dataList.slice(start, start + itemsPerRow));
    }
    return arr;
  }, [dataList, itemsPerRow]);

  // compute a row width so we can center the VirtualList and keep cards left-aligned inside
  const rowWidth =
    itemsPerRow < 1
      ? '100%'
      : `${itemsPerRow * itemWidth + Math.max(0, itemsPerRow - 1) * gap}px`;
  const shouldUseVirtualList = calcGroup.length > 8;

  const loading = itemsPerRow < 1 || !rowHeight;
  const RunningSvg = useMemo(() => MonthOfLifeSvg('running', language), [language]);
  const WalkingSvg = useMemo(() => MonthOfLifeSvg('walking', language), [language]);
  const HikingSvg = useMemo(() => MonthOfLifeSvg('hiking', language), [language]);
  const CyclingSvg = useMemo(() => MonthOfLifeSvg('cycling', language), [language]);
  const SwimmingSvg = useMemo(() => MonthOfLifeSvg('swimming', language), [language]);
  const SkiingSvg = useMemo(() => MonthOfLifeSvg('skiing', language), [language]);
  const AllSvg = useMemo(() => MonthOfLifeSvg('all', language), [language]);

  return (
    <div className={styles.activityList}>
      <div className={styles.filterContainer} ref={filterRef}>
        <button className={styles.smallHomeButton} onClick={handleHomeClick}>
          {labels.homePageTitle}
        </button>
        <div
          className={`${styles.filterDropdown} ${styles.filterDropdownWithIcon}`}
          ref={sportTypeMenuRef}
        >
          <button
            type="button"
            className={styles.filterDropdownButton}
            onClick={() => {
              setIsSportTypeMenuOpen((open) => !open);
              setIsIntervalMenuOpen(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={isSportTypeMenuOpen}
            aria-controls="sport-type-menu"
          >
            <span className={styles.filterDropdownButtonContent}>
              <span className={styles.filterDropdownIcon}>
                <SportTypeIcon type={normalizedSportType} />
              </span>
              <span className={styles.filterDropdownLabel}>
                {currentSportTypeLabel}
              </span>
            </span>
            <span
              className={`${styles.filterDropdownChevron} ${isSportTypeMenuOpen ? styles.filterDropdownChevronOpen : ''}`}
            >
              <ChevronDownIcon />
            </span>
          </button>
          {isSportTypeMenuOpen && (
            <div
              className={styles.filterDropdownMenu}
              id="sport-type-menu"
              role="listbox"
            >
              {sportTypeDropdownOptions.map((option) => {
                const isDisabled = option.disabled ?? false;
                const isSelected = normalizedSportType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    className={`${styles.filterDropdownItem} ${isSelected ? styles.filterDropdownItemSelected : ''} ${isDisabled ? styles.filterOptionDisabled : ''}`}
                    onClick={() => handleSportTypeSelect(option.value)}
                  >
                    <span className={styles.filterDropdownItemMain}>
                      <span className={styles.filterDropdownCheck}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className={styles.filterDropdownIcon}>
                        <SportTypeIcon type={option.value} />
                      </span>
                      <span className={styles.filterDropdownLabel}>
                        {option.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className={styles.filterDropdown} ref={intervalMenuRef}>
          <button
            type="button"
            className={styles.filterDropdownButton}
            onClick={() => {
              setIsIntervalMenuOpen((open) => !open);
              setIsSportTypeMenuOpen(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={isIntervalMenuOpen}
            aria-controls="interval-menu"
          >
            <span className={styles.filterDropdownButtonContent}>
              <span className={styles.filterDropdownLabel}>
                {currentIntervalLabel}
              </span>
            </span>
            <span
              className={`${styles.filterDropdownChevron} ${isIntervalMenuOpen ? styles.filterDropdownChevronOpen : ''}`}
            >
              <ChevronDownIcon />
            </span>
          </button>
          {isIntervalMenuOpen && (
            <div
              className={styles.filterDropdownMenu}
              id="interval-menu"
              role="listbox"
            >
              {intervalOptions.map((option) => {
                const isSelected = interval === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.filterDropdownItem} ${isSelected ? styles.filterDropdownItemSelected : ''}`}
                    onClick={() => handleIntervalSelect(option.value)}
                  >
                    <span className={styles.filterDropdownItemMain}>
                      <span className={styles.filterDropdownCheck}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className={styles.filterDropdownLabel}>
                        {option.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {interval === 'life' && (
        <div className={styles.lifeContainer}>
          {/* Year selector buttons */}
          <div className={styles.yearSelector}>
            {availableYears.map((year) => (
              <button
                key={year}
                className={`${styles.yearButton} ${selectedYear === year ? styles.yearButtonActive : ''}`}
                onClick={() =>
                  setSelectedYear(selectedYear === year ? null : year)
                }
              >
                {year}
              </button>
            ))}
          </div>
          <Suspense fallback={<div>{labels.loadingSvgText}</div>}>
            {selectedYear ? (
              // Show Year Summary SVG when a year is selected
              (() => {
                const YearSvg = getYearSummarySvg(selectedYear, language);
                return <YearSvg className={styles.yearSummarySvg} />;
              })()
            ) : (
              // Show Life SVG when no year is selected
              <>
                {sportType === 'running' && <RunningSvg />}
                {sportType === 'walking' && <WalkingSvg />}
                {sportType === 'hiking' && <HikingSvg />}
                {sportType === 'cycling' && <CyclingSvg />}
                {sportType === 'swimming' && <SwimmingSvg />}
                {sportType === 'skiing' && <SkiingSvg />}
                {sportType === 'all' && <AllSvg />}
              </>
            )}
          </Suspense>
        </div>
      )}

      {interval !== 'life' && (
        <div className={styles.summaryContainer} ref={containerRef}>
          {/* hidden sample card for measuring row height */}
          <div
            style={{
              position: 'absolute',
              visibility: 'hidden',
              pointerEvents: 'none',
              height: 'auto',
            }}
            ref={sampleRef}
          >
            {dataList[0] && (
              <ActivityCard
                key={dataList[0].period}
                period={dataList[0].period}
                summary={{
                  totalDistance: dataList[0].summary.totalDistance,
                  averageSpeed: dataList[0].summary.totalTime
                    ? dataList[0].summary.totalDistance /
                      (dataList[0].summary.totalTime / 3600)
                    : 0,
                  totalTime: dataList[0].summary.totalTime,
                  count: dataList[0].summary.count,
                  maxDistance: dataList[0].summary.maxDistance,
                  maxSpeed: dataList[0].summary.maxSpeed,
                  location: dataList[0].summary.location,
                  totalElevationGain: SHOW_ELEVATION_GAIN
                    ? dataList[0].summary.totalElevationGain
                    : undefined,
                  averageHeartRate:
                    dataList[0].summary.heartRateCount > 0
                      ? dataList[0].summary.totalHeartRate /
                        dataList[0].summary.heartRateCount
                      : undefined,
                }}
                dailyDistances={dataList[0].summary.dailyDistances}
                interval={interval}
                activities={
                  interval === 'day'
                    ? dataList[0].summary.activities
                    : undefined
                }
              />
            )}
          </div>
          <div className={styles.summaryInner}>
            <div style={{ width: rowWidth }}>
              {loading ? (
                // Use full viewport height (or viewport minus filter height if available) to avoid flicker
                <div
                  style={{
                    height: filterRef.current
                      ? `${Math.max(100, window.innerHeight - (filterRef.current.clientHeight || 0) - 40)}px`
                      : '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      padding: 20,
                      color: 'var(--color-run-table-thead)',
                    }}
                  >
                    {labels.loadingText}
                  </div>
                </div>
              ) : (
                <>
                  {dataList.length === 0 && (
                    <div className={styles.emptyState}>{labels.noRouteData}</div>
                  )}
                  {dataList.length > 0 && !shouldUseVirtualList && (
                    <div className={styles.staticList}>
                      {calcGroup.map((row) => (
                        <div
                          key={row[0]?.period ?? 'row'}
                          className={styles.rowContainer}
                          style={{ gap: `${gap}px` }}
                        >
                          {row.map(
                            (cardData: {
                              period: string;
                              summary: ActivitySummary;
                            }) => (
                              <ActivityCard
                                key={cardData.period}
                                period={cardData.period}
                                summary={{
                                  totalDistance: cardData.summary.totalDistance,
                                  averageSpeed: cardData.summary.totalTime
                                    ? cardData.summary.totalDistance /
                                      (cardData.summary.totalTime / 3600)
                                    : 0,
                                  totalTime: cardData.summary.totalTime,
                                  count: cardData.summary.count,
                                  maxDistance: cardData.summary.maxDistance,
                                  maxSpeed: cardData.summary.maxSpeed,
                                  location: cardData.summary.location,
                                  totalElevationGain: SHOW_ELEVATION_GAIN
                                    ? cardData.summary.totalElevationGain
                                    : undefined,
                                  averageHeartRate:
                                    cardData.summary.heartRateCount > 0
                                      ? cardData.summary.totalHeartRate /
                                        cardData.summary.heartRateCount
                                      : undefined,
                                }}
                                dailyDistances={cardData.summary.dailyDistances}
                                interval={interval}
                                activities={
                                  interval === 'day'
                                    ? cardData.summary.activities
                                    : undefined
                                }
                              />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {dataList.length > 0 && shouldUseVirtualList && (
                    <VirtualList
                      key={`${sportType}-${interval}-${itemsPerRow}`}
                      data={calcGroup}
                      height={listHeight}
                      itemHeight={rowHeight}
                      itemKey={(row: RowGroup) => row[0]?.period ?? ''}
                      styles={VIRTUAL_LIST_STYLES}
                    >
                      {(row: RowGroup) => (
                        <div
                          ref={virtualListRef}
                          className={styles.rowContainer}
                          style={{ gap: `${gap}px` }}
                        >
                          {row.map(
                            (cardData: {
                              period: string;
                              summary: ActivitySummary;
                            }) => (
                              <ActivityCard
                                key={cardData.period}
                                period={cardData.period}
                                summary={{
                                  totalDistance: cardData.summary.totalDistance,
                                  averageSpeed: cardData.summary.totalTime
                                    ? cardData.summary.totalDistance /
                                      (cardData.summary.totalTime / 3600)
                                    : 0,
                                  totalTime: cardData.summary.totalTime,
                                  count: cardData.summary.count,
                                  maxDistance: cardData.summary.maxDistance,
                                  maxSpeed: cardData.summary.maxSpeed,
                                  location: cardData.summary.location,
                                  totalElevationGain: SHOW_ELEVATION_GAIN
                                    ? cardData.summary.totalElevationGain
                                    : undefined,
                                  averageHeartRate:
                                    cardData.summary.heartRateCount > 0
                                      ? cardData.summary.totalHeartRate /
                                        cardData.summary.heartRateCount
                                      : undefined,
                                }}
                                dailyDistances={cardData.summary.dailyDistances}
                                interval={interval}
                                activities={
                                  interval === 'day'
                                    ? cardData.summary.activities
                                    : undefined
                                }
                              />
                            )
                          )}
                        </div>
                      )}
                    </VirtualList>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;
