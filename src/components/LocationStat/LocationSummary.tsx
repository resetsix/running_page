import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import useLabels from '@/hooks/useLabels';

// only support China for now
const LocationSummary = () => {
  const labels = useLabels();
  const { years, countries, provinces, cities } = useActivities();
  return (
    <div className="cursor-pointer">
      <section>
        {years ? (
          <Stat
            value={`${years.length}`}
            description={labels.locationSummaryYearsLabel}
          />
        ) : null}
        {countries ? (
          <Stat
            value={countries.length}
            description={labels.locationSummaryCountriesLabel}
          />
        ) : null}
        {provinces ? (
          <Stat
            value={provinces.length}
            description={labels.locationSummaryProvincesLabel}
          />
        ) : null}
        {cities ? (
          <Stat
            value={Object.keys(cities).length}
            description={labels.locationSummaryCitiesLabel}
          />
        ) : null}
      </section>
      <hr />
    </div>
  );
};

export default LocationSummary;
