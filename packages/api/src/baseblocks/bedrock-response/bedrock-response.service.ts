import { BedrockResponse } from '@baseline/types/bedrock-response';
import { getDynamodbConnection, queryItems } from '@baselinejs/dynamodb';
import { ServiceObject } from '../../util/service-object';
import { getErrorMessage } from '../../util/error-message';

const dynamoDb = getDynamodbConnection({
  region: `${process.env.API_REGION}`,
});

export const bedrockResponseService = new ServiceObject<BedrockResponse>({
  dynamoDb: dynamoDb,
  objectName: 'BedrockResponse',
  table: `${process.env.APP_NAME}-${process.env.NODE_ENV}-bedrock-response`,
  primaryKey: 'bedrockResponseId',
});


export const getBedrockResponseByAssetId = async (assetId: string) => {
  try {
    return await queryItems<BedrockResponse>({
      dynamoDb: dynamoDb,
      table: bedrockResponseService.table,
      indexName: 'assetId-index',
      keyName: 'assetId',
      keyValue: assetId,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`Failed to get bedrock response by assetId: ${message}`);
    throw new Error(message);
  }
};