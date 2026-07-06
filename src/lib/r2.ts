import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: "https://f96be84ba985f486f6c14f39115fcafc.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "95aa8be23809629532faa6fe71e1a3bd",
    secretAccessKey: "b0ac41c876342529d5ddaaed2f8fd643adfcb0a526a5ec171ac63421152d136a",
  },
});

export const BUCKET_NAME = "rakibox";