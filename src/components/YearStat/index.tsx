import { lazy, Suspense, useMemo } from 'react';
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

const YearStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  let { runningActivities: runs, runningYears } = useActivities();
  const { language } = useLanguage();
  const labels = useLabels();
  // for hover
  const [hovered, eventHandlers] = useHover();
  // lazy Component
  const YearSVG = useMemo(
    () => lazy(() => loadSvgComponent(yearStats, `./year_${year}.svg`)),
    [year]
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

  if (runningYears.includes(year)) {
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
  return (
    <div className="cursor-pointer" onClick={() => onClick(year)}>
      <section {...eventHandlers}>
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
      {year !== TOTAL_FILTER_KEY && hovered && (
        <Suspense fallback={labels.loadingText}>
          <YearSVG className="year-svg my-4 h-4/6 w-4/6 border-0 p-0" />
          <GithubYearSVG className="github-year-svg my-4 h-auto w-full border-0 p-0" />
        </Suspense>
      )}
      <hr />
    </div>
  );
};

export default YearStat;
