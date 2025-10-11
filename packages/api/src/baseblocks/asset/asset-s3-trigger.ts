import { S3Event, S3Handler } from 'aws-lambda';

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
                    console.log(`Image file uploaded: ${fileName}`);
                } else if (videoExtensions.includes(fileExtension)) {
                    console.log(`Video file uploaded: ${fileName}`);
                } else if (documentExtensions.includes(fileExtension)) {
                    console.log(`Document file uploaded: ${fileName}`);
                } else {
                    console.log(`Other file type uploaded: ${fileName}`);
                }
            }

            console.log(`Successfully processed S3 upload event for: ${objectKey}`);
        }

        console.log('S3 Asset Upload Trigger - All records processed successfully');
    } catch (error) {
        console.error('Error processing S3 upload event:', error);
    }
};

