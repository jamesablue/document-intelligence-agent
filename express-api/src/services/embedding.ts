import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });

const MODEL_ID = 'amazon.titan-embed-text-v2:0';

export async function embedText(text: string): Promise<number[]> {
  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text, dimensions: 1024 }),
    })
  );

  const result = JSON.parse(new TextDecoder().decode(response.body)) as { embedding: number[] };
  return result.embedding;
}
