import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "@/env";

// Works with AWS S3, Cloudflare R2, MinIO, etc.
const s3 = new S3Client({
	region: env.S3_REGION || "auto",
	endpoint: env.S3_ENDPOINT,
	credentials: env.S3_ACCESS_KEY_ID
		? {
				accessKeyId: env.S3_ACCESS_KEY_ID,
				secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
			}
		: undefined,
});

const BUCKET = env.S3_BUCKET || "uploads";

interface UploadOptions {
	key: string;
	contentType?: string;
	expiresIn?: number; // seconds, default 3600
}

interface DownloadOptions {
	key: string;
	expiresIn?: number;
}

/**
 * Generate presigned URL for uploading
 */
export async function getUploadUrl({
	key,
	contentType,
	expiresIn = 3600,
}: UploadOptions): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType,
	});
	return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Generate presigned URL for downloading
 */
export async function getDownloadUrl({
	key,
	expiresIn = 3600,
}: DownloadOptions): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});
	return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});
	await s3.send(command);
}

/**
 * Generate a unique file key
 */
export function generateKey(filename: string, prefix = "uploads"): string {
	const ext = filename.split(".").pop() || "";
	const id = crypto.randomUUID();
	return `${prefix}/${id}${ext ? `.${ext}` : ""}`;
}
