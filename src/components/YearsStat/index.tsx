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

  // Memoize the years array calculation
  const yearsArrayUpdate = useMemo(() => {
    // make sure the year click on front
    let updatedYears = runningYears.slice();
    updatedYears.push(TOTAL_FILTER_KEY);
    updatedYears = updatedYears.filter((x) => x !== year);
    updatedYears.unshift(year);
    return updatedYears;
  }, [runningYears, year]);

  // for short solution need to refactor
  return (
    <div className="w-full pb-16 pr-16 lg:w-full lg:pr-16">
      <hr />
      {yearsArrayUpdate.map((yearItem) => (
        <div key={yearItem} data-stat-year={yearItem}>
          <YearStat year={yearItem} onClick={onClick} />
        </div>
      ))}
    </div>
  );
};

export default YearsStat;
