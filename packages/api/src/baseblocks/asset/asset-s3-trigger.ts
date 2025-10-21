import { S3Event, S3Handler } from 'aws-lambda';
import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand
} from '@aws-sdk/client-textract';
import { assetService, getAssetByS3Key } from './asset.service';
import { textractAssetService } from '../textract-asset/textract-asset.service';
import { invokeClaude } from '../bedrock-agent/bedrock-agent-invoker';
import { bedrockResponseService } from '../bedrock-response/bedrock-response.service';
import { BedrockResponseDecision, BedrockResponseStatus } from '@baseline/types/bedrock-response';

const textractClient = new TextractClient({ region: process.env.API_REGION });
const AGENT_INSTRUCTION = `You are a Grants Application processing agent. You approve/escalate/deny grant applications based on the application and the instructions provided. If the document is not a grant application, immediately respond with a denial. You base your decisions on the available budget and resources at the disposal of the Australian Federal Government. You must reply with a JSON string containing the following fields:
{ "decision": "APPROVE" | "DENY" | "ESCALATE", "strengths": "a string containing the strengths of the application", "weaknesses": "a string containing the weaknesses of the application", "reason": "a string containing the main reason you made your results decision" }`;

async function updateBedrockResponseRecord(
    agentResponse: string,
    bedrockResponseId: string,
    fileName: string
): Promise<void> {
    try {
        let jsonString = agentResponse.trim();

        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        const parsedResponse = JSON.parse(jsonString);
        console.log(`Parsed Bedrock response:`, parsedResponse);

        if (!parsedResponse.decision || !parsedResponse.reason) {
            throw new Error('Invalid response format: missing required fields');
        }

        const bedrockResponseData = {
            bedrockResponseId: bedrockResponseId,
            decision: parsedResponse.decision as BedrockResponseDecision,
            reason: parsedResponse.reason,
            weaknesses: parsedResponse.weaknesses || 'No weaknesses identified',
            strengths: parsedResponse.strengths || 'No strengths identified',
            status: 'COMPLETED' as BedrockResponseStatus
        };

        const updatedBedrockResponse = await bedrockResponseService.update(bedrockResponseData);
        console.log(`Updated BedrockResponse record: ${bedrockResponseId} to COMPLETED`);

    } catch (parseError: any) {
        console.error(`Failed to parse Bedrock response as JSON for ${fileName}:`, parseError);
        console.log(`Raw response was: ${agentResponse}`);

        const bedrockResponseData = {
            bedrockResponseId: bedrockResponseId,
            decision: 'ERROR' as BedrockResponseDecision,
            reason: `Failed to parse response: ${agentResponse.substring(0, 500)}...`,
            weaknesses: 'Response parsing failed',
            strengths: 'Response parsing failed',
            status: 'FAILED' as BedrockResponseStatus
        };

        const updatedBedrockResponse = await bedrockResponseService.update(bedrockResponseData);
        console.log(`Updated BedrockResponse record: ${bedrockResponseId} to FAILED`);
    }
}


