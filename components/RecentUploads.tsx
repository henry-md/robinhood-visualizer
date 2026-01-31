"use client";

import { useState, useEffect } from "react";
import { Clock, X, Pencil, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface RecentUpload {
  id: string;
  timestamp: number;
  fileType: 'robinhood' | 'chase';
  name: string;
  files: Array<{
    filename: string;
    content: string;
    accountType?: 'checking' | 'credit';
  }>;
}

interface RecentUploadsProps {
  onSelectUpload: (upload: RecentUpload) => void;
}

export default function RecentUploads({ onSelectUpload }: RecentUploadsProps) {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchUploads();
    }
  }, [open]);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recent-uploads');
      if (response.ok) {
        const data = await response.json();
        setUploads(data);
      }
    } catch (error) {
      console.error('Error fetching recent uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
      const response = await fetch(`/api/recent-uploads/${id}`);
      if (response.ok) {
        const upload = await response.json();
        onSelectUpload(upload);
        setOpen(false);
      }
    } catch (error) {
      console.error('Error loading upload:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistically remove from UI
    const previousUploads = uploads;
    setUploads(prevUploads => prevUploads.filter(u => u.id !== id));

    try {
      const response = await fetch(`/api/recent-uploads/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        // Revert on failure
        setUploads(previousUploads);
        console.error('Failed to delete upload');
      }
    } catch (error) {
      // Revert on error
      setUploads(previousUploads);
      console.error('Error deleting upload:', error);
    }
  };

  const handleStartEdit = (upload: RecentUpload, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(upload.id);
    setEditedName(upload.name);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    if (!editedName.trim()) {
      return;
    }

    // Optimistically update UI
    const previousUploads = uploads;
    setUploads(prevUploads =>
      prevUploads.map(u => u.id === id ? { ...u, name: editedName } : u)
    );
    setEditingId(null);

    try {
      const response = await fetch(`/api/recent-uploads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName }),
      });
      if (!response.ok) {
        // Revert on failure
        setUploads(previousUploads);
        console.error('Failed to update upload name');
      }
    } catch (error) {
      // Revert on error
      setUploads(previousUploads);
      console.error('Error updating upload name:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          Recent
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800">
        <DropdownMenuLabel className="text-zinc-50">Recent Uploads</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-2 py-6 text-center text-sm text-zinc-400">
            Loading...
          </div>
        ) : uploads.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-zinc-400">
            No recent uploads
          </div>
        ) : (
          uploads.map((upload) => (
            <DropdownMenuItem
              key={upload.id}
              onClick={() => editingId !== upload.id && handleSelect(upload.id)}
              onMouseEnter={() => setHoveredId(upload.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex flex-col items-start gap-1 cursor-pointer hover:!bg-zinc-800 focus:!bg-zinc-800"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 group">
                      {editingId === upload.id ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(upload.id, e);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 bg-zinc-800 text-zinc-50 px-2 py-1 rounded text-sm font-medium focus:outline-none focus:ring-1 focus:ring-zinc-600"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="font-medium text-zinc-50 truncate">
                            {upload.name}
                          </span>
                          {hoveredId === upload.id && editingId !== upload.id && (
                            <button
                              onClick={(e) => handleStartEdit(upload, e)}
                              className="shrink-0 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                              aria-label="Edit name"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {formatDate(upload.timestamp)}
                    </span>
                  </div>
                </div>
                {editingId === upload.id ? (
                  <button
                    onClick={(e) => handleSaveEdit(upload.id, e)}
                    className="shrink-0 p-1 rounded hover:bg-zinc-700 text-green-400 hover:text-green-300 transition-colors"
                    aria-label="Save name"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleDelete(upload.id, e)}
                    className="shrink-0 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label="Delete upload"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {upload.files.length} file{upload.files.length > 1 ? 's' : ''}
                {upload.files.length > 0 && ` • ${upload.files[0].filename}`}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
