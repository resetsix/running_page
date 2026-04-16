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

// A row group contains multiple activity card data items that will be rendered in one virtualized row
type RowGroup = Array<{ period: string; summary: ActivitySummary }>;

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
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
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
      'walking',
      'cycling',
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

  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate('/');
  };

  function toggleInterval(newInterval: IntervalType): void {
    setInterval(newInterval);
  }

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
  const isSportTypeDisabledInLife = (type: string) =>
    interval === 'life' && type !== 'all';

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
        <select
          className={interval === 'life' ? styles.filterSelectLife : undefined}
          onChange={(e) => setSportType(e.target.value)}
          value={normalizedSportType}
        >
          {sportTypeOptions.map((type) => (
            <option
              className={
                isSportTypeDisabledInLife(type)
                  ? styles.filterOptionDisabled
                  : undefined
              }
              key={type}
              value={type}
              disabled={isSportTypeDisabledInLife(type)}
            >
              {labels.sportTypeLabels[type] ?? type}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => toggleInterval(e.target.value as IntervalType)}
          value={interval}
        >
          <option value="year">{labels.activityTotal.YEARLY_TITLE}</option>
          <option value="month">{labels.activityTotal.MONTHLY_TITLE}</option>
          <option value="week">{labels.activityTotal.WEEKLY_TITLE}</option>
          <option value="day">{labels.activityTotal.DAILY_TITLE}</option>
          <option value="life">{labels.lifeLabel}</option>
        </select>
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
