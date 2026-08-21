import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import { useLanguage } from '@/hooks/useLanguage';
import useLabels from '@/hooks/useLabels';
import { formatPace } from '@/utils/utils';
import useHover from '@/hooks/useHover';
import { yearStats, githubYearStats } from '@assets/index';
import { getLocalizedSvgPath } from '@/utils/language';
import { loadSvgComponent } from '@/utils/svgUtils';
import { SHOW_ELEVATION_GAIN, TOTAL_FILTER_KEY } from '@/utils/const';
import { DIST_UNIT, M_TO_DIST, M_TO_ELEV } from '@/utils/utils';
import styles from './style.module.css';

const PREVIEW_MEDIA_QUERY =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const PREVIEW_VIEWPORT_GAP = 16;
const PREVIEW_ANCHOR_GAP = 12;
const PREVIEW_MIN_WIDTH = 220;
const PREVIEW_MAX_WIDTH = 420;
const PREVIEW_MIN_HEIGHT = 220;

type PreviewPosition = {
  left: number;
  width: number;
  top: number;
  height: number;
};

const YearStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  let { runningActivities: runs } = useActivities();
  const { language } = useLanguage();
  const labels = useLabels();
  const [hovered, eventHandlers] = useHover();
  const anchorRef = useRef<HTMLElement>(null);
  const [canShowPreview, setCanShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] =
    useState<PreviewPosition | null>(null);
  const previewRequested =
    year !== TOTAL_FILTER_KEY && hovered && canShowPreview;
  const showPreview = previewRequested && previewPosition !== null;

  useEffect(() => {
    const mediaQuery = window.matchMedia(PREVIEW_MEDIA_QUERY);
    const updateCapability = () => setCanShowPreview(mediaQuery.matches);

    updateCapability();
    mediaQuery.addEventListener('change', updateCapability);
    return () => mediaQuery.removeEventListener('change', updateCapability);
  }, []);

  useLayoutEffect(() => {
    if (!previewRequested) {
      setPreviewPosition(null);
      return;
    }

    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const anchor = anchorRef.current;
      if (!anchor) return;

      const statItem = anchor.closest<HTMLElement>('[data-stat-year]');
      const bottomBoundary = statItem?.querySelector<HTMLElement>(
        '[data-year-boundary-after]'
      );
      const previousItem = statItem?.previousElementSibling;
      const topBoundary = previousItem?.matches('[data-year-list-boundary]')
        ? (previousItem as HTMLElement)
        : previousItem?.querySelector<HTMLElement>(
            '[data-year-boundary-after]'
          );
      if (!statItem || !topBoundary || !bottomBoundary) return;

      const anchorRect = anchor.getBoundingClientRect();
      const availableWidth =
        anchorRect.left - PREVIEW_VIEWPORT_GAP - PREVIEW_ANCHOR_GAP;
      const previewWidth = Math.min(
        anchorRect.width,
        PREVIEW_MAX_WIDTH,
        availableWidth
      );
      if (previewWidth < PREVIEW_MIN_WIDTH) {
        setPreviewPosition(null);
        return;
      }

      const boundaryTop = topBoundary.getBoundingClientRect().bottom;
      const boundaryBottom = bottomBoundary.getBoundingClientRect().bottom;
      const previewTop = Math.max(PREVIEW_VIEWPORT_GAP, boundaryTop);
      const previewBottom = Math.min(
        window.innerHeight - PREVIEW_VIEWPORT_GAP,
        boundaryBottom
      );
      const previewHeight = previewBottom - previewTop;
      if (previewHeight < PREVIEW_MIN_HEIGHT) {
        setPreviewPosition(null);
        return;
      }

      setPreviewPosition({
        left: anchorRect.left - PREVIEW_ANCHOR_GAP - previewWidth,
        width: previewWidth,
        top: previewTop,
        height: previewHeight,
      });
    };

    const statItem =
      anchorRef.current?.closest<HTMLElement>('[data-stat-year]');
    const resizeObserver = new ResizeObserver(updatePosition);
    if (statItem) resizeObserver.observe(statItem);
    if (statItem?.parentElement) resizeObserver.observe(statItem.parentElement);

    updatePosition();
    void document.fonts.ready.then(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      active = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [previewRequested]);

  const YearSVG = useMemo(
    () =>
      lazy(() =>
        loadSvgComponent(
          yearStats,
          getLocalizedSvgPath(`./year_${year}.svg`, language)
        )
      ),
    [language, year]
  );
  const GithubYearSVG = useMemo(
    () =>
      lazy(() =>
        loadSvgComponent(
          githubYearStats,
          getLocalizedSvgPath(`./github_${year}.svg`, language)
        )
      ),
    [language, year]
  );

  if (year !== TOTAL_FILTER_KEY) {
    runs = runs.filter((run) => run.start_date_local.slice(0, 4) === year);
  }
  let sumDistance = 0;
  let streak = 0;
  let sumElevationGain = 0;
  let _pace = 0;
  let _paceNullCount = 0;
  let heartRate = 0;
  let heartRateNullCount = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;
  runs.forEach((run) => {
    sumDistance += run.distance || 0;
    sumElevationGain += run.elevation_gain || 0;
    if (run.average_speed) {
      _pace += run.average_speed;
      totalMetersAvail += run.distance || 0;
      totalSecondsAvail += (run.distance || 0) / run.average_speed;
    } else {
      _paceNullCount++;
    }
    if (run.average_heartrate) {
      heartRate += run.average_heartrate;
    } else {
      heartRateNullCount++;
    }
    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
  });
  sumDistance = parseFloat((sumDistance / M_TO_DIST).toFixed(1));
  const sumElevationGainStr = (sumElevationGain * M_TO_ELEV).toFixed(0);
  const avgPace = formatPace(totalMetersAvail / totalSecondsAvail);
  const hasHeartRate = !(heartRate === 0);
  const avgHeartRate = (heartRate / (runs.length - heartRateNullCount)).toFixed(
    0
  );
  const displayYearLabel = year === TOTAL_FILTER_KEY ? labels.totalLabel : year;
  const journeyDescription =
    year === TOTAL_FILTER_KEY ? '' : ` ${labels.journeyLabel}`;
  const preview = showPreview
    ? createPortal(
        <div
          className={styles.preview}
          data-year-preview={year}
          data-positioned={previewPosition !== null}
          style={
            previewPosition
              ? {
                  left: previewPosition.left,
                  width: previewPosition.width,
                  top: previewPosition.top,
                  height: previewPosition.height,
                }
              : undefined
          }
          aria-hidden="true"
        >
          <Suspense
            fallback={
              <div className={styles.loading}>{labels.loadingText}</div>
            }
          >
            <div className={styles.yearVisual}>
              <YearSVG className={`${styles.yearSvg} year-svg`} />
            </div>
            <div className={styles.githubYearVisual}>
              <GithubYearSVG
                className={`${styles.githubYearSvg} github-year-svg`}
              />
            </div>
          </Suspense>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="cursor-pointer" onClick={() => onClick(year)}>
      <section ref={anchorRef} {...eventHandlers}>
        <Stat value={displayYearLabel} description={journeyDescription} />
        <Stat value={runs.length} description={` ${labels.runsLabel}`} />
        <Stat value={sumDistance} description={` ${DIST_UNIT}`} />
        {SHOW_ELEVATION_GAIN && (
          <Stat
            value={sumElevationGainStr}
            description={` ${labels.totalElevationGainTitle}`}
          />
        )}
        <Stat value={avgPace} description={` ${labels.avgPaceLabel}`} />
        <Stat
          value={`${streak} ${labels.streakUnitLabel}`}
          description={` ${labels.streakLabel}`}
        />
        {hasHeartRate && (
          <Stat
            value={avgHeartRate}
            description={` ${labels.averageHeartRateTitle}`}
          />
        )}
      </section>
      {preview}
      <hr data-year-boundary-after={year} />
    </div>
  );
};

export default YearStat;
