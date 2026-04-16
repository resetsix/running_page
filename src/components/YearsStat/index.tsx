import { useMemo } from 'react';
import YearStat from '@/components/YearStat';
import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';
import { TOTAL_FILTER_KEY } from '@/utils/const';

const YearsStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  const labels = useLabels();
  const { runningYears } = useActivities();

  // Memoize the years array calculation
  const yearsArrayUpdate = useMemo(() => {
    // make sure the year click on front
    let updatedYears = runningYears.slice();
    updatedYears.push(TOTAL_FILTER_KEY);
    updatedYears = updatedYears.filter((x) => x !== year);
    updatedYears.unshift(year);
    return updatedYears;
  }, [runningYears, year]);

  const infoMessage = useMemo(() => {
    return labels.infoMessage(runningYears.length, year);
  }, [labels, runningYears.length, year]);

  // for short solution need to refactor
  return (
    <div className="w-full pb-16 pr-16 lg:w-full lg:pr-16">
      <section className="pb-0">
        <p className="leading-relaxed">
          {infoMessage}
          <br />
        </p>
      </section>
      <hr />
      {yearsArrayUpdate.map((yearItem) => (
        <YearStat key={yearItem} year={yearItem} onClick={onClick} />
      ))}
    </div>
  );
};

export default YearsStat;
