import {
    BedrockAgentClient,
    CreateAgentCommand,
    CreateAgentActionGroupCommand,
    CreateAgentAliasCommand,
    GetAgentCommand,
    ListAgentsCommand,
} from '@aws-sdk/client-bedrock-agent';

const bedrockAgentClient = new BedrockAgentClient({ region: process.env.API_REGION });

const AGENT_NAME = 'DocumentProcessorAgent';
const AGENT_DESCRIPTION = 'Simple agent to process documents and respond with status';
const AGENT_INSTRUCTION = `You are a Grants Application processing agent. You approve/escalate/deny grant applications based on the application and the instructions provided. If the document is not a grant application, immediately respond with a denial. You base your decisions on the available budget and resources at the disposal of the Australian Federal Government. You must reply with a JSON string containing the following fields:
{ "result": "APPROVE" | "DENY" | "ESCALATE", "strengths": "a string containing the strengths of the application", "weaknesses": "a string containing the weaknesses of the application", "reason": "a string containing the main reason you made your results decision" }`;
const FOUNDATION_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0';

export async function setupBedrockAgent(): Promise<string> {
    try {
        console.log('Checking for existing Bedrock Agent...');

        const existingAgents = await bedrockAgentClient.send(new ListAgentsCommand({}));
        console.log('Existing agents:', existingAgents.agentSummaries);
        const existingAgent = existingAgents.agentSummaries?.find(
            agent => agent.agentName === AGENT_NAME
        );

        if (!existingAgent) {
            console.error(`❌ DocumentProcessorAgent not found. Please create it manually in AWS Console → Bedrock → Agents with name: ${AGENT_NAME}`);
            throw new Error('DocumentProcessorAgent not found. Please create it manually in AWS Console.');
        }

        const agentId = existingAgent.agentId!;
        console.log(`✅ Agent ${AGENT_NAME} found with ID: ${agentId}`);

        const getAgentCommand = new GetAgentCommand({ agentId });
        const agentResponse = await bedrockAgentClient.send(getAgentCommand);
        const agentStatus = agentResponse.agent?.agentStatus;

        console.log(`Agent status: ${agentStatus}`);

        if (agentStatus === 'NOT_PREPARED') {
            console.error(`❌ Agent ${AGENT_NAME} (ID: ${agentId}) is not prepared. Please prepare it manually in AWS Console → Bedrock → Agents`);
            throw new Error(`Agent ${AGENT_NAME} is not prepared. Please prepare it manually in AWS Console.`);
        }

        if (agentStatus !== 'PREPARED') {
            console.error(`❌ Agent ${AGENT_NAME} (ID: ${agentId}) is in unexpected state: ${agentStatus}. Expected: PREPARED`);
            throw new Error(`Agent ${AGENT_NAME} is in unexpected state: ${agentStatus}`);
        }

        console.log(`✅ Agent ${AGENT_NAME} is ready (status: ${agentStatus})`);

        const aliasName = 'LIVE';
        try {
            const createAliasCommand = new CreateAgentAliasCommand({
                agentId,
                agentAliasName: aliasName,
                description: 'Live alias for document processing agent',
            });
            await bedrockAgentClient.send(createAliasCommand);
            console.log(`✅ Created alias ${aliasName} for agent ${agentId}`);
        } catch (aliasError: any) {
            if (aliasError.name === 'ConflictException') {
                console.log(`✅ Alias ${aliasName} already exists for agent ${agentId}`);
            } else {
                console.error('❌ Failed to create/verify alias:', aliasError);
                throw aliasError;
            }
        }

        return agentId;
    } catch (error) {
        console.error('Error in setupBedrockAgent:', error);
        throw error;
    }
}
