import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';

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
            value={period}
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
