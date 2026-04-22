import YearStat from '@/components/YearStat';
import useLabels from '@/hooks/useLabels';
import { TOTAL_FILTER_KEY } from '@/utils/const';
import CitiesStat from './CitiesStat';
import LocationSummary from './LocationSummary';
import PeriodStat from './PeriodStat';

interface ILocationStatProps {
  changeYear: (_year: string) => void;
  changeCity: (_city: string) => void;
  changeTitle: (_title: string) => void;
}

const LocationStat = ({
  changeYear,
  changeCity,
  changeTitle,
}: ILocationStatProps) => {
  const labels = useLabels();

  return (
    <div className="w-full pb-16 lg:w-full lg:pr-16">
      <section className="pb-0">
        <p className="leading-relaxed">
          {labels.locationInfoMessages[0]}
          <br />
          {labels.locationInfoMessages[1]}
          <br />
          <br />
          {labels.locationInfoMessages[2]}
        </p>
      </section>
      <hr />
      <LocationSummary />
      <CitiesStat onClick={changeCity} />
      <PeriodStat onClick={changeTitle} />
      <YearStat year={TOTAL_FILTER_KEY} onClick={changeYear} />
    </div>
  );
};

export default LocationStat;
