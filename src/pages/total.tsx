import ActivityList from '@/components/ActivityList';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';
import { HTML_LANG } from '@/utils/const';

const HomePage = () => {
  // Use the theme hook to get the current theme
  const { theme } = useTheme();

  // Apply theme changes to the document when theme changes
  useEffect(() => {
    const htmlElement = document.documentElement;
    // Set explicit theme attribute
    htmlElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Helmet>
        {/* Set HTML attributes including theme */}
        <html lang={HTML_LANG} data-theme={theme} />
      </Helmet>
      <ActivityList />
    </>
  );
};

export default HomePage;
