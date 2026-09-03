"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import * as api from "@/lib/api/customization";
import { useAdminUi } from "../admin-context";
import { adminT } from "../translations";

type T = (typeof adminT)["en"]["customization"];

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${direction === "down" ? "rotate-180" : ""}`}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function FieldActionsMenu({
  field,
  t,
  open,
  onToggle,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  field: api.AdminField;
  t: T;
  open: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const node = menuRef.current;
      if (!node) return;
      if (node.offsetParent === null) return;
      if (!node.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    <div className={`relative ${open ? "z-20" : ""}`} ref={menuRef}>
      <button
        onClick={() => onToggle(field.id)}
        aria-label={t.actionsMenu}
        aria-expanded={open}
        className="w-8 h-8 flex items-center justify-center rounded-full text-[#79665E] hover:bg-[#F8EEE5] hover:text-[#633B2C] transition"
      >
        <KebabIcon />
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-40 bg-white border border-[#E8D8CC] rounded-xl shadow-lg overflow-hidden z-30">
          <button onClick={() => { onClose(); onEdit(); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-[#633B2C] hover:bg-[#F8EEE5] transition">
            {t.edit}
          </button>
          <button
            onClick={() => { onClose(); onToggleStatus(); }}
            className={`w-full text-start px-4 py-2.5 text-sm font-medium transition hover:bg-[#F8EEE5] ${field.status === "active" ? "text-[#D96C7C]" : "text-[#2E7D32]"}`}
          >
            {field.status === "active" ? t.pause : t.activate}
          </button>
          <button onClick={() => { onClose(); onDelete(); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-[#B3261E] hover:bg-[#F8EEE5] transition">
            {t.deleteAction}
          </button>
        </div>
      )}
    </div>
  );
}

const emptyForm: FormState = {
  label: "",
  description: "",
  isRequired: true,
  fieldType: "text",
  selectionMode: "single",
  options: ["", ""],
  placementType: "separate_step",
  coreStepKey: "occasion",
  afterCoreStepKey: "occasion",
};

interface FormState {
  label: string;
  description: string;
  isRequired: boolean;
  fieldType: api.FieldType;
  selectionMode: api.SelectionMode;
  options: string[];
  placementType: api.PlacementType;
  coreStepKey: api.CoreStepKey;
  afterCoreStepKey: api.CoreStepKey;
}

