import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  useTheme,
  Chip,
  Snackbar,
  Alert
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SecurityIcon from "@mui/icons-material/Security";
import {
  searchAccounts,
  listRoles,
  createAccount,
  updateAccount
} from "../../../api/usersApi";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import UserFormDialog from "./UserFormDialog";
import PermissionsDialog from "./PermissionsDialog";
import translations from "../../../translations";

const UsersPage = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations.fr;

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(null);
  const [openPerms, setOpenPerms] = useState(null);
  const [roles, setRoles] = useState([]);

  const [toast, setToast] = useState(null);
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await searchAccounts({ search: q, page, size: pageSize });
      setRows(data.content || []);
      setRowCount(Number(data.total) || (data.content?.length || 0));
    } catch {
      setToast({ severity: "error", msg: t.errorLoading });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // debounce search
  useEffect(() => {
    if (typing) clearTimeout(typing);
    const id = setTimeout(() => {
      setPage(0);
      fetch();
    }, 350);
    setTyping(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 80 },
      { field: "name", headerName: t.name, flex: 1, minWidth: 160 },
      { field: "email", headerName: t.email, flex: 1, minWidth: 200 },
      { field: "phone", headerName: t.phone, flex: 1, minWidth: 160 },
      {
        field: "roles",
        headerName: t.roles,
        flex: 1,
        minWidth: 220,
        renderCell: (p) => {
          const roleColors = {
            ADMIN: "error",
            MODERATOR: "warning",
            USER: "success",
            TEACHER: "info",
            REGISTRAR: "secondary",
            ACCOUNTANT: "primary",
            PRINCIPAL: "default"
          };
          return (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
              {(p.value || []).map((r) => {
                const role = r.replace(/^ROLE_/, "");
                const color = roleColors[role] || "default";
                return (
                  <Chip
                    key={r}
                    label={role}
                    color={color}
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      color: color === "default" ? "inherit" : "#fff"
                    }}
                  />
                );
              })}
            </Stack>
          );
        }
      },
      {
        field: "actions",
        headerName: t.actions,
        width: 150,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              sx={{
                backgroundColor:
                  theme.palette.mode === "light"
                    ? colors.blueAccent[700]
                    : colors.blueAccent[400],
                color: "#fff",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? colors.blueAccent[400]
                      : colors.blueAccent[700]
                }
              }}
              onClick={() => setOpenEdit(row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              sx={{
                backgroundColor: colors.greenAccent[600],
                color: "#fff",
                "&:hover": { backgroundColor: colors.greenAccent[700] }
              }}
              onClick={() => setOpenPerms(row)}
            >
              <SecurityIcon fontSize="small" />
            </IconButton>
          </Stack>
        )
      }
    ],
    [theme, colors, t]
  );

  const handleCreate = async (payload) => {
    try {
      await createAccount(payload);
      setToast({ severity: "success", msg: t.saved });
      setOpenCreate(false);
      await fetch();
    } catch (e) {
      setToast({ severity: "error", msg: e?.error || t.failedSave });
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await updateAccount(id, payload);
      setToast({ severity: "success", msg: t.updated });
      setOpenEdit(null);
      await fetch();
    } catch (e) {
      setToast({ severity: "error", msg: e?.error || t.failedSave });
    }
  };

  return (
    <Box m="20px">
      <Header title={t.userManagement} subtitle={t.userManagementSubtitle} />

      {/* Top Controls */}
      <Box
        display="flex"
        gap={2}
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <TextField
          size="small"
          label={t.search}
          placeholder={t.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreate(true)}
          sx={{
            backgroundColor:
              theme.palette.mode === "light"
                ? colors.blueAccent[800]
                : colors.blueAccent[400],
            color: "#fff",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? colors.blueAccent[400]
                  : colors.blueAccent[800]
            }
          }}
        >
          {t.createUser}
        </Button>
      </Box>

      {/* DataGrid */}
      <Box
        height="75vh"
        dir={language === "ar" ? "rtl" : "ltr"}
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none"
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400]
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[400]
          }
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          onPageChange={setPage}
          pageSizeOptions={[5, 10, 20]}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          loading={loading}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Dialogs */}
      {openCreate && (
        <UserFormDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          roles={roles}
          onSubmit={handleCreate}
          mode="create"
          language={language}
        />
      )}
      {openEdit && (
        <UserFormDialog
          open={!!openEdit}
          onClose={() => setOpenEdit(null)}
          roles={roles}
          onSubmit={(payload) => handleUpdate(openEdit.id, payload)}
          initial={{
            name: openEdit.name,
            email: openEdit.email,
            phone: openEdit.phone
          }}
          mode="edit"
          language={language}
        />
      )}
      {openPerms && (
        <PermissionsDialog
          open={!!openPerms}
          onClose={() => setOpenPerms(null)}
          user={openPerms}
          roles={roles}
          language={language}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && <Alert severity={toast.severity}>{toast.msg}</Alert>}
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
