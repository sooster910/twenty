import { Injectable, Logger } from '@nestjs/common';

import { EntityManager } from 'typeorm';

import { WorkspaceSyncContext } from 'src/workspace/workspace-sync-metadata/interfaces/workspace-sync-context.interface';
import { ComparatorAction } from 'src/workspace/workspace-sync-metadata/interfaces/comparator.interface';
import { FeatureFlagMap } from 'src/core/feature-flag/interfaces/feature-flag-map.interface';
import { WorkspaceMigrationBuilderAction } from 'src/workspace/workspace-migration-builder/interfaces/workspace-migration-builder-action.interface';

import { ObjectMetadataEntity } from 'src/metadata/object-metadata/object-metadata.entity';
import { mapObjectMetadataByUniqueIdentifier } from 'src/workspace/workspace-sync-metadata/utils/sync-metadata.util';
import { WorkspaceMigrationEntity } from 'src/metadata/workspace-migration/workspace-migration.entity';
import { StandardObjectFactory } from 'src/workspace/workspace-sync-metadata/factories/standard-object.factory';
import { WorkspaceObjectComparator } from 'src/workspace/workspace-sync-metadata/comparators/workspace-object.comparator';
import { WorkspaceFieldComparator } from 'src/workspace/workspace-sync-metadata/comparators/workspace-field.comparator';
import { WorkspaceMetadataUpdaterService } from 'src/workspace/workspace-sync-metadata/services/workspace-metadata-updater.service';
import { WorkspaceSyncStorage } from 'src/workspace/workspace-sync-metadata/storage/workspace-sync.storage';
import { WorkspaceMigrationObjectFactory } from 'src/workspace/workspace-migration-builder/factories/workspace-migration-object.factory';
import { computeStandardObject } from 'src/workspace/workspace-sync-metadata/utils/compute-standard-object.util';
import { standardObjectMetadataDefinitions } from 'src/workspace/workspace-sync-metadata/standard-objects';

@Injectable()
export class WorkspaceSyncObjectMetadataService {
  private readonly logger = new Logger(WorkspaceSyncObjectMetadataService.name);

  constructor(
    private readonly standardObjectFactory: StandardObjectFactory,
    private readonly workspaceObjectComparator: WorkspaceObjectComparator,
    private readonly workspaceFieldComparator: WorkspaceFieldComparator,
    private readonly workspaceMetadataUpdaterService: WorkspaceMetadataUpdaterService,
    private readonly workspaceMigrationObjectFactory: WorkspaceMigrationObjectFactory,
  ) {}

  async synchronize(
    context: WorkspaceSyncContext,
    manager: EntityManager,
    storage: WorkspaceSyncStorage,
    workspaceFeatureFlagsMap: FeatureFlagMap,
  ): Promise<Partial<WorkspaceMigrationEntity>[]> {
    const objectMetadataRepository =
      manager.getRepository(ObjectMetadataEntity);

    // Retrieve object metadata collection from DB
    const originalObjectMetadataCollection =
      await objectMetadataRepository.find({
        where: {
          workspaceId: context.workspaceId,
          fields: { isCustom: false },
        },
        relations: ['dataSource', 'fields'],
      });
    const customObjectMetadataCollection =
      originalObjectMetadataCollection.filter(
        (objectMetadata) => objectMetadata.isCustom,
      );

    // Create standard object metadata collection
    const standardObjectMetadataCollection = this.standardObjectFactory.create(
      standardObjectMetadataDefinitions,
      context,
      workspaceFeatureFlagsMap,
    );

    // Create map of original and standard object metadata by unique identifier
    const originalObjectMetadataMap = mapObjectMetadataByUniqueIdentifier(
      originalObjectMetadataCollection,
    );
    const standardObjectMetadataMap = mapObjectMetadataByUniqueIdentifier(
      standardObjectMetadataCollection,
    );

    this.logger.log('Comparing standard objects and fields metadata');

    // Store object that need to be deleted
    for (const originalObjectMetadata of originalObjectMetadataCollection.filter(
      (object) => !object.isCustom,
    )) {
      if (!standardObjectMetadataMap[originalObjectMetadata.nameSingular]) {
        storage.addDeleteObjectMetadata(originalObjectMetadata);
      }
    }

    // Loop over all standard objects and compare them with the objects in DB
    for (const standardObjectName in standardObjectMetadataMap) {
      const originalObjectMetadata =
        originalObjectMetadataMap[standardObjectName];
      const standardObjectMetadata = computeStandardObject(
        standardObjectMetadataMap[standardObjectName],
        originalObjectMetadata,
        customObjectMetadataCollection,
      );

      /**
       * COMPARE OBJECT METADATA
       */
      const objectComparatorResult = this.workspaceObjectComparator.compare(
        originalObjectMetadata,
        standardObjectMetadata,
      );

      if (objectComparatorResult.action === ComparatorAction.CREATE) {
        storage.addCreateObjectMetadata(standardObjectMetadata);
        continue;
      }

      if (objectComparatorResult.action === ComparatorAction.UPDATE) {
        storage.addUpdateObjectMetadata(objectComparatorResult.object);
      }

      /**
       * COMPARE FIELD METADATA
       */
      const fieldComparatorResults = this.workspaceFieldComparator.compare(
        originalObjectMetadata,
        standardObjectMetadata,
      );

      for (const fieldComparatorResult of fieldComparatorResults) {
        switch (fieldComparatorResult.action) {
          case ComparatorAction.CREATE: {
            storage.addCreateFieldMetadata(fieldComparatorResult.object);
            break;
          }
          case ComparatorAction.UPDATE: {
            storage.addUpdateFieldMetadata(fieldComparatorResult.object);
            break;
          }
          case ComparatorAction.DELETE: {
            storage.addDeleteFieldMetadata(fieldComparatorResult.object);
            break;
          }
        }
      }
    }

    this.logger.log('Updating workspace metadata');

    // Apply changes to DB
    const metadataObjectUpdaterResult =
      await this.workspaceMetadataUpdaterService.updateObjectMetadata(
        manager,
        storage,
      );

    this.logger.log('Generating migrations');

    // Create migrations
    const createObjectWorkspaceMigrations =
      await this.workspaceMigrationObjectFactory.create(
        metadataObjectUpdaterResult.createdObjectMetadataCollection,
        WorkspaceMigrationBuilderAction.CREATE,
      );

    const deleteObjectWorkspaceMigrations =
      await this.workspaceMigrationObjectFactory.create(
        storage.objectMetadataDeleteCollection,
        WorkspaceMigrationBuilderAction.DELETE,
      );

    this.logger.log('Saving migrations');

    return [
      ...createObjectWorkspaceMigrations,
      ...deleteObjectWorkspaceMigrations,
    ];
  }
}
