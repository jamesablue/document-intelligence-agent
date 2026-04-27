import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env['AWS_REGION'],
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] as string,
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] as string,
  },
});

export async function uploadToS3(buffer: Buffer, filename: string): Promise<string> {
  const key = `${Date.now()}-${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env['S3_BUCKET_NAME'],
      Key: key,
      Body: buffer,
    })
  );

  return key;
}
