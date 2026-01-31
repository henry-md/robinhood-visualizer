"use client";

import { ChangeEvent, useRef, useState } from "react";
import { detectFileType } from "@/lib/fileTypeDetector";
import { FileType } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileUploadProps {
  onFileSelect: (file: File) => void | Promise<void>;
  onBatchFilesSelect?: (files: File[]) => void | Promise<void>;
  existingFilenames?: string[];
  currentFileType?: FileType;
  onClearFiles?: () => void;
}

export default function FileUpload({ onFileSelect, onBatchFilesSelect, existingFilenames = [], currentFileType = 'unknown', onClearFiles }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const showAlert = (title: string, description: string) => {
    setAlertTitle(title);
    setAlertDescription(description);
    setAlertOpen(true);
  };

  const showConfirm = (title: string, description: string, files: File[]) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setPendingFiles(files);
    setConfirmOpen(true);
  };

  const handleConfirmContinue = async () => {
    setConfirmOpen(false);
    // Clear existing files
    if (onClearFiles) {
      onClearFiles();
    }
    // Process the pending files as a batch
    if (onBatchFilesSelect && pendingFiles.length > 1) {
      await onBatchFilesSelect(pendingFiles);
    } else {
      for (const file of pendingFiles) {
        await onFileSelect(file);
      }
    }
    setPendingFiles([]);
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setPendingFiles([]);
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    // First pass: validate all files
    const validFiles: File[] = [];
    const fileTypes: FileType[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file type
      if (file.type !== "text/csv") {
        showAlert("Invalid File Type", `"${file.name}" is not a valid CSV file. Please upload only CSV files.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Detect file type
      const detectedType = await detectFileType(file);

      if (detectedType === 'unknown') {
        showAlert("Unrecognized File Format", `"${file.name}" is not a recognized Robinhood or Chase CSV file.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      validFiles.push(file);
      fileTypes.push(detectedType);
    }

    // Check if mixing file types within this batch
    const hasRobinhoodInBatch = fileTypes.some(type => type === 'robinhood');
    const hasChaseInBatch = fileTypes.some(type => type === 'chase');

    if (hasRobinhoodInBatch && hasChaseInBatch) {
      showAlert("Cannot Mix File Types", "Cannot mix Robinhood and Chase files in the same upload. Please upload only one type at a time.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if trying to upload multiple Robinhood files in this batch
    if (fileTypes.filter(type => type === 'robinhood').length > 1) {
      showAlert("Multiple Robinhood Files", "Cannot upload multiple Robinhood files. Please upload one Robinhood file at a time.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Determine the new file type being uploaded
    const newFileType = fileTypes[0]; // All files in batch are the same type at this point

    // Check if we need to confirm before overriding existing files
    const willOverrideRobinhood = newFileType === 'robinhood' && currentFileType !== 'unknown';
    const willOverrideChase = newFileType === 'chase' && currentFileType === 'robinhood';

    if ((willOverrideRobinhood || willOverrideChase) && onClearFiles) {
      // Show confirmation dialog
      const currentTypeLabel = currentFileType === 'robinhood' ? 'Robinhood' : 'Chase';
      const newTypeLabel = newFileType === 'robinhood' ? 'Robinhood' : 'Chase';
      showConfirm(
        "Replace Existing Files?",
        `You currently have ${currentTypeLabel} ${currentFileType === 'chase' ? 'files' : 'file'} loaded. Uploading ${newTypeLabel} ${newFileType === 'chase' ? 'files' : 'file'} will clear your current data. Do you want to continue?`,
        validFiles
      );
      return;
    }

    // Check for duplicate filenames after potential clear
    // (only relevant for Chase files being added to existing Chase files)
    if (newFileType === 'chase' && currentFileType === 'chase') {
      for (const file of validFiles) {
        if (existingFilenames.includes(file.name)) {
          showAlert("Duplicate File", `"${file.name}" has already been uploaded. Please remove it first or rename your file.`);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }
    }

    // All validations passed - process files
    // If multiple files and batch handler exists, use batch handler
    if (validFiles.length > 1 && onBatchFilesSelect) {
      await onBatchFilesSelect(validFiles);
    } else {
      for (const file of validFiles) {
        await onFileSelect(file);
      }
    }

    // Reset the input so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="w-full">
        <label
          htmlFor="csv-upload"
          className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <div className="flex flex-col items-center justify-center pb-6 pt-5">
            <svg
              className="mb-3 h-10 w-10 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              CSV files (multiple files supported)
            </p>
          </div>
          <input
            id="csv-upload"
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            multiple
            onChange={handleFileChange}
          />
        </label>
      </div>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmContinue} className="bg-red-600 text-white hover:bg-red-700 hover:text-white">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
