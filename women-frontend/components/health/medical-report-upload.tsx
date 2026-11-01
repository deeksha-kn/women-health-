'use client';

import { useState, useRef } from 'react';
import { MedicalReport } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface MedicalReportUploadProps {
  reports: MedicalReport[];
  onReportsChange: (reports: MedicalReport[]) => void;
}

export function MedicalReportUpload({ reports, onReportsChange }: MedicalReportUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    setError('');
    
    // Filter for valid file types (PDF, images, documents)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please upload PDF, images, or documents.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      // Create a mock file URL (in production, this would be uploaded to a server)
      const fileUrl = URL.createObjectURL(file);
      const newReport: MedicalReport = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileUrl: fileUrl,
        uploadedAt: new Date(),
      };

      onReportsChange([...reports, newReport]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeReport = (reportId: string) => {
    onReportsChange(reports.filter((r) => r.id !== reportId));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary/2'
        }`}
      >
        <div className="text-4xl mb-3">📄</div>
        <h4 className="font-semibold text-foreground mb-1">Upload Medical Reports</h4>
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop your files here or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Supported: PDF, Images, Word documents (max 10MB each)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Uploaded Reports List */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Attached Reports ({reports.length})
          </p>
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0">
                  {report.fileName.endsWith('.pdf') ? '📕' : '🖼️'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {report.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(report.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => removeReport(report.id)}
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Privacy Note:</strong> Your medical reports are processed locally in your browser 
          and are not sent to external servers. They help us provide more accurate health insights.
        </p>
      </div>
    </div>
  );
}
