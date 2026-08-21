import {
  Suspense,
  startTransition,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type UIEvent,
} from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import RunMap from '@/components/RunMap';
import RunMapButtons from '@/components/RunMap/RunMapButtons';
import RunTable from '@/components/RunTable';
import SVGStat, { preloadTotalStats } from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import useActivities from '@/hooks/useActivities';
import { useLanguage } from '@/hooks/useLanguage';
import useLabels from '@/hooks/useLabels';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useInterval } from '@/hooks/useInterval';
import { TOTAL_FILTER_KEY } from '@/utils/const';
import {
  Activity,
  IViewState,
  filterAndSortRuns,
  filterCityRuns,
  filterTitleRuns,
  filterYearRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  getLocalizedRunTitle,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';
import { useThemeChangeCounter } from '@/hooks/useTheme';

type FilterType = 'year' | 'city' | 'period';

const Index = () => {
  const labels = useLabels();
  const { language } = useLanguage();
  const { siteTitle, siteUrl } = useSiteMetadata();
  const { activities, runningYears, latestActivityYear } = useActivities();
  const themeChangeCounter = useThemeChangeCounter();
  const [year, setYear] = useState(latestActivityYear);
  const [visibleStatYear, setVisibleStatYear] = useState(latestActivityYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [customTitle, setCustomTitle] = useState('');
  const [showFilterTitle, setShowFilterTitle] = useState(false);
  // Animation states for replacing intervalIdRef
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [animationRuns, setAnimationRuns] = useState<Activity[]>([]);
  const [currentFilter, setCurrentFilter] = useState<{
    item: string;
    type: FilterType;
    func: (_run: Activity, _value: string) => boolean;
  }>({ item: latestActivityYear, type: 'year', func: filterYearRuns });

  // State to track if we're showing a single run from URL hash
  const [singleRunId, setSingleRunId] = useState<string | null>(null);

  // Animation trigger for single runs - increment this to force animation replay
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const selectedRunIdRef = useRef<string | null>(null);
  const selectedRunDateRef = useRef<string | null>(null);
  const runListRef = useRef<HTMLDivElement>(null);
  const yearScrollRegionRef = useRef<HTMLDivElement>(null);
  const scrollToTopOnTotalRef = useRef(false);
  const [listScrollRequest, setListScrollRequest] = useState(0);

  useEffect(() => {
    preloadTotalStats(language);
  }, [language]);

  // Parse URL hash on mount to check for run ID
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('run_')) {
      const runId = hash.slice('run_'.length);
      if (/^\d+$/.test(runId)) {
        setSingleRunId(runId);
      }
    }

    // Listen for hash changes (browser back/forward buttons)
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash && newHash.startsWith('run_')) {
        const runId = newHash.slice('run_'.length);
        if (/^\d+$/.test(runId)) {
          setSingleRunId(runId);
        }
      } else {
        // Hash was cleared, reset to normal view
        setSingleRunId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Memoize expensive calculations
  const runs = useMemo(() => {
    return filterAndSortRuns(
      activities,
      currentFilter.item,
      currentFilter.func,
      sortDateFunc
    );
  }, [activities, currentFilter.item, currentFilter.func]);

  const geoData = useMemo(() => {
    return geoJsonForRuns(runs);
  }, [runs, themeChangeCounter]);

  // for auto zoom
  const bounds = useMemo(() => {
    return getBoundsForGeoData(geoData);
  }, [geoData]);

  const [viewState, setViewState] = useState<IViewState>(() => ({
    ...bounds,
  }));
  const isTotal = year === TOTAL_FILTER_KEY;
  const showLocationStat = isTotal || (viewState.zoom ?? 0) <= 3;

  // Add state for animated geoData to handle the animation effect
  const [animatedGeoData, setAnimatedGeoData] = useState(geoData);

  // Use useInterval for animation instead of intervalIdRef
  useInterval(
    () => {
      if (!isAnimating || currentAnimationIndex >= animationRuns.length) {
        setIsAnimating(false);
        setAnimatedGeoData(geoData);
        return;
      }

      const runsNum = animationRuns.length;
      const sliceNum = runsNum >= 8 ? Math.ceil(runsNum / 8) : 1;
      const nextIndex = Math.min(currentAnimationIndex + sliceNum, runsNum);
      const tempRuns = animationRuns.slice(0, nextIndex);
      setAnimatedGeoData(geoJsonForRuns(tempRuns));
      setCurrentAnimationIndex(nextIndex);

      if (nextIndex >= runsNum) {
        setIsAnimating(false);
        setAnimatedGeoData(geoData);
      }
    },
    isAnimating ? 300 : null
  );

  // Helper function to start animation
  const startAnimation = useCallback(
    (runsToAnimate: Activity[]) => {
      if (runsToAnimate.length === 0) {
        setAnimatedGeoData(geoData);
        return;
      }

      const sliceNum =
        runsToAnimate.length >= 8 ? Math.ceil(runsToAnimate.length / 8) : 1;
      setAnimationRuns(runsToAnimate);
      setCurrentAnimationIndex(sliceNum);
      setIsAnimating(true);
    },
    [geoData]
  );

  const getMapTitle = useCallback(
    (item: string, filterLabel: string) => {
      if (!labels.isChinese) {
        return `${item} ${filterLabel} ${labels.runningHeatmapLabel}`;
      }
      if (filterLabel === labels.yearFilterLabel) {
        return `${item} 年${labels.runningHeatmapLabel}`;
      }
      return `${item}${labels.runningHeatmapLabel}`;
    },
    [labels.isChinese, labels.runningHeatmapLabel, labels.yearFilterLabel]
  );

  const changeByItem = useCallback(
    (
      item: string,
      type: FilterType,
      func: (_run: Activity, _value: string) => boolean
    ) => {
      // scrollToMap();
      if (type !== 'year') {
        setYear(latestActivityYear);
      }
      setCurrentFilter({ item, type, func });
      setRunIndex(-1);
      setShowFilterTitle(true);
      setCustomTitle('');
      // Reset single run state when changing filters
      setSingleRunId(null);
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    },
    [latestActivityYear]
  );

  const changeYear = useCallback(
    (y: string) => {
      const applyYearChange = () => {
        // default year
        setYear(y);

        if ((viewState.zoom ?? 0) > 3 && bounds) {
          setViewState({
            ...bounds,
          });
        }

        changeByItem(y, 'year', filterYearRuns);
        // Stop current animation
        setIsAnimating(false);
      };

      if (y === TOTAL_FILTER_KEY) {
        scrollToTopOnTotalRef.current = true;
        window.scrollTo({ top: 0, behavior: 'auto' });
        startTransition(applyYearChange);
        return;
      }

      scrollToTopOnTotalRef.current = false;
      applyYearChange();
    },
    [viewState.zoom, bounds, changeByItem]
  );

  const changeCity = useCallback(
    (city: string) => {
      changeByItem(city, 'city', filterCityRuns);
      setListScrollRequest((request) => request + 1);
    },
    [changeByItem]
  );

  const changeTitle = useCallback(
    (title: string) => {
      changeByItem(title, 'period', filterTitleRuns);
      setListScrollRequest((request) => request + 1);
    },
    [changeByItem]
  );

  useLayoutEffect(() => {
    setVisibleStatYear(year);
    if (yearScrollRegionRef.current) {
      yearScrollRegionRef.current.scrollTop = 0;
    }
    if (year === TOTAL_FILTER_KEY && scrollToTopOnTotalRef.current) {
      scrollToTopOnTotalRef.current = false;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [year]);

  const handleYearRegionScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (showLocationStat) return;

      const container = event.currentTarget;
      const containerTop = container.getBoundingClientRect().top;
      const switchLine =
        containerTop + Math.min(64, container.clientHeight * 0.15);
      const yearElements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-stat-year]')
      );
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <=
        1;
      let visibleYear = isAtBottom
        ? yearElements.at(-1)?.dataset.statYear
        : yearElements[0]?.dataset.statYear;

      if (!isAtBottom) {
        for (const element of yearElements) {
          if (element.getBoundingClientRect().top > switchLine) break;
          visibleYear = element.dataset.statYear;
        }
      }

      if (visibleYear) setVisibleStatYear(visibleYear);
    },
    [showLocationStat]
  );

  useEffect(() => {
    if (listScrollRequest === 0 || currentFilter.type === 'year') return;

    const frame = window.requestAnimationFrame(() => {
      const target = runListRef.current;
      if (!target) return;

      const scrollOffset =
        document.getElementById('site-header')?.offsetHeight ?? 0;
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + target.getBoundingClientRect().top - scrollOffset
        ),
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentFilter.type, listScrollRequest]);

  // For RunTable compatibility - create a mock setActivity function
  const setActivity = useCallback((_newRuns: Activity[]) => {
    // Since we're using memoized runs, we can't directly set activity
    // This is used by RunTable but we can work around it by managing the filter instead
    console.warn('setActivity called but runs are now computed from filters');
  }, []);

  const locateActivity = useCallback(
    (runIds: RunIds) => {
      const ids = new Set(runIds);

      const selectedRuns = !runIds.length
        ? runs
        : runs.filter((r: any) => ids.has(r.run_id));

      if (!selectedRuns.length) {
        return;
      }

      const lastRun = selectedRuns.sort(sortDateFunc)[0];

      if (!lastRun) {
        return;
      }

      // Set runIndex for table highlighting when single run is selected
      if (runIds.length === 1) {
        const runId = runIds[0];
        const runIdx = runs.findIndex((run) => run.run_id === runId);
        setRunIndex(runIdx);
      } else {
        setRunIndex(-1);
      }

      // Update URL hash when a single run is located
      if (runIds.length === 1) {
        const runId = runIds[0];
        const newHash = `#run_${runId}`;
        if (window.location.hash !== newHash) {
          window.history.pushState(null, '', newHash);
        }
        setSingleRunId(runId);
      } else {
        // If multiple runs or no runs, clear the hash and single run state
        if (window.location.hash) {
          window.history.pushState(null, '', window.location.pathname);
        }
        setSingleRunId(null);
      }

      // Create geoData for selected runs and calculate new bounds
      const selectedGeoData = geoJsonForRuns(selectedRuns);
      const selectedBounds = getBoundsForGeoData(selectedGeoData);

      // Stop any existing animation
      setIsAnimating(false);

      // Update the animated geoData immediately to trigger RunMap animation
      setAnimatedGeoData(selectedGeoData);

      // For single run, trigger animation by incrementing the trigger
      if (runIds.length === 1) {
        setAnimationTrigger((prev) => prev + 1);
      }

      // Update view state
      setViewState({
        ...selectedBounds,
      });
      setShowFilterTitle(false);
      setCustomTitle(titleForShow(lastRun));
      // scrollToMap();
    },
    [runs]
  );

  // Auto locate activity when singleRunId is set and activities are loaded
  // First, detect the run's year and switch to it if needed
  useEffect(() => {
    if (singleRunId !== null && activities.length > 0) {
      const targetRun = activities.find((run) => run.run_id === singleRunId);
      if (targetRun) {
        const runYear = targetRun.start_date_local.slice(0, 4);
        if (year !== runYear) {
          setYear(runYear);
          setCurrentFilter({
            item: runYear,
            type: 'year',
            func: filterYearRuns,
          });
        }
      } else {
        // If run doesn't exist, clear the hash and show a warning
        console.warn(`Activity with ID ${singleRunId} not found`);
        window.history.replaceState(null, '', window.location.pathname);
        setSingleRunId(null);
      }
    }
  }, [singleRunId, activities]);

  useEffect(() => {
    if (singleRunId !== null && runs.length > 0) {
      const runExistsInCurrentRuns = runs.some(
        (run) => run.run_id === singleRunId
      );
      if (runExistsInCurrentRuns) {
        locateActivity([singleRunId]);
      }
    }
  }, [runs, singleRunId, locateActivity]);

  // Update bounds when geoData changes
  useEffect(() => {
    if (singleRunId === null) {
      setViewState((prev) => ({
        ...prev,
        ...bounds,
      }));
    }
  }, [bounds, singleRunId]);

  // Animate geoData when runs change
  useEffect(() => {
    if (singleRunId === null) {
      startAnimation(runs);
    }
  }, [runs, startAnimation, singleRunId]);

  useEffect(() => {
    if (year !== TOTAL_FILTER_KEY) {
      return;
    }

    let svgStat = document.getElementById('svgStat');
    if (!svgStat) {
      return;
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        // Use querySelector to get the <desc> element and the <title> element.
        const descEl = target.querySelector('desc');
        if (descEl) {
          // If the runId exists in the <desc> element, it means that a running route has been clicked.
          const runId = descEl.textContent?.trim() ?? '';
          if (!/^\d+$/.test(runId)) {
            return;
          }
          if (selectedRunIdRef.current === runId) {
            selectedRunIdRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunIdRef.current = runId;
            locateActivity([runId]);
          }
          return;
        }

        const titleEl = target.querySelector('title');
        if (titleEl) {
          // If the runDate exists in the <title> element, it means that a date square has been clicked.
          const [runDate] = titleEl.innerHTML.match(
            /\d{4}-\d{1,2}-\d{1,2}/
          ) || [`${+latestActivityYear + 1}`];
          const runIDsOnDate = runs
            .filter((r) => r.start_date_local.slice(0, 10) === runDate)
            .map((r) => r.run_id);
          if (!runIDsOnDate.length) {
            return;
          }
          if (selectedRunDateRef.current === runDate) {
            selectedRunDateRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunDateRef.current = runDate;
            locateActivity(runIDsOnDate);
          }
        }
      }
    };
    svgStat.addEventListener('click', handleClick);
    return () => {
      svgStat && svgStat.removeEventListener('click', handleClick);
    };
  }, [year]);

  const currentFilterLabel = useMemo(() => {
    if (currentFilter.type === 'city') return labels.cityFilterLabel;
    if (currentFilter.type === 'period') return labels.periodFilterLabel;
    return labels.yearFilterLabel;
  }, [
    currentFilter.type,
    labels.cityFilterLabel,
    labels.periodFilterLabel,
    labels.yearFilterLabel,
  ]);

  const currentFilterDisplayItem = useMemo(() => {
    if (currentFilter.type === 'city') {
      return labels.cityNames[currentFilter.item] ?? currentFilter.item;
    }
    if (currentFilter.type === 'period') {
      return getLocalizedRunTitle(currentFilter.item, labels);
    }
    return currentFilter.item;
  }, [currentFilter.item, currentFilter.type, labels]);

  const title = useMemo(() => {
    if (showFilterTitle) {
      return getMapTitle(currentFilterDisplayItem, currentFilterLabel);
    }
    return customTitle;
  }, [
    currentFilterDisplayItem,
    currentFilterLabel,
    customTitle,
    getMapTitle,
    showFilterTitle,
  ]);
  return (
    <Layout
      flushBottom
      headerCenter={
        <RunMapButtons changeYear={changeYear} selectedYear={year} />
      }
      stickyHeader={!isTotal}
    >
      <div
        className={
          isTotal
            ? 'w-full lg:w-1/3'
            : 'w-full lg:sticky lg:top-44 lg:flex lg:h-[calc(100vh-11rem)] lg:w-1/3 lg:flex-col'
        }
      >
        <h1 className="my-12 mt-6 text-5xl font-extrabold italic lg:mt-0">
          <a href={siteUrl}>{siteTitle}</a>
        </h1>
        <section className="pb-0 pr-16">
          {showLocationStat ? (
            <p className="leading-relaxed">
              {labels.locationInfoMessages[0]}
              <br />
              {labels.locationInfoMessages[1]}
              <br />
              <br />
              {labels.locationInfoMessages[2]}
            </p>
          ) : (
            <p className="leading-relaxed">
              {labels.infoMessage(runningYears.length, visibleStatYear)}
              <br />
            </p>
          )}
        </section>
        <div
          ref={yearScrollRegionRef}
          className={
            isTotal
              ? 'year-scroll-region w-full'
              : 'year-scroll-region w-full lg:min-h-0 lg:flex-1 lg:overflow-y-auto'
          }
          onScroll={isTotal ? undefined : handleYearRegionScroll}
        >
          {showLocationStat ? (
            <LocationStat
              changeYear={changeYear}
              changeCity={changeCity}
              changeTitle={changeTitle}
            />
          ) : (
            <YearsStat year={year} onClick={changeYear} />
          )}
        </div>
      </div>
      <div className="w-full lg:w-2/3" id="map-container">
        <RunMap
          title={title}
          viewState={viewState}
          geoData={animatedGeoData}
          setViewState={setViewState}
          animationTrigger={animationTrigger}
        />
        <div ref={runListRef} className="scroll-mt-16">
          <Suspense
            fallback={<div className="text-center">{labels.loadingText}</div>}
          >
            {year === TOTAL_FILTER_KEY ? (
              <SVGStat />
            ) : (
              <RunTable
                runs={runs}
                locateActivity={locateActivity}
                setActivity={setActivity}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />
            )}
          </Suspense>
        </div>
      </div>
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
