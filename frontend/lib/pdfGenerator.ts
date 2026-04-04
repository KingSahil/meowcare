import { jsPDF } from 'jspdf';

/**
 * Generates a simple PDF document and triggers a download.
 * @param title The title of the document.
 * @param content An array of strings representing the content lines.
 * @param filename The name of the file to be saved.
 */
export const generatePDF = (title: string, content: string[], filename: string) => {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(20);
  doc.text(title, 20, 20);
  
  // Add Date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
  
  // Add Content
  doc.setFontSize(12);
  let yPosition = 45;
  content.forEach((line) => {
    // Basic text wrapping if needed, but for now just simple lines
    doc.text(line, 20, yPosition);
    yPosition += 10;
    
    // Check for page overflow
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
  });
  
  // Footer
  doc.setFontSize(10);
  doc.text('Remote Care Companion - Confidential Medical Document', 20, 290);
  
  // Save the PDF
  doc.save(`${filename}.pdf`);
};
