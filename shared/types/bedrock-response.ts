export interface BedrockResponse {
  bedrockResponseId: string;
  assetId: string;
  jobId: string;
  decision: BedrockResponseDecision;
  reason: string;
  weaknesses: string;
  strengths: string;
  status: BedrockResponseStatus;
}

export type BedrockResponseDecision = 'APPROVE' | 'DENY' | 'ESCALATE' | 'ERROR';
export type BedrockResponseStatus = 'PENDING' | 'COMPLETED' | 'FAILED';