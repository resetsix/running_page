import useActivities from '@/hooks/useActivities';
import { TOTAL_FILTER_KEY, TOTAL_LABEL } from '@/utils/const';
import styles from './style.module.css';

const RunMapButtons = ({
  changeYear,
  thisYear,
}: {
  changeYear: (_year: string) => void;
  thisYear: string;
}) => {
  const { years } = useActivities();
  const yearsButtons = years.slice();
  yearsButtons.push(TOTAL_FILTER_KEY);

  return (
    <ul className={styles.buttons}>
      {yearsButtons.map((year) => (
        <li
          key={`${year}button`}
          className={
            styles.button + ` ${year === thisYear ? styles.selected : ''}`
          }
          onClick={() => {
            changeYear(year);
          }}
        >
          {year === TOTAL_FILTER_KEY ? TOTAL_LABEL : year}
        </li>
      ))}
    </ul>
  );
};

export default RunMapButtons;
