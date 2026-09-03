"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import * as adminApi from "@/lib/api/admin";
import { useAdminUi } from "../admin-context";
import { adminT } from "../translations";

function formatDate(iso: string, lang: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#79665E]">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FilterSelect(props: JSX.IntrinsicElements["select"]) {
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <select
        {...rest}
        className={`appearance-none border border-[#E8D8CC] rounded-xl ps-3 pe-8 py-2.5 text-sm bg-white ${className ?? ""}`}
      />
      <ChevronIcon />
    </div>
  );
}

function UserActionsMenu({
  user,
  isSelf,
  t,
  open,
  onToggle,
  onClose,
  onEdit,
  onToggleStatus,
}: {
  user: adminApi.AdminUser;
  isSelf: boolean;
  t: (typeof adminT)["en"]["users"];
  open: boolean;
  onToggle: (userId: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // onToggle/onClose are stabilized with useCallback in the parent. Without
  // that, an inline arrow prop gets a new identity on every render, so this
  // effect's cleanup/setup pair can't keep up: two listeners end up attached
  // at once, and a stale one can wrongly treat a click inside the menu as
  // "outside", closing it (and unmounting the target button) before the
  // browser's own click event ever reaches it.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const node = menuRef.current;
      if (!node) return;
      // Desktop and mobile each render their own UserActionsMenu for the
      // same user, toggled only by CSS (hidden/md:hidden), so both are
      // mounted at once and share the same `open` state. The hidden
      // instance's own subtree obviously never contains a click that
      // happened in the visible one, so without this check it would
      // wrongly read every click in the visible tree as "outside" and
      // close the shared menu before the visible button's own click ever
      // fires. offsetParent is null when an ancestor is display:none.
      if (node.offsetParent === null) return;
      if (!node.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    // Only the row whose menu is actually open gets elevated (relative +
    // z-20). That isolates it into its own stacking context that paints
    // above every other row's plain kebab button regardless of DOM order,
    // so an open dropdown never gets visually poked through by a
    // following row's icon, and a following row's button never blocks
    // clicks meant for the still-open dropdown above it.
    <div className={`relative ${open ? "z-20" : ""}`} ref={menuRef}>
      <button
        onClick={() => onToggle(user.id)}
        aria-label={t.actionsMenu}
        aria-expanded={open}
        className="w-8 h-8 flex items-center justify-center rounded-full text-[#79665E] hover:bg-[#F8EEE5] hover:text-[#633B2C] transition"
      >
        <KebabIcon />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-40 bg-white border border-[#E8D8CC] rounded-xl shadow-lg overflow-hidden z-30">
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="w-full text-start px-4 py-2.5 text-sm font-medium text-[#633B2C] hover:bg-[#F8EEE5] transition"
          >
            {t.edit}
          </button>
          {!isSelf && (
            <button
              onClick={() => {
                onClose();
                onToggleStatus();
              }}
              className={`w-full text-start px-4 py-2.5 text-sm font-medium transition hover:bg-[#F8EEE5] ${user.is_active ? "text-[#D96C7C]" : "text-[#2E7D32]"}`}
            >
              {user.is_active ? t.deactivate : t.activate}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { lang, dir } = useAdminUi();
  const t = adminT[lang].users;
  const router = useRouter();
  const { state: authState, logout } = useAuth();
  const currentAdminId = authState.status === "logged-in" ? authState.user.id : null;

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<adminApi.RoleFilter>("all");
  const [status, setStatus] = useState<adminApi.StatusFilter>("all");

  const [users, setUsers] = useState<adminApi.AdminUser[]>([]);
  const [pagination, setPagination] = useState<adminApi.Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editUser, setEditUser] = useState<adminApi.AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", username: "", phone: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<adminApi.AdminUser | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionPending, setActionPending] = useState(false);

  // Only one row's kebab dropdown may be open at a time: it's absolutely
  // positioned and, left uncoordinated, an open menu from one row visually
  // overlaps the row below it and intercepts clicks meant for that row's
  // own kebab button (reproduced: Playwright reported the "Edit" item of
  // one row's open menu as the element actually receiving the click aimed
  // at the next row's toggle button).
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const toggleMenu = useCallback((userId: string) => {
    setOpenMenuUserId((current) => (current === userId ? null : userId));
  }, []);
  const closeMenu = useCallback(() => setOpenMenuUserId(null), []);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setOpenMenuUserId(null);
  }, [search, role, status]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.listUsers({ page, limit: 20, search: search || undefined, role, status });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      if (err instanceof adminApi.AdminApiError && err.status === 401) {
        await logout();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof adminApi.AdminApiError ? err.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status, logout, router, t.errorGeneric]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openEdit = (user: adminApi.AdminUser) => {
    setEditUser(user);
    setEditForm({ name: user.name, username: user.username, phone: user.phone });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditError("");
    try {
      await adminApi.updateUser(editUser.id, editForm);
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof adminApi.AdminApiError ? err.message : t.errorGeneric);
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmTarget) return;
    setActionPending(true);
    setActionError("");
    try {
      await adminApi.setUserStatus(confirmTarget.id, !confirmTarget.is_active);
      setConfirmTarget(null);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof adminApi.AdminApiError ? err.message : t.errorGeneric);
    } finally {
      setActionPending(false);
    }
  };

  const roleLabel = (r: adminApi.UserRole) => (r === "admin" ? t.roleAdmin : t.roleBuyer);
  const statusLabel = (isActive: boolean) => (isActive ? t.statusActive : t.statusInactive);

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.title}</h1>
      <p className="text-sm text-[#79665E] mt-1">{t.subtitle}</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full sm:max-w-xs border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white"
        />
        <FilterSelect value={role} onChange={(e) => setRole(e.target.value as adminApi.RoleFilter)}>
          <option value="all">{t.roleLabel}: {t.all}</option>
          <option value="admin">{t.roleAdmin}</option>
          <option value="buyer">{t.roleBuyer}</option>
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value as adminApi.StatusFilter)}>
          <option value="all">{t.statusLabel}: {t.all}</option>
          <option value="active">{t.statusActive}</option>
          <option value="inactive">{t.statusInactive}</option>
        </FilterSelect>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-[#D96C7C]">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-[#79665E]">{adminT[lang].loading}</p>
      ) : users.length === 0 ? (
        <p className="mt-8 text-sm text-[#79665E]">{t.empty}</p>
      ) : (
        <>
          {/* Desktop table */}
          {/* No overflow-x-auto here: it would force overflow-y to also
              clip (per the CSS overflow spec, a non-visible x-axis makes
              the UA compute y as auto too), cutting off the actions
              dropdown on the last row, which has no room below it within
              the table's own content height. */}
          <div className="hidden md:block mt-6 border border-[#E8D8CC] rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8D8CC] bg-[#FFFCF8] text-start text-[#79665E]">
                  <th className="px-4 py-3 text-start font-semibold">{t.colName}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colUsername}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colPhone}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colRole}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colStatus}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colCreated}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#F3EAE0] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#33221C]">{user.name}</td>
                    <td className="px-4 py-3 text-[#79665E]">{user.username}</td>
                    <td className="px-4 py-3 text-[#79665E]">{user.phone}</td>
                    <td className="px-4 py-3 text-[#79665E]">{roleLabel(user.role)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.is_active ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                        {statusLabel(user.is_active)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#79665E]">{formatDate(user.created_at, lang)}</td>
                    <td className="px-4 py-3">
                      <UserActionsMenu
                        user={user}
                        isSelf={user.id === currentAdminId}
                        t={t}
                        open={openMenuUserId === user.id}
                        onToggle={toggleMenu}
                        onClose={closeMenu}
                        onEdit={() => openEdit(user)}
                        onToggleStatus={() => setConfirmTarget(user)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden mt-6 flex flex-col gap-3">
            {users.map((user) => (
              <div key={user.id} className="border border-[#E8D8CC] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[#33221C]">{user.name}</span>
                    <p className="text-sm text-[#79665E] mt-1">@{user.username} · {roleLabel(user.role)}</p>
                    <p className="text-sm text-[#79665E]">{user.phone}</p>
                  </div>
                  <UserActionsMenu
                    user={user}
                    isSelf={user.id === currentAdminId}
                    t={t}
                    open={openMenuUserId === user.id}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onEdit={() => openEdit(user)}
                    onToggleStatus={() => setConfirmTarget(user)}
                  />
                </div>
                <span className={`inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${user.is_active ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                  {statusLabel(user.is_active)}
                </span>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-sm font-medium text-[#633B2C] disabled:text-[#B8A99B] disabled:cursor-not-allowed"
              >
                {t.pagePrev}
              </button>
              <span className="text-sm text-[#79665E]">{t.pageInfo(pagination.page, pagination.totalPages)}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="text-sm font-medium text-[#633B2C] disabled:text-[#B8A99B] disabled:cursor-not-allowed"
              >
                {t.pageNext}
              </button>
            </div>
          )}
        </>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t.cancel}
            className="absolute inset-0 bg-black/40"
            onClick={() => !editSaving && setEditUser(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif font-bold text-xl text-[#33221C]">{t.editTitle}</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.colName}</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={editSaving}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.colUsername}</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  disabled={editSaving}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.colPhone}</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={editSaving}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-[#79665E]">{t.colRole}</span>
                <span className="font-medium text-[#33221C]">{roleLabel(editUser.role)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#79665E]">{t.colStatus}</span>
                <span className="font-medium text-[#33221C]">{statusLabel(editUser.is_active)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#79665E]">{t.detailUpdatedAt}</span>
                <span className="font-medium text-[#33221C]">{formatDate(editUser.updated_at, lang)}</span>
              </div>
            </div>

            {editError && <p className="text-sm font-medium text-[#D96C7C] mt-4">{editError}</p>}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setEditUser(null)}
                disabled={editSaving}
                className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => void handleSaveEdit()}
                disabled={editSaving}
                className="flex-1 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60"
              >
                {editSaving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.cancel} className="absolute inset-0 bg-black/40" onClick={() => !actionPending && setConfirmTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <p className="font-serif font-bold text-lg text-[#33221C]">
              {confirmTarget.is_active ? t.confirmDeactivateTitle : t.confirmActivateTitle}
            </p>
            <p className="text-sm text-[#79665E] mt-2">{confirmTarget.name}</p>
            {actionError && <p className="text-sm font-medium text-[#D96C7C] mt-3">{actionError}</p>}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={actionPending}
                className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => void handleConfirmStatusChange()}
                disabled={actionPending}
                className="flex-1 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60"
              >
                {t.confirmConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
