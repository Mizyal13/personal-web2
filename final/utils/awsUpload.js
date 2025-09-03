import multer from "multer";
import AWS from "aws-sdk";
import multerS3 from "multer-s3";
import path from "path";
import dotenv from "dotenv";

// Load .env
dotenv.config();

// Pastikan semua env ada
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_S3_BUCKET_NAME,
} = process.env;

if (
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !AWS_REGION ||
  !AWS_S3_BUCKET_NAME
) {
  throw new Error(
    "AWS environment variables are missing. Please check your .env file."
  );
}

// Konfigurasi S3
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

// Export multer upload
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: AWS_S3_BUCKET_NAME,
    acl: "public-read",
    key: (req, file, cb) => {
      const fileName = `${file.fieldname}-${Date.now()}${path.extname(
        file.originalname
      )}`;
      cb(null, fileName);
    },
  }),
});
