/** Shared high-contrast styles for import-from-Excel dialogs (light + dark). */
export const primaryImportBtnSx = (theme, colors) => ({
  backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[500],
  color: "#fff",
  fontWeight: 600,
  "&:hover": {
    backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[700] : colors.blueAccent[400],
  },
  "&.Mui-disabled": {
    opacity: 1,
    backgroundColor: theme.palette.mode === "light" ? "#90a4ae" : "#455a64",
    color: theme.palette.mode === "light" ? "#1a1a1a" : "#eceff1",
  },
});
