import { Response } from 'express';
import { bedrockResponseMapper } from './bedrock-response';
import { isAdmin } from '../../middleware/is-admin';
import { RequestContext } from '../../util/request-context.type';
import { BedrockResponse } from '@baseline/types/bedrock-response';
import { getErrorMessage } from '../../util/error-message';
import createApp from '../../util/express-app';
import createAuthenticatedHandler from '../../util/create-authenticated-handler';
import { bedrockResponseService, getBedrockResponseByAssetId } from './bedrock-response.service';

const app = createApp();
export const handler = createAuthenticatedHandler(app);

app.post('/bedrock-response', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const { assetId, jobId, decision, reason, weaknesses, strengths, status } = req.body as BedrockResponse;
      const bedrockResponseData: Partial<BedrockResponse> = {
        assetId, jobId, decision, reason, weaknesses, strengths, status,
      };
      const bedrockResponse = await bedrockResponseService.create(bedrockResponseData);
      res.json(bedrockResponseMapper(bedrockResponse));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to create bedrock response ${message}`);
      res.status(400).json({ error: 'Failed to create bedrock response' });
    }
  },
]);

app.patch('/bedrock-response', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const { bedrockResponseId, assetId, jobId, decision, reason, weaknesses, strengths, status } = req.body as BedrockResponse;
      const bedrockResponseData: Partial<BedrockResponse> = {
        bedrockResponseId, assetId, jobId, decision, reason, weaknesses, strengths, status,
      };
      const bedrockResponse = await bedrockResponseService.update(bedrockResponseData);
      res.json(bedrockResponseMapper(bedrockResponse));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to update bedrock response: ${message}`);
      res.status(400).json({
        error: 'Failed to update bedrock response',
      });
    }
  },
]);

app.delete('/bedrock-response/:bedrockResponseId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const bedrockResponseId = req.params.bedrockResponseId;
      await bedrockResponseService.delete(bedrockResponseId);
      res.status(200);
      res.send();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to delete bedrock response: ${message}`);
      res.status(400).json({
        error: 'Failed to delete bedrock response',
      });
    }
  },
]);

app.get('/bedrock-response/list', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const bedrockResponses = await bedrockResponseService.getAll();
      const formattedBedrockResponses = bedrockResponses.map(bedrockResponseMapper);
      res.json(formattedBedrockResponses);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get bedrock responses: ${message}`);
      res.status(400).json({
        error: 'Failed to get bedrock responses',
      });
    }
  },
]);

app.get('/bedrock-response/asset/:assetId', [
  isAdmin,
  async (req: RequestContext, res: Response) => {
    try {
      const assetId = req.params.assetId;
      const bedrockResponse = await getBedrockResponseByAssetId(assetId);
      if (!bedrockResponse || bedrockResponse.length === 0) {
        res.status(404).json({
          error: 'No bedrock response found for asset',
        });
        return;
      }
      res.json(bedrockResponseMapper(bedrockResponse[0]));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`Failed to get bedrock response: ${message}`);
      res.status(400).json({
        error: 'Failed to get bedrock response',
      });
    }
  },
]);
