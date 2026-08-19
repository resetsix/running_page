import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';
import { TOTAL_FILTER_KEY } from '@/utils/const';
import styles from './style.module.css';

const RunMapButtons = ({
  changeYear,
  thisYear,
}: {
  changeYear: (_year: string) => void;
  thisYear: string;
}) => {
  const labels = useLabels();
  const { allYears } = useActivities();
  const yearsButtons = allYears.slice();
  yearsButtons.push(TOTAL_FILTER_KEY);

  return (
    <div className={styles.yearToolbar}>
      <ul className={styles.buttons}>
        {yearsButtons.map((year) => (
          <li
            key={`${year}button`}
            className={
              styles.button + ` ${year === thisYear ? styles.selected : ''}`
            }
            onPointerDown={(event) => {
              if (event.button === 0) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerUp={(event) => {
              if (event.button !== 0) return;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              changeYear(year);
            }}
          >
            {year === TOTAL_FILTER_KEY ? labels.totalLabel : year}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RunMapButtons;
