import { TextractAsset } from '@baseline/types/textract-asset';
import { getDynamodbConnection, queryItems } from '@baselinejs/dynamodb';
import { ServiceObject } from '../../util/service-object';
import { getErrorMessage } from '../../util/error-message';

const dynamoDb = getDynamodbConnection({
  region: `${process.env.API_REGION}`,
});

export const textractAssetService = new ServiceObject<TextractAsset>({
  dynamoDb: dynamoDb,
  objectName: 'TextractAsset',
  table: `${process.env.APP_NAME}-${process.env.NODE_ENV}-textract-asset`,
  primaryKey: 'textractAssetId',
});

export const getTextractAssetByAssetId = async (assetId: string) => {
  try {
    return await queryItems<TextractAsset>({
      dynamoDb: dynamoDb,
      table: textractAssetService.table,
      indexName: 'assetId-index',
      keyName: 'assetId',
      keyValue: assetId,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to get textract asset by asset id: ${message}`);
    throw new Error(message);
  }
};