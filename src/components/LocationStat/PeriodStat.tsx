import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';
import { getLocalizedRunTitle } from '@/utils/utils';

const PERIOD_TIME_RANGES: Record<string, string> = {
  late_night_run: '00:00-04:59',
  morning_run: '05:00-08:59',
  forenoon_run: '09:00-10:59',
  midday_run: '11:00-13:59',
  afternoon_run: '14:00-17:59',
  evening_run: '18:00-19:59',
  night_run: '20:00-23:59',
};

const PeriodStat = ({ onClick }: { onClick: (_period: string) => void }) => {
  const labels = useLabels();
  const { runPeriod } = useActivities();

  const periodArr = Object.entries(runPeriod);
  periodArr.sort((a, b) => b[1] - a[1]);
  return (
    <div className="cursor-pointer">
      <section>
        {periodArr.map(([period, times]) => (
          <Stat
            key={period}
            value={getLocalizedRunTitle(period, labels)}
            description={` ${times} ${labels.runOccurrencesLabel}`}
            aside={PERIOD_TIME_RANGES[period]}
            citySize={3}
            onClick={() => onClick(period)}
          />
        ))}
      </section>
      <hr />
    </div>
  );
};

export default PeriodStat;
