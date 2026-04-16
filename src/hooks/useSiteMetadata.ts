import { useMemo } from 'react';
import useLabels from '@/hooks/useLabels';

interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const getBasePath = () => {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === '/' ? '' : baseUrl;
};

const useSiteMetadata = (): ISiteMetadataResult => {
  const labels = useLabels();

  return useMemo(
    () => ({
      siteTitle: 'Resetsix Running',
      siteUrl: '/',
      logo: `${getBasePath()}/images/favicon.png`,
      description: labels.siteDescription,
      navLinks: [
        {
          name: labels.navSummaryLabel,
          url: `${getBasePath()}/summary`,
        },
      ],
    }),
    [labels.navSummaryLabel, labels.siteDescription]
  );
};

export default useSiteMetadata;
