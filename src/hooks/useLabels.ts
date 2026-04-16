import { useMemo } from 'react';
import { getUIText } from '@/utils/const';
import { useLanguage } from '@/hooks/useLanguage';

export const useLabels = () => {
  const { language } = useLanguage();

  return useMemo(() => getUIText(language), [language]);
};

export default useLabels;
