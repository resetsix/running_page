import {
  NAV_SUMMARY_LABEL,
  SITE_DESCRIPTION,
} from '@/utils/const';
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

const data: ISiteMetadataResult = {
  siteTitle: 'Resetsix Running',
  siteUrl: '/',
  logo: getSiteAssetPath('images/favicon.png'),
  description: SITE_DESCRIPTION,
  navLinks: [
    {
      name: NAV_SUMMARY_LABEL,
      url: getSiteAssetPath('summary'),
    },
  ],
};

export default data;
