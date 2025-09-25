// src/components/StudentCard.jsx
import { useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";

/**
 * Props:
 *  - student: { id, fullName, levelName, sectionName, photoUrl }
 *  - schoolLogoUrl?: string
 *  - qrValue?: string (defaults to "SID:<id>")
 *  - showIdText?: boolean (defaults to false) <-- we keep it hidden
 */
export default function StudentCard({
  student,
  schoolLogoUrl,
  qrValue,
  showIdText = false,
}) {
  const qrCanvasRef = useRef(null);
  const cardCss = useMemo(
    () => `
      /* exact physical size */
      .id-card { width: 85.6mm; height: 54mm; border-radius: 3mm; }
      .id-card {
        background: #0b358a; padding: 3mm; box-sizing: border-box;
      }
      .id-card__inner {
        background: #fff; width: 100%; height: 100%;
        border-radius: 2mm; overflow: hidden; display: flex; flex-direction: column;
      }
      .id-card__header {
        background: #eef2ff; color: #0b358a; font-weight: 700; font-size: 10pt;
        padding: 2mm 3mm;
      }
      .id-card__row { flex: 1; display: grid; grid-template-columns: 28mm 1fr 24mm; gap: 4mm; padding: 4mm 3mm 2mm; }
      .id-card__avatar {
        border: 0.3mm solid #b4b4b4; width: 22mm; height: 22mm; display: flex;
        align-items: center; justify-content: center; color: #969696; font-style: italic; font-size: 7pt;
      }
      .id-card__avatar img { max-width: 22mm; max-height: 22mm; object-fit: contain; }
      .id-card__text h3 { margin: 0 0 1mm 0; font-size: 10pt; font-weight: 700; }
      .id-card__text .sub { font-size: 9pt; margin: 0; }
      .id-card__text .idline { font-size: 8pt; margin: 1mm 0 0 0; color: #333; display: ${showIdText ? "block" : "none"}; }
      .id-card__qr { display: flex; align-items: center; justify-content: center; }
      .id-card__footer { padding: 1.5mm 3mm; color: #666; font-size: 7pt; font-style: italic; }
      .id-card__logo { height: 9mm; }
      .id-card__header-row { display:flex; align-items:center; gap:4mm; }
      @media screen {
        .preview-wrap { display:inline-block; box-shadow: 0 6px 18px rgba(0,0,0,.25); border-radius: 3mm; }
      }
    `,
    [showIdText]
  );

  useEffect(() => {
    const value = qrValue || `SID:${student?.id ?? ""}`;
    if (!qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: Math.round((22 / 25.4) * 96), // ~22mm at 96dpi
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => {});
  }, [qrValue, student?.id]);

  const levelSection =
    (student?.levelName || "") +
    (student?.sectionName ? ` - ${student.sectionName}` : "");

  return (
    <div className="preview-wrap">
      <style>{cardCss}</style>
      <div className="id-card" id="print-card">
        <div className="id-card__inner">
          <div className="id-card__header">
            <div className="id-card__header-row">
              {schoolLogoUrl ? (
                <img className="id-card__logo" src={schoolLogoUrl} alt="logo" />
              ) : null}
              <span>Student ID</span>
            </div>
          </div>

          <div className="id-card__row">
            <div className="id-card__avatar">
              {student?.photoUrl ? (
                <img src={student.photoUrl} alt="avatar" />
              ) : (
                <span>No Photo</span>
              )}
            </div>

            <div className="id-card__text">
              <h3>{student?.fullName || ""}</h3>
              <p className="sub">{levelSection}</p>
              <p className="idline">ID: {student?.id ?? "-"}</p>
            </div>

            <div className="id-card__qr">
              <canvas ref={qrCanvasRef} />
            </div>
          </div>

          <div className="id-card__footer">Scan QR to get student ID</div>
        </div>
      </div>
    </div>
  );
}
