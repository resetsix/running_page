import { useMemo } from 'react';
import rawActivities from '@/static/activities.json';
import {
  Activity,
  locationForRun,
  normalizeActivitySportType,
  titleKeyForRun,
} from '@/utils/utils';
import { COUNTRY_STANDARDIZATION } from '@/static/city';
import { filterVisibleActivities } from '@/utils/activityVisibility';

const visibleActivities = filterVisibleActivities(rawActivities as Activity[]);
const runningActivities = visibleActivities.filter(
  (activity) => normalizeActivitySportType(activity.type) === 'running'
);

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }
  return country;
};

const useActivities = () => {
  const activities = visibleActivities;
  const runs = runningActivities;

  const processedData = useMemo(() => {
    const cities: Record<string, number> = {};
    const runPeriod: Record<string, number> = {};
    const provinces: Set<string> = new Set();
    const countries: Set<string> = new Set();
    const runningYears: Set<string> = new Set();
    const allProvinces: Set<string> = new Set();
    const allCountries: Set<string> = new Set();
    const allYears: Set<string> = new Set();

    activities.forEach((run) => {
      const location = locationForRun(run);
      const { province, country } = location;

      if (province) allProvinces.add(province);
      if (country) allCountries.add(standardizeCountryName(country));
      allYears.add(run.start_date_local.slice(0, 4));
    });

    runs.forEach((run) => {
      const location = locationForRun(run);

      const periodKey = titleKeyForRun(run);
      if (periodKey) {
        runPeriod[periodKey] = runPeriod[periodKey]
          ? runPeriod[periodKey] + 1
          : 1;
      }

      const { city, province, country } = location;
      // drop only one char city
      if (city.length > 1) {
        cities[city] = cities[city]
          ? cities[city] + run.distance
          : run.distance;
      }
      if (province) provinces.add(province);
      if (country) countries.add(standardizeCountryName(country));
      const year = run.start_date_local.slice(0, 4);
      runningYears.add(year);
    });

    const runningYearsArray = [...runningYears].sort().reverse();
    const allYearsArray = [...allYears].sort().reverse();
    const thisYear = allYearsArray[0] || '';

    return {
      activities,
      runningActivities: runs,
      allYears: allYearsArray,
      runningYears: runningYearsArray,
      allCountries: [...allCountries],
      allProvinces: [...allProvinces],
      countries: [...countries],
      provinces: [...provinces],
      cities,
      runPeriod,
      thisYear,
    };
  }, [activities, runs]);

  return processedData;
};

export default useActivities;
