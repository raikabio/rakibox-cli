import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
// Load configuration from local working directory environment files
dotenv.config({ path: path.join(process.cwd(), '.env') });
export const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
    },
});
export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
