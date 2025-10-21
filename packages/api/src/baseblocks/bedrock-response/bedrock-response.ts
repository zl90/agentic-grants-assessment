import { BedrockResponse } from '@baseline/types/bedrock-response';

export const bedrockResponseMapper = (data: BedrockResponse): BedrockResponse => {
  const bedrockResponse: BedrockResponse = {
    bedrockResponseId: data?.bedrockResponseId,
    assetId: data?.assetId,
    jobId: data?.jobId,
    decision: data?.decision,
    reason: data?.reason,
    weaknesses: data?.weaknesses,
    strengths: data?.strengths,
    status: data?.status,
  };
  return bedrockResponse;
};