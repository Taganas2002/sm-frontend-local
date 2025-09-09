// src/scenes/users/UsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  useTheme,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SecurityIcon from "@mui/icons-material/Security";

import {
  searchAccounts,
  listRoles,
  createAccount,
  updateAccount,
} from "../../../api/usersApi";

import { tokens } from "../../../theme";
import Header from "../../../components/Header";

import UserFormDialog from "./UserFormDialog";
import PermissionsDialog from "./PermissionsDialog";

import translations from "../../../translations/index";

const UsersPage = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const t = translations[language] || translations["fr"];

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

  useEffect(() => {
    listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await searchAccounts({ search: q, page, size: pageSize });
      setRows(data.content || []);
      setRowCount(data.total ?? (data.content?.length || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line
  }, [q, page, pageSize]);

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
        minWidth: 200,
        renderCell: (p) => {
          const roleColors = {
            ADMIN: "error",
            MODERATOR: "warning",
            USER: "success",
            MANAGER: "info",
            EDITOR: "secondary",
            VIEWER: "primary",
            GUEST: "default",
          };

          return (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ flexWrap: "wrap", width: "100%" }}
              alignItems="center"
              justifyContent="center"
            >
              {(p.value || []).map((r) => {
                const role = r.replace("ROLE_", "");
                const color = roleColors[role] || "default";

                return (
                  <Chip
                    key={r}
                    label={role}
                    color={color}
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      color: color === "default" ? "inherit" : "#fff",
                    }}
                  />
                );
              })}
            </Stack>
          );
        },
      },
      {
        field: "actions",
        headerName: t.actions,
        width: 140,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%" ,gap: 2}}
          >
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
                      : colors.blueAccent[700],
                },
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
                "&:hover": { backgroundColor: colors.greenAccent[700] },
              }}
              onClick={() => setOpenPerms(row)}
            >
              <SecurityIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [theme, colors, t]
  );

  const handleCreate = async (payload) => {
    await createAccount(payload);
    setOpenCreate(false);
    await fetch();
  };

  const handleUpdate = async (id, payload) => {
    await updateAccount(id, payload);
    setOpenEdit(null);
    await fetch();
  };

  return (
    <Box m="20px">
      <Header title={t.userManagement} subtitle={t.userManagementSubtitle} />

      {/* Top Controls */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
        {/* <TextField
          size="small"
          label={t.search}
          placeholder={t.searchPlaceholder}
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
        /> */}
        <Button
    variant="contained"
    sx={{
      backgroundColor:
        theme.palette.mode === "light"
          ? colors.blueAccent[800]
          : colors.blueAccent[400],
      color: "#fff",
      "& .MuiButton-startIcon": {
        marginInlineEnd: language === "ar" ? "8px" : "6px",
      },
      "&:hover": {
        backgroundColor:
          theme.palette.mode === "light"
            ? colors.blueAccent[400]
            : colors.blueAccent[800],
      },
    }}
    startIcon={<AddIcon />}
    onClick={() => setOpenCreate(true)} // or handleOpen if you have a separate function
  >
    {t.addUser || "Add User"}
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
            borderBottom: "none",
            textAlign: language === "ar" ? "right" : "left",
          },
          "& .MuiDataGrid-cell": {
            textAlign: language === "ar" ? "right" : "left",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[400],
          },
          "& .MuiDataGrid-cell[data-field='roles'], & .MuiDataGrid-cell[data-field='actions']":
            {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
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
            phone: openEdit.phone,
            roleId: openEdit.roleId,
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
    </Box>
  );
};

export default UsersPage;
