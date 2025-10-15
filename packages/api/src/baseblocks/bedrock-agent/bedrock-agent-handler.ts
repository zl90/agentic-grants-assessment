import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { setupBedrockAgent } from './bedrock-agent-setup';

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('Bedrock Agent Handler - Event received:', JSON.stringify(event, null, 2));

    try {
        const { httpMethod, path } = event;

        if (httpMethod === 'POST' && path === '/bedrock-agent/setup') {
            const agentId = await setupBedrockAgent();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: 'Bedrock Agent setup completed',
                    agentId,
                }),
            };
        }

        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Endpoint not found',
            }),
        };
    } catch (error: any) {
        console.error('Error in Bedrock Agent Handler:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
            }),
        };
    }
};
