import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.API_REGION });

export async function invokeClaude(prompt: string) {
    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [
                { role: "user", content: [{ type: "text", text: prompt }] },
            ],
        }),
    });

    const response = await bedrock.send(command);
    const responseBody = Buffer.from(response.body).toString("utf-8");
    const parsed = JSON.parse(responseBody);

    return parsed.output_text || parsed.completion || JSON.stringify(parsed);
}