/** @desc Processes a document with AWS Textract using asynchronous operations */
async function processDocumentWithTextract(
    fileName: string,
    bucketName: string,
    objectKey: string,
    objectSize: number,
    assetId: string
): Promise<{ success: boolean; extractedText?: string; errorMessage?: string; textractAssetId?: string }> {
    console.log(`Document details: ${fileName} (${objectSize} bytes)`);
    console.log(`Using asynchronous Textract processing for: ${fileName}`);

    const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
            S3Object: {
                Bucket: bucketName,
                Name: objectKey,
            },
        },
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId;

    console.log(`Textract async job started successfully for: ${fileName}`);
    console.log(`Job ID: ${jobId}`);

    let textractAssetId: string | undefined;
    try {
        const created = await textractAssetService.create({
            assetId,
            jobId: jobId!,
            status: 'IN_PROGRESS',
            startedAt: new Date().toUTCString(),
        });
        textractAssetId = (created as any).textractAssetId;
        console.log(`Created TextractAsset record for job ${jobId} with id ${textractAssetId}`);
    } catch (createError: any) {
        console.error('Failed to create TextractAsset record at job start', createError);
    }

    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const pollInterval = 5000; // Poll every 5 seconds
    const startTime = Date.now();

    let jobComplete = false;
    let finalResult: any = null;

    while (!jobComplete && (Date.now() - startTime) < maxWaitTime) {
        try {
            const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
            const getResponse = await textractClient.send(getCommand);

            if (getResponse.JobStatus === 'SUCCEEDED') {
                jobComplete = true;
                finalResult = getResponse;
                console.log(`Textract job completed successfully for: ${fileName}`);

                let extractedText = '';
                if (getResponse.Blocks && getResponse.Blocks.length > 0) {
                    const textBlocks = getResponse.Blocks.filter(block => block.BlockType === 'LINE');
                    extractedText = textBlocks.map(block => block.Text).join(' ');

                    console.log(`Textract results: Found ${textBlocks.length} text lines, extracted ${extractedText.length} characters`);
                } else {
                    console.log(`Textract analysis completed for: ${fileName} - No text blocks found`);
                }

                if (textractAssetId) {
                    try {
                        await textractAssetService.update({
                            textractAssetId,
                            status: 'COMPLETED',
                            completedAt: new Date().toUTCString(),
                        });
                        console.log(`Updated TextractAsset ${textractAssetId} as COMPLETED`);
                    } catch (updateError: any) {
                        console.error('Failed to update TextractAsset as COMPLETED', updateError);
                    }
                }

                return { success: true, extractedText, textractAssetId };
            } else if (getResponse.JobStatus === 'FAILED') {
                jobComplete = true;
                console.error(`Textract job failed for: ${fileName}`);
                console.error(`Failure reason: ${getResponse.StatusMessage || 'Unknown'}`);
                if (textractAssetId) {
                    try {
                        await textractAssetService.update({
                            textractAssetId,
                            status: 'FAILED',
                            completedAt: new Date().toUTCString(),
                            errorCode: 'TEXTRACT_JOB_FAILED',
                            errorMessage: `${getResponse.StatusMessage || 'Unknown'}`,
                        });
                        console.log(`Updated TextractAsset ${textractAssetId} as FAILED`);
                    } catch (updateError: any) {
                        console.error('Failed to update TextractAsset as FAILED', updateError);
                    }
                }
                return { success: false, errorMessage: getResponse.StatusMessage || 'Textract job failed', textractAssetId };
            } else {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        } catch (pollError: any) {
            console.error(`Error polling Textract job for: ${fileName}`, pollError);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    if (!jobComplete) {
        console.warn(`Textract job timeout reached for: ${fileName} (JobId: ${jobId})`);
        console.warn(`Job may still be processing. Check manually with JobId: ${jobId}`);
        return { success: false, errorMessage: 'Textract job timeout', textractAssetId };
    }

    return { success: false, errorMessage: 'Unknown error in Textract processing', textractAssetId };
}

/** @desc Lambda function triggered when an asset is uploaded to the Asset S3 bucket */
export const handler: S3Handler = async (event: S3Event): Promise<void> => {
    console.log('S3 Asset Upload Trigger - Event received:', JSON.stringify(event, null, 2));

    try {
        for (const record of event.Records) {
            const eventName = record.eventName;
            const eventTime = record.eventTime;

            const bucketName = record.s3.bucket.name;
            const bucketArn = record.s3.bucket.arn;

            const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const objectSize = record.s3.object.size;
            const objectETag = record.s3.object.eTag;

            const requestId = record.responseElements?.['x-amz-request-id'];
            const sourceIP = record.requestParameters?.sourceIPAddress;

            console.log('Asset Upload Details:', {
                event: eventName,
                timestamp: eventTime,
                bucket: {
                    name: bucketName,
                    arn: bucketArn,
                },
                object: {
                    key: objectKey,
                    size: objectSize,
                    sizeKB: (objectSize / 1024).toFixed(2),
                    sizeMB: (objectSize / 1024 / 1024).toFixed(2),
                    eTag: objectETag,
                },
                request: {
                    id: requestId,
                    sourceIP: sourceIP,
                },
            });

            const fileName = objectKey.split('/').pop();
            const fileExtension = fileName?.split('.').pop()?.toLowerCase();

            console.log('File Information:', {
                fileName,
                fileExtension,
                fullPath: objectKey,
            });

            if (fileExtension) {
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
                const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'csv'];

                if (imageExtensions.includes(fileExtension)) {
                    console.log(`Image file uploaded: ${fileName} - Skipping processing (not a document)`);
                    continue;
                } else if (videoExtensions.includes(fileExtension)) {
                    console.log(`Video file uploaded: ${fileName} - Skipping processing (not a document)`);
                    continue;
                } else if (documentExtensions.includes(fileExtension)) {
                    console.log(`Document file uploaded: ${fileName} - Processing with Textract`);

                    try {
                        let assetIdForDocument: string | undefined;
                        try {
                            const results = await getAssetByS3Key(objectKey);
                            if (results && results.length > 0) {
                                if (results.length > 1) {
                                    console.warn(`Multiple Assets found with s3Key ${objectKey}. Using the first result.`);
                                }
                                assetIdForDocument = results[0].assetId;
                            }
                        } catch (resolveError: any) {
                            console.error('Failed to resolve assetId for S3 object via s3Key-index', resolveError);
                        }

                        if (!assetIdForDocument) {
                            console.warn(`No Asset found with s3Key ${objectKey}. Skipping Textract processing for ${fileName}.`);
                            continue;
                        }

                        const textractResult = await processDocumentWithTextract(fileName!, bucketName, objectKey, objectSize, assetIdForDocument);

                        if (textractResult.success) {
                            let bedrockResponseId: string | undefined;

                            try {
                                console.log(`Creating BedrockResponse record with PENDING status for document: ${fileName}`);
                                const pendingBedrockResponseData = {
                                    assetId: assetIdForDocument,
                                    jobId: textractResult.textractAssetId || `bedrock-${Date.now()}`,
                                    decision: 'APPROVE' as BedrockResponseDecision,
                                    reason: 'Processing...',
                                    weaknesses: 'Processing...',
                                    strengths: 'Processing...',
                                    status: 'PENDING' as BedrockResponseStatus
                                };

                                const createdBedrockResponse = await bedrockResponseService.create(pendingBedrockResponseData);
                                bedrockResponseId = (createdBedrockResponse as any).bedrockResponseId;
                                console.log(`Created BedrockResponse record: ${bedrockResponseId} with PENDING status`);

                                console.log(`Invoking Bedrock Agent for document: ${fileName}`);
                                console.log(`Textract result text length: ${textractResult.extractedText?.length}`);
                                console.log("Payload length:", Buffer.byteLength(textractResult.extractedText || '', 'utf8'));
                                const agentResponse = await invokeClaude(
                                    `${AGENT_INSTRUCTION}\n\nPlease analyze this grant application document: ${textractResult.extractedText}`
                                );
                                console.log(`Bedrock Agent response for ${fileName}: ${agentResponse}`);

                                if (bedrockResponseId) {
                                    await updateBedrockResponseRecord(
                                        agentResponse,
                                        bedrockResponseId,
                                        fileName!
                                    );
                                }

                            } catch (bedrockError: any) {
                                console.error(`Failed to invoke Bedrock Agent for ${fileName}:`, bedrockError);

                                if (bedrockResponseId) {
                                    try {
                                        await bedrockResponseService.update({
                                            bedrockResponseId: bedrockResponseId,
                                            status: 'FAILED' as BedrockResponseStatus,
                                            reason: `Bedrock Agent invocation failed: ${bedrockError.message}`,
                                            decision: 'ERROR' as BedrockResponseDecision
                                        });
                                        console.log(`Updated BedrockResponse record: ${bedrockResponseId} to FAILED due to Bedrock error`);
                                    } catch (updateError: any) {
                                        console.error(`Failed to update BedrockResponse to FAILED:`, updateError);
                                    }
                                }
                            }
                        } else {
                            console.error(`Textract processing failed for ${fileName}: ${textractResult.errorMessage}`);
                        }
                    } catch (textractError: any) {
                        console.error(`Textract analysis failed for document: ${fileName}`, textractError);
                    }
                } else {
                    console.log(`Other file type uploaded: ${fileName} - Skipping processing (not a document)`);
                    continue;
                }
            }

            console.log(`Successfully processed S3 upload event for: ${objectKey}`);
        }

        console.log('S3 Asset Upload Trigger - All records processed successfully');
    } catch (error) {
        console.error('Error processing S3 upload event:', error);
    }
};

