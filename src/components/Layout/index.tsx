import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { HTML_LANG, META_KEYWORDS } from '@/utils/const';

const Layout = ({ children }: React.PropsWithChildren) => {
  const { siteTitle, description } = useSiteMetadata();

  return (
    <>
      <Helmet>
        <html lang={HTML_LANG} />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={META_KEYWORDS} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Helmet>
      <Header />
      <div className="mx-auto mb-16 max-w-screen-2xl p-4 lg:flex lg:p-16">
        {children}
      </div>
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