export default function AdminCustomizationPage() {
  const { lang, dir } = useAdminUi();
  const t = adminT[lang].customization;
  const router = useRouter();
  const { logout } = useAuth();

  const [fields, setFields] = useState<api.AdminField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toggleMenu = useCallback((id: string) => setOpenMenuId((cur) => (cur === id ? null : id)), []);
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const [confirmTarget, setConfirmTarget] = useState<{ field: api.AdminField; action: "status" | "delete" } | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<api.AdminField | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFields(await api.listAdminFields());
    } catch (err) {
      if (err instanceof api.CustomizationApiError && err.status === 401) {
        await logout();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof api.CustomizationApiError ? err.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [logout, router, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => { setEditingField(null); setFormOpen(true); };
  const openEdit = (field: api.AdminField) => { setEditingField(field); setFormOpen(true); };

  const handleMove = async (field: api.AdminField, direction: "up" | "down") => {
    try {
      setFields(await api.moveField(field.id, direction));
    } catch (err) {
      setError(err instanceof api.CustomizationApiError ? err.message : t.errorGeneric);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    setActionPending(true);
    setActionError("");
    try {
      if (confirmTarget.action === "status") {
        await api.setFieldStatus(confirmTarget.field.id, confirmTarget.field.status === "active" ? "paused" : "active");
      } else {
        await api.deleteCustomizationField(confirmTarget.field.id);
      }
      setConfirmTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof api.CustomizationApiError ? err.message : t.errorGeneric);
    } finally {
      setActionPending(false);
    }
  };

  const typeLabel = (ft: api.FieldType) => (ft === "text" ? t.typeText : ft === "number" ? t.typeNumber : t.typeSelection);
  const coreStepLabel = (key: api.CoreStepKey) => t.coreSteps[key];
  const placementLabel = (field: api.AdminField) =>
    field.placementType === "core_step"
      ? t.placementSame(coreStepLabel(field.coreStepKey as api.CoreStepKey))
      : t.placementSeparate(coreStepLabel(field.afterCoreStepKey as api.CoreStepKey));

  // Move Up/Down operates within a field's own placement group (siblings
  // on the same Core Step, or siblings anchored after the same Core
  // Step), so boundaries are per-group, not global across the whole list.
  const groupKey = (field: api.AdminField) => `${field.placementType}:${field.coreStepKey ?? field.afterCoreStepKey}`;
  const isFirstInGroup = (field: api.AdminField) => {
    const group = fields.filter((f) => groupKey(f) === groupKey(field));
    return group[0]?.id === field.id;
  };
  const isLastInGroup = (field: api.AdminField) => {
    const group = fields.filter((f) => groupKey(f) === groupKey(field));
    return group[group.length - 1]?.id === field.id;
  };

  const moveButtons = (field: api.AdminField) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => void handleMove(field, "up")}
        disabled={isFirstInGroup(field)}
        aria-label={t.moveUp}
        className="w-7 h-7 flex items-center justify-center rounded-full text-[#79665E] hover:bg-[#F8EEE5] disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ArrowIcon direction="up" />
      </button>
      <button
        onClick={() => void handleMove(field, "down")}
        disabled={isLastInGroup(field)}
        aria-label={t.moveDown}
        className="w-7 h-7 flex items-center justify-center rounded-full text-[#79665E] hover:bg-[#F8EEE5] disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ArrowIcon direction="down" />
      </button>
    </div>
  );

  return (
    <div dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.title}</h1>
          <p className="text-sm text-[#79665E] mt-1">{t.subtitle}</p>
        </div>
        <button onClick={openCreate} className="bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition whitespace-nowrap">
          {t.addField}
        </button>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-[#D96C7C]">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-[#79665E]">{adminT[lang].loading}</p>
      ) : fields.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-[#79665E]">{t.empty}</p>
          <button onClick={openCreate} className="mt-4 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition">
            {t.addField}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block mt-6 border border-[#E8D8CC] rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8D8CC] bg-[#FFFCF8] text-start text-[#79665E]">
                  <th className="px-4 py-3 text-start font-semibold">{t.colOrder}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colField}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colType}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colRequired}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colPlacement}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colStatus}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.id} className="border-b border-[#F3EAE0] last:border-0 align-top">
                    <td className="px-4 py-3">{moveButtons(field)}</td>
                    <td className="px-4 py-3 font-medium text-[#33221C] max-w-[220px]">{field.label}</td>
                    <td className="px-4 py-3 text-[#79665E]">{typeLabel(field.fieldType)}</td>
                    <td className="px-4 py-3 text-[#79665E]">{field.isRequired ? t.required : t.optional}</td>
                    <td className="px-4 py-3 text-[#79665E]">{placementLabel(field)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${field.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                        {field.status === "active" ? t.statusActive : t.statusPaused}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <FieldActionsMenu
                        field={field}
                        t={t}
                        open={openMenuId === field.id}
                        onToggle={toggleMenu}
                        onClose={closeMenu}
                        onEdit={() => openEdit(field)}
                        onToggleStatus={() => setConfirmTarget({ field, action: "status" })}
                        onDelete={() => setConfirmTarget({ field, action: "delete" })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden mt-6 flex flex-col gap-3">
            {fields.map((field) => (
              <div key={field.id} className="border border-[#E8D8CC] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#33221C] block truncate">{field.label}</span>
                    <p className="text-sm text-[#79665E] mt-0.5">{typeLabel(field.fieldType)} · {field.isRequired ? t.required : t.optional}</p>
                  </div>
                  <FieldActionsMenu
                    field={field}
                    t={t}
                    open={openMenuId === field.id}
                    onToggle={toggleMenu}
                    onClose={closeMenu}
                    onEdit={() => openEdit(field)}
                    onToggleStatus={() => setConfirmTarget({ field, action: "status" })}
                    onDelete={() => setConfirmTarget({ field, action: "delete" })}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${field.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F3EAE0] text-[#79665E]"}`}>
                      {field.status === "active" ? t.statusActive : t.statusPaused}
                    </span>
                    <span className="text-xs text-[#79665E]">{placementLabel(field)}</span>
                  </div>
                  {moveButtons(field)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {formOpen && (
        <FieldFormModal
          t={t}
          field={editingField}
          onClose={() => setFormOpen(false)}
          onSaved={async () => { setFormOpen(false); await load(); }}
        />
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.cancel} className="absolute inset-0 bg-black/40" onClick={() => !actionPending && setConfirmTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <p className="font-serif font-bold text-lg text-[#33221C]">
              {confirmTarget.action === "delete"
                ? t.confirmDeleteTitle
                : confirmTarget.field.status === "active"
                  ? t.confirmPauseTitle
                  : t.confirmActivateTitle}
            </p>
            <p className="text-sm text-[#79665E] mt-2">{confirmTarget.field.label}</p>
            {confirmTarget.action === "delete" && <p className="text-xs text-[#B3261E] mt-2">{t.confirmDeleteBody}</p>}
            {actionError && <p className="text-sm font-medium text-[#D96C7C] mt-3">{actionError}</p>}
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmTarget(null)} disabled={actionPending} className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
                {t.cancel}
              </button>
              <button onClick={() => void handleConfirmAction()} disabled={actionPending} className="flex-1 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
                {t.confirmConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldFormModal({
  t,
  field,
  onClose,
  onSaved,
}: {
  t: T;
  field: api.AdminField | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = !field;
  const [form, setForm] = useState<FormState>(
    field
      ? {
          label: field.label,
          description: field.description ?? "",
          isRequired: field.isRequired,
          fieldType: field.fieldType,
          selectionMode: field.selectionMode ?? "single",
          options: field.options.length ? field.options.map((o) => o.label) : ["", ""],
          placementType: field.placementType,
          coreStepKey: field.coreStepKey ?? "occasion",
          afterCoreStepKey: field.afterCoreStepKey ?? "occasion",
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setOption = (index: number, value: string) => {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));
  };
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ""] }));
  const removeOption = (index: number) => setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.fieldType === "selection") {
      const nonBlank = form.options.map((o) => o.trim()).filter(Boolean);
      if (nonBlank.length < 2) {
        setError(t.optionsMinError);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: api.CustomizationFieldFormFields = {
        label: form.label,
        description: form.description,
        isRequired: form.isRequired,
        fieldType: form.fieldType,
        placementType: form.placementType,
      };
      if (form.fieldType === "selection") {
        payload.selectionMode = form.selectionMode;
        payload.options = form.options.map((o) => o.trim()).filter(Boolean).map((label) => ({ label }));
      }
      if (form.placementType === "core_step") {
        payload.coreStepKey = form.coreStepKey;
      } else {
        payload.afterCoreStepKey = form.afterCoreStepKey;
      }

      if (isCreate) {
        await api.createCustomizationField(payload);
      } else {
        await api.updateCustomizationField(field!.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof api.CustomizationApiError ? err.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <button type="button" aria-label={t.close} className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D8CC] sticky top-0 bg-white">
          <h2 className="font-serif font-bold text-xl text-[#33221C]">{isCreate ? t.addFieldTitle : t.editFieldTitle}</h2>
          <button onClick={() => !saving && onClose()} aria-label={t.close} className="text-[#79665E] text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldLabel}</label>
            <input
              type="text"
              required
              value={form.label}
              placeholder={t.fieldLabelPlaceholder}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              disabled={saving}
              className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldDescription}</label>
            <input
              type="text"
              value={form.description}
              placeholder={t.fieldDescriptionPlaceholder}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={saving}
              className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldRequired}</label>
            <p className="text-xs text-[#79665E] mb-1.5">{t.requiredHelp}</p>
            <div className="flex gap-2">
              {[{ value: true, label: t.required }, { value: false, label: t.optional }].map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setForm((f) => ({ ...f, isRequired: opt.value }))}
                  disabled={saving}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${form.isRequired === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.fieldType}</label>
            <div className="flex gap-2">
              {[
                { value: "text" as const, label: t.typeText },
                { value: "number" as const, label: t.typeNumber },
                { value: "selection" as const, label: t.typeSelection },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, fieldType: opt.value }))}
                  disabled={saving}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${form.fieldType === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.fieldType === "selection" && (
            <div className="space-y-4 rounded-xl border border-[#E8D8CC] p-4 bg-[#FFFCF8]">
              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.selectionModeLabel}</label>
                <div className="flex gap-2">
                  {[{ value: "single" as const, label: t.singleSelect }, { value: "multi" as const, label: t.multiSelect }].map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setForm((f) => ({ ...f, selectionMode: opt.value }))}
                      disabled={saving}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${form.selectionMode === opt.value ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] bg-white text-[#79665E]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.optionsLabel}</label>
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        placeholder={t.optionPlaceholder(index + 1)}
                        onChange={(e) => setOption(index, e.target.value)}
                        disabled={saving}
                        className="flex-1 border border-[#E8D8CC] rounded-xl px-4 py-2 text-sm bg-white disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={saving || form.options.length <= 2}
                        className="text-xs font-semibold text-[#B3261E] disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        {t.removeOption}
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addOption} disabled={saving} className="mt-2 text-sm font-semibold text-[#633B2C] underline">
                  {t.addOption}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.placementLabel}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, placementType: "core_step" }))}
                disabled={saving}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${form.placementType === "core_step" ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"}`}
              >
                {t.placementSameStepOption}
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, placementType: "separate_step" }))}
                disabled={saving}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition ${form.placementType === "separate_step" ? "border-[#D96C7C] bg-[#D96C7C]/10 text-[#633B2C]" : "border-[#E8D8CC] text-[#79665E]"}`}
              >
                {t.placementSeparateStepOption}
              </button>
            </div>

            {form.placementType === "core_step" ? (
              <div className="mt-3">
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.coreStepLabel}</label>
                <select
                  value={form.coreStepKey}
                  onChange={(e) => setForm((f) => ({ ...f, coreStepKey: e.target.value as api.CoreStepKey }))}
                  disabled={saving}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                >
                  {api.CORE_STEP_KEYS.map((key) => (
                    <option key={key} value={key}>{t.coreSteps[key]}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-3">
                <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.insertAfterLabel}</label>
                <select
                  value={form.afterCoreStepKey}
                  onChange={(e) => setForm((f) => ({ ...f, afterCoreStepKey: e.target.value as api.CoreStepKey }))}
                  disabled={saving}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                >
                  {api.CORE_STEP_KEYS.map((key) => (
                    <option key={key} value={key}>{t.coreSteps[key]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm font-medium text-[#D96C7C]">{error}</p>}

          <div className="flex items-center gap-3 pt-2 border-t border-[#E8D8CC]">
            <button type="button" onClick={() => !saving && onClose()} disabled={saving} className="flex-1 border border-[#E8D8CC] text-[#633B2C] rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60">
              {t.close}
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
