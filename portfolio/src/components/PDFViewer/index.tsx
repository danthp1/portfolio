'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, className = '' }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => Math.min(Math.max(prevPageNumber + offset, 1), numPages || 1));
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <div className={`pdf-viewer ${className}`}>
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => console.error('Error loading PDF:', error)}
        className="flex flex-col items-center"
      >
        <Page
          pageNumber={pageNumber}
          width={600}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          className="border border-gray-200 shadow-md"
        />
      </Document>

      {numPages && (
        <div className="flex justify-between items-center mt-4 px-4">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Vorherige
          </button>

          <p className="text-center">
            Seite {pageNumber} von {numPages}
          </p>

          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Nächste
          </button>
        </div>
      )}

      {/* Fallback link */}
      <p className="text-center mt-4">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          PDF herunterladen
        </a>
      </p>
    </div>
  );
};

export default PDFViewer;
