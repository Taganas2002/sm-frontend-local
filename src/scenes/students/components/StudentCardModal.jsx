// src/components/StudentCardModal.jsx
import { forwardRef, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button
} from "@mui/material";
import StudentCard from "./StudentCard";

const printHtmlInNewWindow = (node) => {
  const win = window.open("", "_blank", "width=480,height=320");
  const css = `
    <style>
      @page { size: 85.6mm 54mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      /* remove preview shadow on print */
      .preview-wrap { box-shadow: none !important; }
    </style>
  `;
  win.document.write(`<html><head>${css}</head><body>${node.outerHTML}</body></html>`);
  win.document.close();
  // give the browser a tick to render before printing
  setTimeout(() => { win.focus(); win.print(); win.close(); }, 100);
};

const StudentCardModal = ({ open, onClose, student, schoolLogoUrl }) => {
  const cardRef = useRef(null);

  const handlePrint = () => {
    if (!cardRef.current) return;
    printHtmlInNewWindow(cardRef.current);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Student Card</DialogTitle>
      <DialogContent dividers>
        {/* Render the card and keep a ref to the root for printing */}
        <div ref={cardRef}>
          <StudentCard
            student={student}
            schoolLogoUrl={schoolLogoUrl}
            showIdText={false}     // 🔒 keep ID hidden on the card
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button onClick={handlePrint} variant="contained">Print</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentCardModal;
