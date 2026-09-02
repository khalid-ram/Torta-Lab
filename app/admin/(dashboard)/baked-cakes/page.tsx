"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import * as api from "@/lib/api/baked-cakes";
import { useAdminUi } from "../admin-context";
import { adminT } from "../translations";

function formatDate(iso: string, lang: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
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

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CakeActionsMenu({
  cake,
  t,
  open,
  onToggle,
  onClose,
  onEdit,
  onToggleStatus,
}: {
  cake: api.BakedCake;
  t: (typeof adminT)["en"]["bakedCakes"];
  open: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const node = menuRef.current;
      if (!node) return;
      // See app/admin/(dashboard)/users/page.tsx for why this offsetParent
      // check matters: desktop and mobile both mount this component for
      // the same row (CSS-hidden, not unmounted), and without it the
      // hidden instance's click-outside handler wrongly closes the
      // visible one before its own click can land.
      if (node.offsetParent === null) return;
      if (!node.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    <div className={`relative ${open ? "z-20" : ""}`} ref={menuRef}>
      <button
        onClick={() => onToggle(cake.id)}
        aria-label={t.actionsMenu}
        aria-expanded={open}
        className="w-8 h-8 flex items-center justify-center rounded-full text-[#79665E] hover:bg-[#F8EEE5] hover:text-[#633B2C] transition"
      >
        <KebabIcon />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-40 bg-white border border-[#E8D8CC] rounded-xl shadow-lg overflow-hidden z-30">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="w-full text-start px-4 py-2.5 text-sm font-medium text-[#633B2C] hover:bg-[#F8EEE5] transition"
          >
            {t.edit}
          </button>
          <button
            onClick={() => { onClose(); onToggleStatus(); }}
            className={`w-full text-start px-4 py-2.5 text-sm font-medium transition hover:bg-[#F8EEE5] ${cake.status === "active" ? "text-[#D96C7C]" : "text-[#2E7D32]"}`}
          >
            {cake.status === "active" ? t.pause : t.activate}
          </button>
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  name: "",
  description: "",
  is_available_to_order: false,
  status: "active" as api.CakeStatus,
  media_type: "image" as api.MediaType,
};

export default function AdminBakedCakesPage() {
  const { lang, dir } = useAdminUi();
  const t = adminT[lang].bakedCakes;
  const router = useRouter();
  const { logout } = useAuth();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<api.StatusFilter>("all");
  const [availability, setAvailability] = useState<api.AvailabilityFilter>("all");
  const [media, setMedia] = useState<api.MediaFilter>("all");

  const [cakes, setCakes] = useState<api.BakedCake[]>([]);
  const [pagination, setPagination] = useState<api.Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toggleMenu = useCallback((id: string) => setOpenMenuId((cur) => (cur === id ? null : id)), []);
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const [confirmTarget, setConfirmTarget] = useState<api.BakedCake | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCake, setEditingCake] = useState<api.BakedCake | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setOpenMenuId(null);
  }, [search, status, availability, media]);

  const loadCakes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.listBakedCakes({ page, limit: 20, search: search || undefined, status, availability, media });
      setCakes(result.data);
      setPagination(result.pagination);
    } catch (err) {
      if (err instanceof api.BakedCakesApiError && err.status === 401) {
        await logout();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof api.BakedCakesApiError ? err.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, availability, media, logout, router, t.errorGeneric]);

  useEffect(() => {
    void loadCakes();
  }, [loadCakes]);

  const openCreate = () => { setEditingCake(null); setFormOpen(true); };
  const openEdit = (cake: api.BakedCake) => { setEditingCake(cake); setFormOpen(true); };

  const handleConfirmStatusChange = async () => {
    if (!confirmTarget) return;
    setActionPending(true);
    setActionError("");
    try {
      await api.setBakedCakeStatus(confirmTarget.id, confirmTarget.status === "active" ? "paused" : "active");
      setConfirmTarget(null);
      await loadCakes();
    } catch (err) {
      setActionError(err instanceof api.BakedCakesApiError ? err.message : t.errorGeneric);
    } finally {
      setActionPending(false);
    }
  };

  const statusLabel = (s: api.CakeStatus) => (s === "active" ? t.statusActive : t.statusPaused);
  const availabilityLabel = (v: boolean) => (v ? t.available : t.notAvailable);
  const mediaLabel = (m: api.MediaType) => (m === "image" ? t.mediaImage : t.mediaVideo);
  const shortId = (id: string) => id.slice(0, 8);

  return (
    <div dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.title}</h1>
          <p className="text-sm text-[#79665E] mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition whitespace-nowrap"
        >
          {t.addCake}
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full sm:max-w-xs border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as api.StatusFilter)} className="border border-[#E8D8CC] rounded-xl px-3 py-2.5 text-sm bg-white">
          <option value="all">{t.statusLabel}: {t.all}</option>
          <option value="active">{t.statusActive}</option>
          <option value="paused">{t.statusPaused}</option>
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value as api.AvailabilityFilter)} className="border border-[#E8D8CC] rounded-xl px-3 py-2.5 text-sm bg-white">
          <option value="all">{t.availabilityLabel}: {t.all}</option>
          <option value="available">{t.available}</option>
          <option value="unavailable">{t.notAvailable}</option>
        </select>
        <select value={media} onChange={(e) => setMedia(e.target.value as api.MediaFilter)} className="border border-[#E8D8CC] rounded-xl px-3 py-2.5 text-sm bg-white">
          <option value="all">{t.mediaLabel}: {t.all}</option>
          <option value="image">{t.mediaImage}</option>
          <option value="video">{t.mediaVideo}</option>
        </select>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-[#D96C7C]">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-[#79665E]">{adminT[lang].loading}</p>
      ) : cakes.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-[#79665E]">{t.empty}</p>
          <button onClick={openCreate} className="mt-4 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition">
            {t.addCake}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block mt-6 border border-[#E8D8CC] rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8D8CC] bg-[#FFFCF8] text-start text-[#79665E]">
                  <th className="px-4 py-3 text-start font-semibold">{t.colId}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colName}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colDescription}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colAvailability}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colStatus}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colMedia}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {cakes.map((cake) => (
                  <tr key={cake.id} className="border-b border-[#F3EAE0] last:border-0 align-top">
                    <td className="px-4 py-3 text-[#B8A99B] font-mono text-xs" title={cake.id}>{shortId(cake.id)}</td>
                    <td className="px-4 py-3 font-medium text-[#33221C] max-w-[160px]">{cake.name}</td>
                    <td className="px-4 py-3 text-[#79665E] max-w-[220px] truncate">{cake.description}</td>
                    <td className="px-4 py-3 text-[#79665E]">{availabilityLabel(cake.is_available_to_order)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cake.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                        {statusLabel(cake.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={cake.media_type === "video" ? cake.thumbnail_url ?? "" : cake.media_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-[#F8EEE5]"
                        />
                        <a href={cake.media_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#633B2C] hover:text-[#D96C7C] whitespace-nowrap">
                          {cake.media_type === "video" ? t.viewVideo : t.viewPhoto}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CakeActionsMenu
                        cake={cake}
                        t={t}
                        open={openMenuId === cake.id}
                        onToggle={toggleMenu}
                        onClose={closeMenu}
                        onEdit={() => openEdit(cake)}
                        onToggleStatus={() => setConfirmTarget(cake)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden mt-6 flex flex-col gap-3">
            {cakes.map((cake) => (
              <div key={cake.id} className="border border-[#E8D8CC] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={cake.media_type === "video" ? cake.thumbnail_url ?? "" : cake.media_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-[#F8EEE5] shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-[#33221C] block truncate">{cake.name}</span>
                      <p className="text-sm text-[#79665E] mt-0.5 truncate">{cake.description}</p>
                    </div>
                  </div>
                  <CakeActionsMenu
                    cake={cake}
                    t={t}
                    open={openMenuId === cake.id}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onEdit={() => openEdit(cake)}
                    onToggleStatus={() => setConfirmTarget(cake)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cake.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                    {statusLabel(cake.status)}
                  </span>
                  <span className="text-xs text-[#79665E]">{availabilityLabel(cake.is_available_to_order)}</span>
                  <a href={cake.media_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#633B2C]">
                    {cake.media_type === "video" ? t.viewVideo : t.viewPhoto}
                  </a>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-sm font-medium text-[#633B2C] disabled:text-[#B8A99B] disabled:cursor-not-allowed">
                {t.pagePrev}
              </button>
              <span className="text-sm text-[#79665E]">{t.pageInfo(pagination.page, pagination.totalPages)}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="text-sm font-medium text-[#633B2C] disabled:text-[#B8A99B] disabled:cursor-not-allowed">
                {t.pageNext}
              </button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <BakedCakeFormModal
          t={t}
          cake={editingCake}
          onClose={() => setFormOpen(false)}
          onSaved={async () => { setFormOpen(false); await loadCakes(); }}
        />
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.cancel} className="absolute inset-0 bg-black/40" onClick={() => !actionPending && setConfirmTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <p className="font-serif font-bold text-lg text-[#33221C]">
              {confirmTarget.status === "active" ? t.confirmPauseTitle : t.confirmActivateTitle}
            </p>
            <p className="text-sm text-[#79665E] mt-2">{confirmTarget.name}</p>
            {actionError && <p className="text-sm font-medium text-[#D96C7C] mt-3">{actionError}</p>}
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmTarget(null)} disabled={actionPending} className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
                {t.cancel}
              </button>
              <button onClick={() => void handleConfirmStatusChange()} disabled={actionPending} className="flex-1 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
                {t.confirmConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BakedCakeFormModal({
  t,
  cake,
  onClose,
  onSaved,
}: {
  t: (typeof adminT)["en"]["bakedCakes"];
  cake: api.BakedCake | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = !cake;
  const [form, setForm] = useState(
    cake
      ? { name: cake.name, description: cake.description, is_available_to_order: cake.is_available_to_order, status: cake.status, media_type: cake.media_type }
      : emptyForm,
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mediaFile) return;
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const mediaTypeChanged = cake ? form.media_type !== cake.media_type : false;
  const needsNewMedia = isCreate || mediaTypeChanged;
  const needsNewThumbnail = (isCreate || mediaTypeChanged) && form.media_type === "video";

  const currentMediaPreview = mediaPreview ?? (!mediaTypeChanged && cake?.media_type === form.media_type ? cake?.media_url : null);
  const currentThumbnailPreview = thumbnailPreview ?? (!mediaTypeChanged && cake?.media_type === "video" ? cake?.thumbnail_url : null);

  const handleMediaTypeChange = (nextType: api.MediaType) => {
    setForm((f) => ({ ...f, media_type: nextType }));
    setMediaFile(null);
    setThumbnailFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsNewMedia && !mediaFile) {
      setError(form.media_type === "image" ? t.uploadPhoto : t.uploadVideo);
      return;
    }
    if (needsNewThumbnail && !thumbnailFile) {
      setError(t.uploadThumbnail);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isCreate) {
        await api.createBakedCake({ ...form, media: mediaFile ?? undefined, thumbnail: thumbnailFile ?? undefined });
      } else {
        await api.updateBakedCake(cake!.id, { ...form, media: mediaFile ?? undefined, thumbnail: thumbnailFile ?? undefined });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof api.BakedCakesApiError ? err.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <button type="button" aria-label={t.close} className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D8CC] sticky top-0 bg-white">
          <h2 className="font-serif font-bold text-xl text-[#33221C]">{isCreate ? t.addCakeTitle : t.editCakeTitle}</h2>
          <button onClick={() => !saving && onClose()} aria-label={t.close} className="text-[#79665E] text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid md:grid-cols-2 gap-6">
          {/* Content / settings column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldName}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={saving}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldDescription}</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={saving}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-sm font-semibold text-[#633B2C]">{t.fieldAvailability}</label>
                <span className="group relative inline-flex">
                  <InfoIcon />
                  <span className="pointer-events-none absolute bottom-full start-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-[#33221C] text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition z-10">
                    {t.availabilityHelp}
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                {[{ value: true, label: t.available }, { value: false, label: t.notAvailable }].map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => setForm((f) => ({ ...f, is_available_to_order: opt.value }))}
                    disabled={saving}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${
                      form.is_available_to_order === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldStatus}</label>
              <div className="flex gap-2">
                {[{ value: "active" as const, label: t.statusActive }, { value: "paused" as const, label: t.statusPaused }].map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                    disabled={saving}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${
                      form.status === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldMediaType}</label>
              <div className="flex gap-2">
                {[{ value: "image" as const, label: t.mediaImage }, { value: "video" as const, label: t.mediaVideo }].map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleMediaTypeChange(opt.value)}
                    disabled={saving}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${
                      form.media_type === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Media / preview column */}
          <div className="space-y-4">
            {form.media_type === "image" ? (
              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.uploadPhoto}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#79665E] file:me-3 file:rounded-full file:border-0 file:bg-[#F8EEE5] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#633B2C]"
                />
                {currentMediaPreview ? (
                  <img src={currentMediaPreview} alt="" className="mt-3 w-full aspect-square object-cover rounded-xl border border-[#E8D8CC]" />
                ) : (
                  <div className="mt-3 w-full aspect-square rounded-xl border border-dashed border-[#E8D8CC] flex items-center justify-center text-xs text-[#B8A99B]">
                    {t.noFileChosen}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.uploadVideo}</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    disabled={saving}
                    onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-[#79665E] file:me-3 file:rounded-full file:border-0 file:bg-[#F8EEE5] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#633B2C]"
                  />
                  {mediaPreview ? (
                    <video src={mediaPreview} controls playsInline className="mt-3 w-full aspect-video rounded-xl border border-[#E8D8CC] bg-black" />
                  ) : !mediaTypeChanged && cake?.media_type === "video" ? (
                    <video src={cake.media_url} controls playsInline className="mt-3 w-full aspect-video rounded-xl border border-[#E8D8CC] bg-black" />
                  ) : (
                    <div className="mt-3 w-full aspect-video rounded-xl border border-dashed border-[#E8D8CC] flex items-center justify-center text-xs text-[#B8A99B]">
                      {t.noFileChosen}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.uploadThumbnail}</label>
                  <p className="text-xs text-[#79665E] mb-1.5">{t.thumbnailHelp}</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-[#79665E] file:me-3 file:rounded-full file:border-0 file:bg-[#F8EEE5] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#633B2C]"
                  />
                  {currentThumbnailPreview ? (
                    <img src={currentThumbnailPreview} alt="" className="mt-3 w-full aspect-video object-cover rounded-xl border border-[#E8D8CC]" />
                  ) : (
                    <div className="mt-3 w-full aspect-video rounded-xl border border-dashed border-[#E8D8CC] flex items-center justify-center text-xs text-[#B8A99B]">
                      {t.noFileChosen}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <p className="md:col-span-2 text-sm font-medium text-[#D96C7C]">{error}</p>}

          <div className="md:col-span-2 flex items-center gap-3 pt-2 border-t border-[#E8D8CC]">
            <button type="button" onClick={() => !saving && onClose()} disabled={saving} className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
              {t.cancel}
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
