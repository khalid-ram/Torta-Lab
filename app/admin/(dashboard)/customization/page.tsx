"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import * as api from "@/lib/api/customization";
import { useAdminUi } from "../admin-context";
import { adminT } from "../translations";
import { CORE_FLOW, PLACEABLE_CORE_STEP_KEYS, type CoreInputDefinition, type CoreStepKey } from "../../../core-flow";

type T = (typeof adminT)["en"]["customization"];
type Lang = "en" | "ar";

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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function coreStepTitle(step: (typeof CORE_FLOW)[number], lang: Lang) {
  return lang === "ar" ? step.titleAr : step.titleEn;
}
function coreInputLabel(input: CoreInputDefinition, lang: Lang) {
  return lang === "ar" ? input.labelAr : input.labelEn;
}
function coreInputTypeLabel(input: CoreInputDefinition, t: T) {
  return {
    selection: t.typeSelectionShort,
    "multi-select": t.typeMultiSelectShort,
    text: t.typeTextShort,
    textarea: t.typeTextareaShort,
    file: t.typeFileShort,
  }[input.type];
}

function Badge({ tone, children }: { tone: "core" | "custom" | "required" | "optional" | "active" | "paused" | "locked"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    core: "bg-[#F3EAE0] text-[#79665E]",
    custom: "bg-[#F3C7CC]/40 text-[#633B2C]",
    required: "bg-[#FCE8E6] text-[#B3261E]",
    optional: "bg-[#E8F5E9] text-[#2E7D32]",
    active: "bg-[#E8F5E9] text-[#2E7D32]",
    paused: "bg-[#F3EAE0] text-[#79665E]",
    locked: "bg-[#F3EAE0] text-[#633B2C]",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${styles[tone]}`}>{children}</span>;
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

function makeEmptyForm(initial?: Partial<FormState>): FormState {
  return {
    label: "",
    description: "",
    isRequired: true,
    fieldType: "text",
    selectionMode: "single",
    options: ["", ""],
    placementType: "separate_step",
    coreStepKey: "occasion",
    afterCoreStepKey: PLACEABLE_CORE_STEP_KEYS[PLACEABLE_CORE_STEP_KEYS.length - 1],
    ...initial,
  };
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
  const [formInitial, setFormInitial] = useState<Partial<FormState> | undefined>(undefined);

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

  const sameStepByCore = useMemo(() => {
    const map: Partial<Record<CoreStepKey, api.AdminField[]>> = {};
    for (const f of fields) if (f.placementType === "core_step" && f.coreStepKey) (map[f.coreStepKey] ??= []).push(f);
    for (const key of Object.keys(map) as CoreStepKey[]) map[key]!.sort((a, b) => a.order - b.order);
    return map;
  }, [fields]);

  const separateByCore = useMemo(() => {
    const map: Partial<Record<CoreStepKey, api.AdminField[]>> = {};
    for (const f of fields) if (f.placementType === "separate_step" && f.afterCoreStepKey) (map[f.afterCoreStepKey] ??= []).push(f);
    for (const key of Object.keys(map) as CoreStepKey[]) map[key]!.sort((a, b) => a.order - b.order);
    return map;
  }, [fields]);

  // Sequential page numbers across the whole flow: each Core Step, then
  // any Separate Step custom pages anchored after it — the exact order
  // the customer sees in /customize.
  const pageNumberById = useMemo(() => {
    const map: Record<string, number> = {};
    let n = 1;
    for (const step of CORE_FLOW) {
      map[step.key] = n++;
      for (const f of separateByCore[step.key as CoreStepKey] ?? []) map[f.id] = n++;
    }
    return map;
  }, [separateByCore]);

  const openAddInput = (coreStepKey: CoreStepKey) => {
    setEditingField(null);
    setFormInitial({ placementType: "core_step", coreStepKey });
    setFormOpen(true);
  };
  const openAddStep = () => {
    setEditingField(null);
    setFormInitial({ placementType: "separate_step" });
    setFormOpen(true);
  };
  const openEdit = (field: api.AdminField) => {
    setEditingField(field);
    setFormInitial(undefined);
    setFormOpen(true);
  };

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

  const groupKey = (field: api.AdminField) => `${field.placementType}:${field.coreStepKey ?? field.afterCoreStepKey}`;
  const isFirstInGroup = (field: api.AdminField) => fields.filter((f) => groupKey(f) === groupKey(field))[0]?.id === field.id;
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

  const fieldTypeLabel = (f: api.AdminField) => (f.fieldType === "text" ? t.typeText : f.fieldType === "number" ? t.typeNumber : t.typeSelection);

  const customRow = (field: api.AdminField) => (
    <div key={field.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#F3EAE0] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-[#33221C] text-sm">{field.label}</span>
          <Badge tone="custom">{t.sourceCustom}</Badge>
          <Badge tone={field.isRequired ? "required" : "optional"}>{field.isRequired ? t.required : t.optional}</Badge>
          <Badge tone={field.status === "active" ? "active" : "paused"}>{field.status === "active" ? t.statusActive : t.statusPaused}</Badge>
        </div>
        <p className="text-xs text-[#79665E] mt-0.5">{fieldTypeLabel(field)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {moveButtons(field)}
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
    </div>
  );

  const coreRow = (input: CoreInputDefinition) => (
    <div key={input.key} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#F3EAE0] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-[#33221C] text-sm">{coreInputLabel(input, lang)}</span>
          <Badge tone="core">{t.sourceCore}</Badge>
          <Badge tone={input.required ? "required" : "optional"}>{input.required ? t.required : t.optional}</Badge>
          {input.required && (
            <span className="group relative inline-flex">
              <Badge tone="locked">
                <LockIcon /> {t.locked}
              </Badge>
              <span className="pointer-events-none absolute bottom-full start-0 mb-2 w-60 rounded-lg bg-[#33221C] text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition z-10 normal-case font-normal leading-relaxed">
                {t.lockedTooltip}
              </span>
            </span>
          )}
        </div>
        <p className="text-xs text-[#79665E] mt-0.5">{coreInputTypeLabel(input, t)}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div dir={dir}>
        <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.title}</h1>
        <p className="text-sm text-[#79665E] mt-1">{t.subtitle}</p>
        <p className="mt-8 text-sm text-[#79665E]">{adminT[lang].loading}</p>
      </div>
    );
  }

  return (
    <div dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.title}</h1>
          <p className="text-sm text-[#79665E] mt-1">{t.subtitle}</p>
        </div>
        <button onClick={openAddStep} className="bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition whitespace-nowrap">
          {t.addStep}
        </button>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-[#D96C7C]">{error}</p>}

      <div className="mt-6 space-y-5">
        {CORE_FLOW.map((step) => {
          const customSameStep = sameStepByCore[step.key as CoreStepKey] ?? [];
          const separateAfter = separateByCore[step.key as CoreStepKey] ?? [];
          const inputCount = step.inputs.length + customSameStep.length;

          return (
            <div key={step.key}>
              <div className="border border-[#E8D8CC] rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FFFCF8] border-b border-[#E8D8CC]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-[#B8945F]">{t.pageLabel(pageNumberById[step.key])}</span>
                    <h2 className="font-serif font-bold text-[#33221C]">{coreStepTitle(step, lang)}</h2>
                    <Badge tone="core">{t.sourceCore}</Badge>
                    <span className="text-xs text-[#79665E]">{t.inputsCount(inputCount)}</span>
                  </div>
                  {step.key !== "review" && (
                    <button onClick={() => openAddInput(step.key as CoreStepKey)} className="text-sm font-semibold text-[#633B2C] hover:text-[#D96C7C] transition">
                      + {t.addInput}
                    </button>
                  )}
                </div>
                <div>
                  {step.inputs.map((input) => coreRow(input))}
                  {customSameStep.map((field) => customRow(field))}
                  {inputCount === 0 && step.key !== "review" && <p className="px-4 py-4 text-sm text-[#79665E]">{t.empty}</p>}
                </div>
              </div>

              {separateAfter.map((field) => (
                <div key={field.id} className="border border-[#E8D8CC] rounded-2xl overflow-hidden mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FFFCF8] border-b border-[#E8D8CC]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-semibold text-[#B8945F] shrink-0">{t.pageLabel(pageNumberById[field.id])}</span>
                      <h2 className="font-serif font-bold text-[#33221C] truncate">{field.label}</h2>
                      <Badge tone="custom">{t.sourceCustom}</Badge>
                      <span className="text-xs text-[#79665E] shrink-0">{t.inputsCount(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {moveButtons(field)}
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
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge tone={field.isRequired ? "required" : "optional"}>{field.isRequired ? t.required : t.optional}</Badge>
                          <Badge tone={field.status === "active" ? "active" : "paused"}>{field.status === "active" ? t.statusActive : t.statusPaused}</Badge>
                        </div>
                        <p className="text-xs text-[#79665E] mt-0.5">{fieldTypeLabel(field)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {formOpen && (
        <FieldFormModal
          t={t}
          lang={lang}
          field={editingField}
          initial={formInitial}
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
                ? confirmTarget.field.placementType === "separate_step"
                  ? t.confirmDeleteStepTitle
                  : t.confirmDeleteTitle
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
  lang,
  field,
  initial,
  onClose,
  onSaved,
}: {
  t: T;
  lang: Lang;
  field: api.AdminField | null;
  initial?: Partial<FormState>;
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
      : makeEmptyForm(initial),
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
                  {CORE_FLOW.filter((s) => s.key !== "review").map((step) => (
                    <option key={step.key} value={step.key}>{coreStepTitle(step, lang)}</option>
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
                  {CORE_FLOW.filter((s) => s.key !== "review").map((step) => (
                    <option key={step.key} value={step.key}>{coreStepTitle(step, lang)}</option>
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
