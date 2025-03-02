import { createContext } from 'react';

import { SpreadsheetOptions } from '@/spreadsheet-import/types';
import { isNullable } from '~/utils/isNullable';

export const RsiContext = createContext({} as any);

type ProvidersProps<T extends string> = {
  children: React.ReactNode;
  values: SpreadsheetOptions<T>;
};

export const Providers = <T extends string>({
  children,
  values,
}: ProvidersProps<T>) => {
  if (isNullable(values.fields)) {
    throw new Error('Fields must be provided to spreadsheet-import');
  }

  return <RsiContext.Provider value={values}>{children}</RsiContext.Provider>;
};
