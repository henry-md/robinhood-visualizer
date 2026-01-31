-- CreateTable
CREATE TABLE "RecentUpload" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileType" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RecentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadFile" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "accountType" TEXT,

    CONSTRAINT "UploadFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecentUpload_timestamp_idx" ON "RecentUpload"("timestamp");

-- CreateIndex
CREATE INDEX "UploadFile_uploadId_idx" ON "UploadFile"("uploadId");

-- AddForeignKey
ALTER TABLE "UploadFile" ADD CONSTRAINT "UploadFile_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "RecentUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
