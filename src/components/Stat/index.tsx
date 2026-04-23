import type { ReactNode } from 'react';

import { intComma } from '@/utils/utils';

interface IStatProperties {
  value: string | number;
  description: string;
  aside?: ReactNode;
  className?: string;
  citySize?: number;
  onClick?: () => void;
}

const Stat = ({
  value,
  description,
  aside,
  className = 'pb-2 w-full',
  citySize,
  onClick,
}: IStatProperties) => {
  const content = (
    <>
      <span className={`text-${citySize || 5}xl font-bold italic`}>
        {intComma(value.toString())}
      </span>
      <span className="text-lg font-semibold italic">{description}</span>
    </>
  );

  if (!aside) {
    return (
      <div className={`${className}`} onClick={onClick}>
        {content}
      </div>
    );
  }

  return (
    <div className={`${className}`} onClick={onClick}>
      <div className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className="min-w-0">{content}</div>
        <span className="ml-auto shrink-0 whitespace-nowrap text-base font-semibold italic opacity-60">
          {aside}
        </span>
      </div>
    </div>
  );
};

export default Stat;
