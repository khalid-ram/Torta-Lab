import type { Lang } from "./admin-context";

export const adminT: Record<Lang, {
  nav: { dashboard: string; users: string; bakedCakes: string; customization: string };
  topbar: { badge: string; logout: string };
  forbidden: { title: string; body: string; home: string };
  loading: string;
  close: string;
  dashboard: { welcome: string; manageTitle: string; manageDesc: string; manageCta: string };
  users: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    roleLabel: string;
    statusLabel: string;
    all: string;
    roleAdmin: string;
    roleBuyer: string;
    statusActive: string;
    statusInactive: string;
    colName: string;
    colUsername: string;
    colPhone: string;
    colRole: string;
    colStatus: string;
    colCreated: string;
    colActions: string;
    actionsMenu: string;
    edit: string;
    activate: string;
    deactivate: string;
    you: string;
    empty: string;
    errorGeneric: string;
    pagePrev: string;
    pageNext: string;
    pageInfo: (page: number, totalPages: number) => string;
    confirmDeactivateTitle: string;
    confirmActivateTitle: string;
    cancel: string;
    confirmConfirm: string;
    editTitle: string;
    detailUpdatedAt: string;
    save: string;
    saving: string;
    invalidPhone: string;
    close: string;
  };
  bakedCakes: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    statusLabel: string;
    availabilityLabel: string;
    mediaLabel: string;
    all: string;
    statusActive: string;
    statusPaused: string;
    available: string;
    notAvailable: string;
    mediaImage: string;
    mediaVideo: string;
    colId: string;
    colName: string;
    colDescription: string;
    colAvailability: string;
    colStatus: string;
    colMedia: string;
    colCreated: string;
    colActions: string;
    actionsMenu: string;
    edit: string;
    activate: string;
    pause: string;
    empty: string;
    errorGeneric: string;
    pagePrev: string;
    pageNext: string;
    pageInfo: (page: number, totalPages: number) => string;
    confirmPauseTitle: string;
    confirmActivateTitle: string;
    cancel: string;
    confirmConfirm: string;
    addCake: string;
    addCakeTitle: string;
    editCakeTitle: string;
    save: string;
    saving: string;
    close: string;
    fieldName: string;
    fieldDescription: string;
    fieldAvailability: string;
    availabilityHelp: string;
    fieldStatus: string;
    fieldMediaType: string;
    uploadPhoto: string;
    uploadVideo: string;
    uploadThumbnail: string;
    thumbnailHelp: string;
    changeFile: string;
    noFileChosen: string;
    viewPhoto: string;
    viewVideo: string;
    videoBadge: string;
  };
  customization: {
    title: string;
    subtitle: string;
    addField: string;
    colOrder: string;
    colField: string;
    colType: string;
    colRequired: string;
    colPlacement: string;
    colStatus: string;
    colActions: string;
    typeText: string;
    typeNumber: string;
    typeSelection: string;
    required: string;
    optional: string;
    placementSeparate: (afterLabel: string) => string;
    placementSame: (coreLabel: string) => string;
    statusActive: string;
    statusPaused: string;
    actionsMenu: string;
    edit: string;
    activate: string;
    pause: string;
    moveUp: string;
    moveDown: string;
    deleteAction: string;
    empty: string;
    errorGeneric: string;
    confirmPauseTitle: string;
    confirmActivateTitle: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    cancel: string;
    confirmConfirm: string;
    addFieldTitle: string;
    editFieldTitle: string;
    fieldLabel: string;
    fieldLabelPlaceholder: string;
    fieldDescription: string;
    fieldDescriptionPlaceholder: string;
    fieldRequired: string;
    requiredHelp: string;
    fieldType: string;
    selectionModeLabel: string;
    singleSelect: string;
    multiSelect: string;
    optionsLabel: string;
    addOption: string;
    removeOption: string;
    optionPlaceholder: (n: number) => string;
    optionsMinError: string;
    placementLabel: string;
    placementSameStepOption: string;
    placementSeparateStepOption: string;
    coreStepLabel: string;
    coreStepPlaceholder: string;
    insertAfterLabel: string;
    insertAfterPlaceholder: string;
    save: string;
    saving: string;
    close: string;
    // Step/page-based flow view
    addStep: string;
    addStepTitle: string;
    addInput: string;
    pageLabel: (n: number) => string;
    sourceCore: string;
    sourceCustom: string;
    inputsCount: (n: number) => string;
    locked: string;
    lockedTooltip: string;
    typeSelectionShort: string;
    typeMultiSelectShort: string;
    typeTextShort: string;
    typeTextareaShort: string;
    typeFileShort: string;
    confirmDeleteStepTitle: string;
  };
}> = {
  en: {
    nav: { dashboard: "Dashboard", users: "User Management", bakedCakes: "Baked Cakes", customization: "Customization" },
    topbar: { badge: "Admin", logout: "Log out" },
    close: "Close",
    forbidden: {
      title: "Access denied",
      body: "Your account does not have admin access.",
      home: "Go to homepage",
    },
    loading: "Loading...",
    dashboard: {
      welcome: "Welcome",
      manageTitle: "Manage your users",
      manageDesc: "View, search, and update buyer and admin accounts.",
      manageCta: "Open User Management",
    },
    users: {
      title: "User Management",
      subtitle: "View and manage buyer and admin accounts.",
      searchPlaceholder: "Search by name, username, or phone",
      roleLabel: "Role",
      statusLabel: "Status",
      all: "All",
      roleAdmin: "Admin",
      roleBuyer: "Buyer",
      statusActive: "Active",
      statusInactive: "Inactive",
      colName: "Name",
      colUsername: "Username",
      colPhone: "Phone",
      colRole: "Role",
      colStatus: "Status",
      colCreated: "Created At",
      colActions: "Actions",
      actionsMenu: "Actions",
      edit: "Edit",
      activate: "Activate",
      deactivate: "Deactivate",
      you: "You",
      empty: "No users found.",
      errorGeneric: "Something went wrong. Please try again.",
      pagePrev: "Previous",
      pageNext: "Next",
      pageInfo: (page, totalPages) => `Page ${page} of ${totalPages}`,
      confirmDeactivateTitle: "Deactivate this user?",
      confirmActivateTitle: "Activate this user?",
      cancel: "Cancel",
      confirmConfirm: "Confirm",
      editTitle: "Edit user",
      detailUpdatedAt: "Updated At",
      save: "Save",
      saving: "Saving...",
      invalidPhone: "Enter a valid phone number.",
      close: "Close",
    },
    bakedCakes: {
      title: "Baked Cakes",
      subtitle: "Manage the cakes shown in the Our Work section.",
      searchPlaceholder: "Search by cake name or description",
      statusLabel: "Status",
      availabilityLabel: "Availability",
      mediaLabel: "Media",
      all: "All",
      statusActive: "Active",
      statusPaused: "Paused",
      available: "Available",
      notAvailable: "Not Available",
      mediaImage: "Photo",
      mediaVideo: "Video",
      colId: "ID",
      colName: "Cake Name",
      colDescription: "Description",
      colAvailability: "Availability",
      colStatus: "Status",
      colMedia: "Media",
      colCreated: "Created At",
      colActions: "Actions",
      actionsMenu: "Actions",
      edit: "Edit",
      activate: "Activate",
      pause: "Pause",
      empty: "No baked cakes yet.",
      errorGeneric: "Something went wrong. Please try again.",
      pagePrev: "Previous",
      pageNext: "Next",
      pageInfo: (page, totalPages) => `Page ${page} of ${totalPages}`,
      confirmPauseTitle: "Pause this cake?",
      confirmActivateTitle: "Activate this cake?",
      cancel: "Cancel",
      confirmConfirm: "Confirm",
      addCake: "Add Cake",
      addCakeTitle: "Add Cake",
      editCakeTitle: "Edit Cake",
      save: "Save",
      saving: "Saving...",
      close: "Close",
      fieldName: "Cake Name",
      fieldDescription: "Description",
      fieldAvailability: "Available to Order",
      availabilityHelp: "Available to Order means customers can request this cake design.",
      fieldStatus: "Status",
      fieldMediaType: "Media Type",
      uploadPhoto: "Upload Photo",
      uploadVideo: "Upload Video",
      uploadThumbnail: "Video Thumbnail",
      thumbnailHelp: "This image will appear on the card before the video is played.",
      changeFile: "Change file",
      noFileChosen: "No file chosen",
      viewPhoto: "View Photo",
      viewVideo: "View Video",
      videoBadge: "Video",
    },
    customization: {
      title: "Customization",
      subtitle: "Manage the questions customers answer while designing a cake.",
      addField: "Add Field",
      colOrder: "Order",
      colField: "Field",
      colType: "Type",
      colRequired: "Required",
      colPlacement: "Placement",
      colStatus: "Status",
      colActions: "Actions",
      typeText: "Free Text",
      typeNumber: "Numbers Only",
      typeSelection: "Selection",
      required: "Required",
      optional: "Optional",
      placementSeparate: (afterLabel) => `Separate Step — After ${afterLabel}`,
      placementSame: (coreLabel) => `Same Step — ${coreLabel}`,
      statusActive: "Active",
      statusPaused: "Paused",
      actionsMenu: "Actions",
      edit: "Edit",
      activate: "Activate",
      pause: "Pause",
      moveUp: "Move Up",
      moveDown: "Move Down",
      deleteAction: "Delete",
      empty: "No customization fields yet.",
      errorGeneric: "Something went wrong. Please try again.",
      confirmPauseTitle: "Pause this field?",
      confirmActivateTitle: "Activate this field?",
      confirmDeleteTitle: "Delete this field?",
      confirmDeleteBody: "This cannot be undone. Customers will stop seeing this question immediately.",
      cancel: "Cancel",
      confirmConfirm: "Confirm",
      addFieldTitle: "Add Field",
      editFieldTitle: "Edit Field",
      fieldLabel: "Question / Label",
      fieldLabelPlaceholder: "e.g. How many candles?",
      fieldDescription: "Helper Text (optional)",
      fieldDescriptionPlaceholder: "Extra context shown under the question",
      fieldRequired: "Required",
      requiredHelp: "Required means the customer cannot continue without answering.",
      fieldType: "Field Type",
      selectionModeLabel: "Selection Behavior",
      singleSelect: "Single Select",
      multiSelect: "Multi Select",
      optionsLabel: "Options",
      addOption: "Add Option",
      removeOption: "Remove",
      optionPlaceholder: (n) => `Option ${n}`,
      optionsMinError: "Add at least 2 options.",
      placementLabel: "Placement",
      placementSameStepOption: "Same Step",
      placementSeparateStepOption: "Separate Step",
      coreStepLabel: "Core Step",
      coreStepPlaceholder: "Select a step",
      insertAfterLabel: "Insert After",
      insertAfterPlaceholder: "Select a step",
      save: "Save",
      saving: "Saving...",
      close: "Close",
      addStep: "Add Step",
      addStepTitle: "Add Step",
      addInput: "Add Input",
      pageLabel: (n) => `Page ${n}`,
      sourceCore: "Core",
      sourceCustom: "Custom",
      inputsCount: (n) => `${n} ${n === 1 ? "input" : "inputs"}`,
      locked: "Locked",
      lockedTooltip: "Required core fields are part of the essential cake flow and cannot be edited.",
      typeSelectionShort: "Selection",
      typeMultiSelectShort: "Multi Select",
      typeTextShort: "Text",
      typeTextareaShort: "Long Text",
      typeFileShort: "Photo Upload",
      confirmDeleteStepTitle: "Delete this step?",
    },
  },
  ar: {
    nav: { dashboard: "لوحة التحكم", users: "إدارة المستخدمين", bakedCakes: "تورتنا", customization: "التخصيص" },
    topbar: { badge: "مدير", logout: "تسجيل الخروج" },
    close: "إغلاق",
    forbidden: {
      title: "غير مصرح بالدخول",
      body: "حسابك لا يملك صلاحية الوصول للوحة التحكم.",
      home: "الرجوع للرئيسية",
    },
    loading: "جارٍ التحميل...",
    dashboard: {
      welcome: "أهلاً بيك",
      manageTitle: "إدارة المستخدمين",
      manageDesc: "استعرض وابحث وحدّث حسابات المشترين والمديرين.",
      manageCta: "افتح إدارة المستخدمين",
    },
    users: {
      title: "إدارة المستخدمين",
      subtitle: "استعرض وأدر حسابات المشترين والمديرين.",
      searchPlaceholder: "ابحث بالاسم أو اسم المستخدم أو رقم الهاتف",
      roleLabel: "الدور",
      statusLabel: "الحالة",
      all: "الكل",
      roleAdmin: "مدير",
      roleBuyer: "مستخدم",
      statusActive: "نشط",
      statusInactive: "غير نشط",
      colName: "الاسم",
      colUsername: "اسم المستخدم",
      colPhone: "رقم الهاتف",
      colRole: "الدور",
      colStatus: "الحالة",
      colCreated: "تاريخ الإنشاء",
      colActions: "الإجراءات",
      actionsMenu: "الإجراءات",
      edit: "تعديل",
      activate: "تفعيل",
      deactivate: "إيقاف",
      you: "أنت",
      empty: "لا يوجد مستخدمين.",
      errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
      pagePrev: "السابق",
      pageNext: "التالي",
      pageInfo: (page, totalPages) => `صفحة ${page} من ${totalPages}`,
      confirmDeactivateTitle: "هل تريد إيقاف هذا المستخدم؟",
      confirmActivateTitle: "هل تريد تفعيل هذا المستخدم؟",
      cancel: "إلغاء",
      confirmConfirm: "تأكيد",
      editTitle: "تعديل بيانات المستخدم",
      detailUpdatedAt: "آخر تحديث",
      save: "حفظ",
      saving: "جارٍ الحفظ...",
      invalidPhone: "أدخل رقم هاتف صحيح.",
      close: "إغلاق",
    },
    bakedCakes: {
      title: "تورتنا",
      subtitle: "أدر التورتات الظاهرة في قسم شغلنا.",
      searchPlaceholder: "ابحث باسم التورتة أو الوصف",
      statusLabel: "الحالة",
      availabilityLabel: "التوفر",
      mediaLabel: "الوسائط",
      all: "الكل",
      statusActive: "نشط",
      statusPaused: "متوقف",
      available: "متاح",
      notAvailable: "غير متاح",
      mediaImage: "صورة",
      mediaVideo: "فيديو",
      colId: "المعرف",
      colName: "اسم التورتة",
      colDescription: "الوصف",
      colAvailability: "التوفر",
      colStatus: "الحالة",
      colMedia: "الوسائط",
      colCreated: "تاريخ الإنشاء",
      colActions: "الإجراءات",
      actionsMenu: "الإجراءات",
      edit: "تعديل",
      activate: "تفعيل",
      pause: "إيقاف",
      empty: "لا يوجد تورتات حتى الآن.",
      errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
      pagePrev: "السابق",
      pageNext: "التالي",
      pageInfo: (page, totalPages) => `صفحة ${page} من ${totalPages}`,
      confirmPauseTitle: "هل تريد إيقاف هذه التورتة؟",
      confirmActivateTitle: "هل تريد تفعيل هذه التورتة؟",
      cancel: "إلغاء",
      confirmConfirm: "تأكيد",
      addCake: "إضافة تورتة",
      addCakeTitle: "إضافة تورتة",
      editCakeTitle: "تعديل التورتة",
      save: "حفظ",
      saving: "جارٍ الحفظ...",
      close: "إغلاق",
      fieldName: "اسم التورتة",
      fieldDescription: "الوصف",
      fieldAvailability: "متاح للطلب",
      availabilityHelp: "متاح للطلب يعني أن العميل يمكنه طلب نفس تصميم التورتة.",
      fieldStatus: "الحالة",
      fieldMediaType: "نوع الوسائط",
      uploadPhoto: "رفع صورة",
      uploadVideo: "رفع فيديو",
      uploadThumbnail: "صورة الفيديو",
      thumbnailHelp: "هذه الصورة ستظهر على الكارت قبل تشغيل الفيديو.",
      changeFile: "تغيير الملف",
      noFileChosen: "لم يتم اختيار ملف",
      viewPhoto: "عرض الصورة",
      viewVideo: "عرض الفيديو",
      videoBadge: "فيديو",
    },
    customization: {
      title: "التخصيص",
      subtitle: "أدر الأسئلة اللي العميل بيجاوب عليها وهو بيصمم التورتة.",
      addField: "إضافة حقل",
      colOrder: "الترتيب",
      colField: "الحقل",
      colType: "النوع",
      colRequired: "إلزامي",
      colPlacement: "المكان",
      colStatus: "الحالة",
      colActions: "الإجراءات",
      typeText: "نص حر",
      typeNumber: "أرقام فقط",
      typeSelection: "اختيار",
      required: "إلزامي",
      optional: "اختياري",
      placementSeparate: (afterLabel) => `خطوة منفصلة — بعد ${afterLabel}`,
      placementSame: (coreLabel) => `نفس الخطوة — ${coreLabel}`,
      statusActive: "نشط",
      statusPaused: "متوقف",
      actionsMenu: "الإجراءات",
      edit: "تعديل",
      activate: "تفعيل",
      pause: "إيقاف",
      moveUp: "تحريك لأعلى",
      moveDown: "تحريك لأسفل",
      deleteAction: "حذف",
      empty: "لا يوجد حقول تخصيص حتى الآن.",
      errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
      confirmPauseTitle: "هل تريد إيقاف هذا الحقل؟",
      confirmActivateTitle: "هل تريد تفعيل هذا الحقل؟",
      confirmDeleteTitle: "هل تريد حذف هذا الحقل؟",
      confirmDeleteBody: "لا يمكن التراجع عن هذا الإجراء. سيختفي هذا السؤال للعملاء فورًا.",
      cancel: "إلغاء",
      confirmConfirm: "تأكيد",
      addFieldTitle: "إضافة حقل",
      editFieldTitle: "تعديل الحقل",
      fieldLabel: "السؤال / العنوان",
      fieldLabelPlaceholder: "مثال: عدد الشموع؟",
      fieldDescription: "نص مساعد (اختياري)",
      fieldDescriptionPlaceholder: "توضيح إضافي يظهر تحت السؤال",
      fieldRequired: "إلزامي",
      requiredHelp: "الحقل الإلزامي يمنع العميل من المتابعة قبل الإجابة عليه.",
      fieldType: "نوع الحقل",
      selectionModeLabel: "طريقة الاختيار",
      singleSelect: "اختيار واحد",
      multiSelect: "اختيار متعدد",
      optionsLabel: "الخيارات",
      addOption: "إضافة خيار",
      removeOption: "إزالة",
      optionPlaceholder: (n) => `الخيار ${n}`,
      optionsMinError: "أضف خيارين على الأقل.",
      placementLabel: "المكان",
      placementSameStepOption: "نفس الخطوة",
      placementSeparateStepOption: "خطوة منفصلة",
      coreStepLabel: "الخطوة الأساسية",
      coreStepPlaceholder: "اختار خطوة",
      insertAfterLabel: "أضف بعد",
      insertAfterPlaceholder: "اختار خطوة",
      save: "حفظ",
      saving: "جارٍ الحفظ...",
      close: "إغلاق",
      addStep: "إضافة خطوة",
      addStepTitle: "إضافة خطوة",
      addInput: "إضافة حقل",
      pageLabel: (n) => `الصفحة ${n}`,
      sourceCore: "أساسي",
      sourceCustom: "مخصص",
      inputsCount: (n) => `${n} ${n === 1 ? "حقل" : "حقول"}`,
      locked: "مقفول",
      lockedTooltip: "الحقول الأساسية المطلوبة جزء من خطوات تصميم التورتة ولا يمكن تعديلها.",
      typeSelectionShort: "اختيار",
      typeMultiSelectShort: "اختيار متعدد",
      typeTextShort: "نص",
      typeTextareaShort: "نص طويل",
      typeFileShort: "رفع صورة",
      confirmDeleteStepTitle: "هل تريد حذف هذه الخطوة؟",
    },
  },
};
