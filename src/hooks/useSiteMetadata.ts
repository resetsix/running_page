import { useMemo } from 'react';
import useLabels from '@/hooks/useLabels';
import { getSiteAssetPath } from '@/utils/sitePaths';

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

const useSiteMetadata = (): ISiteMetadataResult => {
  const labels = useLabels();

  return useMemo(
    () => ({
      siteTitle: '未有期 Running',
      siteUrl: '/',
      logo: getSiteAssetPath('images/favicon.png'),
      description: labels.siteDescription,
      navLinks: [
        {
          name: labels.navSummaryLabel,
          url: getSiteAssetPath('summary'),
        },
      ],
    }),
    [labels.navSummaryLabel, labels.siteDescription]
  );
};

export default useSiteMetadata;
