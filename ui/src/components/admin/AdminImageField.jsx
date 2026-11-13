import { useEffect, useRef, useState } from 'react';

const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/avif,image/tiff';

export default function AdminImageField({
  file,
  onChange,
  label = 'Product image',
  recommendedDimensions = '1200 × 1200 px (square)',
  required = false,
  existingUrl = '',
  onRemoveExisting,
  onRemoveImage,
}) {
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      if (inputRef.current) inputRef.current.value = '';
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="admin-image-field admin-wide">
      <label>
        {label}
        <input
          accept={acceptedImageTypes}
          onChange={(event) => onChange(event.target.files?.[0] || null)}
          required={required && !existingUrl}
          ref={inputRef}
          type="file"
        />
      </label>
      <small>Recommended: {recommendedDimensions}. JPEG, PNG, WebP, AVIF or TIFF · max 8 MB. Other formats are converted to WebP; WebP is preserved.</small>
      {preview?.file === file && (
        <div className="admin-image-preview">
          <span className="admin-image-preview-art">
            <img alt="Selected image preview" src={preview.url} />
            {(onRemoveImage || onRemoveExisting) && (
              <button className="admin-image-remove" aria-label={`Remove ${label.toLowerCase()}`}
                onClick={() => (onRemoveImage || onRemoveExisting)()} type="button">×</button>
            )}
          </span>
          <span>{file.name}</span>
        </div>
      )}
      {!file && existingUrl && (
        <div className="admin-image-preview">
          <span className="admin-image-preview-art">
            <img alt="Current image" src={existingUrl} />
            {(onRemoveExisting || onRemoveImage) && (
              <button className="admin-image-remove" aria-label={`Remove ${label.toLowerCase()}`}
                onClick={() => (onRemoveExisting || onRemoveImage)()} type="button">×</button>
            )}
          </span>
          <span>Current image</span>
        </div>
      )}
    </div>
  );
}
