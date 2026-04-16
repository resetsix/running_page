import hiddenActivityDates from '@/static/hidden-activity-dates.json';
import type { Activity } from '@/utils/utils';

const hiddenActivityDateSet = new Set(
  hiddenActivityDates.map((date) => date.trim()).filter(Boolean)
);

const getActivityLocalDate = (activity: Pick<Activity, 'start_date_local'>) =>
  activity.start_date_local.slice(0, 10);

const isActivityHiddenByDate = (activity: Pick<Activity, 'start_date_local'>) =>
  hiddenActivityDateSet.has(getActivityLocalDate(activity));

const filterVisibleActivities = (activities: Activity[]): Activity[] =>
  activities.filter((activity) => !isActivityHiddenByDate(activity));

export {
  filterVisibleActivities,
  getActivityLocalDate,
  isActivityHiddenByDate,
};
