import { Asset } from '@baseline/types/asset';
import { getDynamodbConnection } from '@baselinejs/dynamodb';
import { ServiceObject } from '../../util/service-object';

const dynamoDb = getDynamodbConnection({
  region: `${process.env.API_REGION}`,
});

export const assetService = new ServiceObject<Asset>({
  dynamoDb: dynamoDb,
  objectName: 'Asset',
  table: `${process.env.APP_NAME}-${process.env.NODE_ENV}-asset`,
  primaryKey: 'assetId',
});
