// src/components/StudentCardModal.jsx
import { useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import StudentCard from "./StudentCard";
import { printNodeAsCard } from "../../../../utils/print";

const StudentCardModal = ({ open, onClose, student, schoolLogoUrl }) => {
  const cardRef = useRef(null);

   const handlePrint = () => {
    if (!cardRef.current || !student) return;

    // convert the QR canvas to an <img> so it prints reliably
    const qrCanvas = cardRef.current.querySelector("canvas");
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL("image/png") : "";

    const name = (student.fullName || "").trim();
    const levelSection =
      (levelName || "") + (sectionName ? ` - ${sectionName}` : "");

    // px→mm mapping based on your preview width 540px → 85.6mm
    // 1px ≈ 0.1585mm (used to match your exact look)
    const mm = (px) => (px * 85.6) / 540;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Card</title>
  <style>
    /* Exact physical page: CR80/ID-1 card */
    @page { size: 85.6mm 54mm; margin: 0; }
    html, body {
      margin: 0; padding: 0; background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }

    /* OUTER FRAME (matches your preview: width 540px, p=20px, radius=16px) */
    .frame {
      width: 85.6mm; height: 54mm;
      padding: ${mm(20)}mm;
      background: #133C86;
      border-radius: ${mm(16)}mm;
      display: flex; align-items: stretch; justify-content: stretch;
    }

    /* INNER PANEL (radius=12px) */
    .inner {
      background: #fff;
      border-radius: ${mm(12)}mm;
      overflow: hidden;
      display: flex; flex-direction: column; width: 100%;
    }

    /* HEADER (px: 16, py: 8) */
    .header { background: #EAEFFC; padding: ${mm(8)}mm ${mm(16)}mm; }
    .title { margin: 0; color: #103A8C; font-weight: 700; font-size: 16px; }

    /* BODY (grid gap=16, p=16) -> use flex for print stability */
    .body {
      display: flex; gap: ${mm(16)}mm;
      padding: ${mm(16)}mm;
      align-items: flex-start;
    }

    /* LEFT column: photo (170px), name, level */
    .left { display: flex; flex-direction: column; gap: ${mm(8)}mm; min-width: 0; }
    .photoBox {
      width: ${mm(170)}mm; height: ${mm(170)}mm;
      border: ${mm(2)}mm solid #d0d6e6; border-radius: ${mm(6)}mm;
      background: #fafbff;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .avatar { max-width: 100%; max-height: 100%; object-fit: cover; }
    .name { margin: 0; font-weight: 700; font-size: 18px; color: #1a2233; }
    .lvl  { margin: 0; color: #4c5568; font-size: 14px; }

    /* RIGHT column: QR (180px) */
    .qrCol { flex: 1; display: flex; align-items: center; justify-content: center; }
    .qr    { width: ${mm(180)}mm; height: ${mm(180)}mm; }

    /* FOOTER (px left/right=16, bottom=16) */
    .footer { padding: 0 ${mm(16)}mm ${mm(16)}mm ${mm(16)}mm; color: #6c7893; font-size: 12px; }

  </style>
</head>
<body>
  <div class="frame">
    <div class="inner">
      <div class="header"><p class="title">${t.studentId || "Student ID"}</p></div>

      <div class="body">
        <div class="left">
          <div class="photoBox">
            ${
              student.photoUrl
                ? `<img class="avatar" src="${student.photoUrl}" alt="avatar"/>`
                : `<span style="color:#8590a7;font-size:14px">No Photo</span>`
            }
          </div>
          <p class="name">${name}</p>
          <p class="lvl">${levelSection}</p>
        </div>

        <div class="qrCol">
          ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR" />` : ""}
        </div>
      </div>

      <div class="footer">${t.scanQrHint || "Scan QR to get student ID"}</div>
    </div>
  </div>

  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Student Card</DialogTitle>
      <DialogContent dividers>
        {/* The ref wraps ONLY the card markup so we print a clean node */}
        <div ref={cardRef}>
          <StudentCard
            student={student}
            schoolLogoUrl={schoolLogoUrl}
            showIdText={false}   // keep visible ID text hidden; QR encodes the ID
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
