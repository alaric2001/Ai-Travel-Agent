'use client';

import { useState, useRef, DragEvent } from 'react';

interface Props {
  onFileSelected: (file: File, preview: string) => void;
  disabled?: boolean;
}

export default function ReceiptUploader({ onFileSelected, disabled }: Props) {
  const [dragOver, setDragOver]   = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);
  const [fileName, setFileName]   = useState<string | null>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (JPEG, PNG, WebP) yang diizinkan');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    onFileSelected(file, url);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
        {preview ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt preview" className="h-32 w-24 object-cover rounded-lg border border-gray-200 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700 truncate max-w-xs">{fileName}</p>
              <p className="text-xs text-gray-400 mt-1">Klik atau seret untuk mengganti foto</p>
              <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Siap dianalisis
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm font-medium text-gray-700">
              Seret foto struk ke sini, atau klik untuk memilih
            </p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · Maks 10 MB</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
        <p className="font-medium">Tips foto struk yang baik:</p>
        <ul className="space-y-0.5 text-blue-600">
          <li>• Pastikan seluruh struk terlihat dalam frame</li>
          <li>• Pencahayaan cukup, tidak buram</li>
          <li>• Teks nominal dan nama item terbaca jelas</li>
        </ul>
      </div>
    </div>
  );
}
