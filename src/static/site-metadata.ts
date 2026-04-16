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

const data: ISiteMetadataResult = {
  siteTitle: 'Resetsix Running',
  siteUrl: '/',
  logo: `${getBasePath()}/images/favicon.png`,
  description: 'Personal running page powered by Keep sync and Netlify.',
  navLinks: [
    {
      name: 'Summary',
      url: `${getBasePath()}/summary`,
    },
    {
      name: 'Source',
      url: 'https://github.com/resetsix/running_page',
    },
    {
      name: 'Setup',
      url: 'https://github.com/resetsix/running_page',
    },
  ],
};

export default data;
