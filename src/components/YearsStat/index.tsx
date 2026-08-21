import { useMemo } from 'react';
import YearStat from '@/components/YearStat';
import useActivities from '@/hooks/useActivities';
import { TOTAL_FILTER_KEY } from '@/utils/const';

const YearsStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  const { runningYears } = useActivities();

  const yearsArrayUpdate = useMemo(() => {
    const yearsWithRuns = [...runningYears, TOTAL_FILTER_KEY];
    if (!yearsWithRuns.includes(year)) return yearsWithRuns;

    return [year, ...yearsWithRuns.filter((item) => item !== year)];
  }, [runningYears, year]);

  return (
    <div className="w-full pb-16 pr-16 lg:w-full lg:pr-16">
      <hr data-year-list-boundary />
      {yearsArrayUpdate.map((yearItem) => (
        <div key={yearItem} data-stat-year={yearItem}>
          <YearStat year={yearItem} onClick={onClick} />
        </div>
      ))}
    </div>
  );
};

export default YearsStat;
