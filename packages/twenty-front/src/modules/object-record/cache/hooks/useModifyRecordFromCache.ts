import { useApolloClient } from '@apollo/client';
import { Modifiers } from '@apollo/client/cache';

import { ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import { ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isNullable } from '~/utils/isNullable';
import { capitalize } from '~/utils/string/capitalize';

export const useModifyRecordFromCache = ({
  objectMetadataItem,
}: {
  objectMetadataItem: ObjectMetadataItem;
}) => {
  const { cache } = useApolloClient();

  return <CachedObjectRecord extends ObjectRecord = ObjectRecord>(
    recordId: string,
    fieldModifiers: Modifiers<CachedObjectRecord>,
  ) => {
    if (isNullable(objectMetadataItem)) return;

    const cachedRecordId = cache.identify({
      __typename: capitalize(objectMetadataItem.nameSingular),
      id: recordId,
    });

    cache.modify<CachedObjectRecord>({
      id: cachedRecordId,
      fields: fieldModifiers,
    });
  };
};
