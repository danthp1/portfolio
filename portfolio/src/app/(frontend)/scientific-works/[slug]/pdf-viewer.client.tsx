'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, className = '' }) => {
  const [embedFailed, setEmbedFailed] = useState(false);

  // Check if embed is supported
  useEffect(() => {
    // Modern browsers support PDF embedding, but we'll keep this check for older browsers
    const isEmbedSupported = navigator &&
      navigator.mimeTypes &&
      navigator.mimeTypes['application/pdf'];

    setEmbedFailed(!isEmbedSupported);
  }, []);

  return (
    <div className={`pdf-viewer relative ${className}`} style={{ width: '100%', height: '800px', minHeight: '800px' }}>
      {/* Extend button */}
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 z-10 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md flex items-center gap-1 transition-colors"
        title="PDF in neuem Tab öffnen"
      >
        <ExternalLink size={16} />
        <span>Erweitern</span>
      </a>

      <embed
        src={pdfUrl}
        type="application/pdf"
        width="100%"
        height="100%"
        onError={() => setEmbedFailed(true)}
      />
      {/* Fallback link only shown when embed fails */}
      {embedFailed && (
        <p className="text-center mt-2">
          Ihr Browser unterstützt keine PDF-Einbettung. <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">PDF herunterladen</a>
        </p>
      )}
    </div>
  );
};

export default PDFViewer;
