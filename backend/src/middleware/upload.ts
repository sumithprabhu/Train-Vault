import multer from "multer";

const storage = multer.memoryStorage();

/**
 * Single file upload; file available as req.file with .buffer.
 */
export const uploadSingle = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
}).single("file");
