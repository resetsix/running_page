import React, { useState, useMemo, useCallback } from 'react';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';
import {
  SHOW_ELEVATION_GAIN,
  TABLE_DATE_LABEL,
  TABLE_ELEVATION_LABEL,
  TABLE_PACE_LABEL,
  TABLE_TIME_LABEL,
} from '@/utils/const';
import { DIST_UNIT } from '@/utils/utils';

import RunRow from './RunRow';
import styles from './style.module.css';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;
type SortKey = 'distance' | 'elevation' | 'pace' | 'bpm' | 'time' | 'date';

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  const [sortFuncInfo, setSortFuncInfo] = useState<SortKey | ''>('');

  // Memoize sort functions to prevent recreating them on every render
  const sortFunctions = useMemo(() => {
    const sortKMFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'distance'
        ? a.distance - b.distance
        : b.distance - a.distance;
    const sortElevationGainFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'elevation'
        ? (a.elevation_gain ?? 0) - (b.elevation_gain ?? 0)
        : (b.elevation_gain ?? 0) - (a.elevation_gain ?? 0);
    const sortPaceFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'pace'
        ? a.average_speed - b.average_speed
        : b.average_speed - a.average_speed;
    const sortBPMFunc: SortFunc = (a, b) => {
      return sortFuncInfo === 'bpm'
        ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
        : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
    };
    const sortRunTimeFunc: SortFunc = (a, b) => {
      const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
      const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
      return sortFuncInfo === 'time'
        ? aTotalSeconds - bTotalSeconds
        : bTotalSeconds - aTotalSeconds;
    };
    const sortDateFuncClick =
      sortFuncInfo === 'date' ? sortDateFunc : sortDateFuncReverse;

    const sortFuncMap = new Map<SortKey, SortFunc>([
      ['distance', sortKMFunc],
      ['elevation', sortElevationGainFunc],
      ['pace', sortPaceFunc],
      ['bpm', sortBPMFunc],
      ['time', sortRunTimeFunc],
      ['date', sortDateFuncClick],
    ]);

    if (!SHOW_ELEVATION_GAIN) {
      sortFuncMap.delete('elevation');
    }

    return sortFuncMap;
  }, [sortFuncInfo]);

  const sortColumns = useMemo(
    () =>
      [
        { key: 'distance', label: DIST_UNIT },
        { key: 'elevation', label: TABLE_ELEVATION_LABEL },
        { key: 'pace', label: TABLE_PACE_LABEL },
        { key: 'bpm', label: 'BPM' },
        { key: 'time', label: TABLE_TIME_LABEL },
        { key: 'date', label: TABLE_DATE_LABEL },
      ].filter(
        (column) => SHOW_ELEVATION_GAIN || column.key !== 'elevation'
      ) as Array<{ key: SortKey; label: string }>,
    []
  );

  const handleSort = useCallback(
    (sortKey: SortKey) => {
      const f = sortFunctions.get(sortKey);
      if (!f) {
        return;
      }
      setRunIndex(-1);
      setSortFuncInfo(sortFuncInfo === sortKey ? '' : sortKey);
      setActivity(runs.sort(f));
    },
    [sortFunctions, sortFuncInfo, runs, setRunIndex, setActivity]
  );

  return (
    <div className={styles.tableContainer}>
      <table className={styles.runTable} cellSpacing="0" cellPadding="0">
        <thead>
          <tr>
            <th />
            {sortColumns.map((column) => (
              <th key={column.key} onClick={() => handleSort(column.key)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, elementIndex) => (
            <RunRow
              key={run.run_id}
              elementIndex={elementIndex}
              locateActivity={locateActivity}
              run={run}
              runIndex={runIndex}
              setRunIndex={setRunIndex}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunTable;
