import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';
import { getLocalizedRunTitle } from '@/utils/utils';

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
