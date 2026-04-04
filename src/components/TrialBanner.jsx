import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function TrialBanner() {
  const [license, setLicense] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://127.0.0.1:8080/api/license/status")
      .then(res => setLicense(res.data))
      .catch(() => setLicense({ state: "INVALID" }));
  }, []);

  if (!license) return null;

  if (license.state === "EXPIRED") {
    // redirect to explanation page
    navigate("/expired");
    return null;
  }

  if (license.state === "TRIAL") {
    return (
      <Box sx={{
        background: "#fffae6",
        border: "1px solid #ffe58f",
        padding: 1,
        textAlign: "center",
        mt: 2,
      }}>
        <Typography variant="body2">
          Trial version: {license.daysLeft} day(s) left
        </Typography>
      </Box>
    );
  }

  return null; // FULL / OK = no banner
}
