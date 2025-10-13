import { Asset } from '@baseline/types/asset';
import { getDynamodbConnection, queryItems } from '@baselinejs/dynamodb';
import { ServiceObject } from '../../util/service-object';
import { getErrorMessage } from '../../util/error-message';

const dynamoDb = getDynamodbConnection({
  region: `${process.env.API_REGION}`,
});

export const assetService = new ServiceObject<Asset>({
  dynamoDb: dynamoDb,
  objectName: 'Asset',
  table: `${process.env.APP_NAME}-${process.env.NODE_ENV}-asset`,
  primaryKey: 'assetId',
});

export const getAssetByS3Key = async (s3Key: string) => {
  try {
    return await queryItems<Asset>({
      dynamoDb: dynamoDb,
      table: assetService.table,
      indexName: 's3Key-index',
      keyName: 's3Key',
      keyValue: s3Key,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to get asset by s3Key: ${message}`);
    throw new Error(message);
  }
};
