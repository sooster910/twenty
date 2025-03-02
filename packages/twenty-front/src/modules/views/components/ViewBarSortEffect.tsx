import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';

import { useSortDropdown } from '@/object-record/object-sort-dropdown/hooks/useSortDropdown';
import { Sort } from '@/object-record/object-sort-dropdown/types/Sort';
import { useViewScopedStates } from '@/views/hooks/internal/useViewScopedStates';
import { isNonNullable } from '~/utils/isNonNullable';

type ViewBarSortEffectProps = {
  sortDropdownId: string;
  onSortSelect?: ((sort: Sort) => void) | undefined;
};

export const ViewBarSortEffect = ({
  sortDropdownId,
  onSortSelect,
}: ViewBarSortEffectProps) => {
  const { availableSortDefinitionsState } = useViewScopedStates();

  const availableSortDefinitions = useRecoilValue(
    availableSortDefinitionsState,
  );

  const { setAvailableSortDefinitions, setOnSortSelect } = useSortDropdown({
    sortDropdownId,
  });

  useEffect(() => {
    if (isNonNullable(availableSortDefinitions)) {
      setAvailableSortDefinitions(availableSortDefinitions);
    }
    if (isNonNullable(onSortSelect)) {
      setOnSortSelect(() => onSortSelect);
    }
  }, [
    availableSortDefinitions,
    onSortSelect,
    setAvailableSortDefinitions,
    setOnSortSelect,
  ]);

  return <></>;
};
