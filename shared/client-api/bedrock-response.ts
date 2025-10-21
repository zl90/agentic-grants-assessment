import { BedrockResponse } from '@baseline/types/bedrock-response';
import { RequestHandler } from './request-handler';

export const getBedrockResponse = async (requestHandler: RequestHandler, bedrockResponseId: string): Promise<BedrockResponse> => {
  const response = await requestHandler.request<BedrockResponse>({
    method: 'GET',
    url: `bedrock-response/${bedrockResponseId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const getBedrockResponseForAsset = async (requestHandler: RequestHandler, assetId: string): Promise<BedrockResponse> => {
  const response = await requestHandler.request<BedrockResponse>({
    method: 'GET',
    url: `bedrock-response/asset/${assetId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const deleteBedrockResponse = async (requestHandler: RequestHandler, bedrockResponseId: string): Promise<boolean> => {
  const response = await requestHandler.request<boolean>({
    method: 'DELETE',
    url: `bedrock-response/${bedrockResponseId}`,
    hasAuthentication: true,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const createBedrockResponse = async (
  requestHandler: RequestHandler,
  bedrockResponse: Partial<BedrockResponse>,
): Promise<BedrockResponse> => {
  const response = await requestHandler.request<BedrockResponse>({
    method: 'POST',
    url: `bedrock-response`,
    hasAuthentication: true,
    data: bedrockResponse,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};

export const updateBedrockResponse = async (
  requestHandler: RequestHandler,
  bedrockResponse: Partial<BedrockResponse>,
): Promise<BedrockResponse> => {
  const response = await requestHandler.request<BedrockResponse>({
    method: 'PATCH',
    url: `bedrock-response`,
    hasAuthentication: true,
    data: bedrockResponse,
  });
  if ('data' in response) {
    return response.data;
  }
  throw response;
};
