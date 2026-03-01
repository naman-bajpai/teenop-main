type ParentApprovalTemplate = {
  subject?: string;
  heading?: string;
  body: string[];
  ctaLabel?: string;
};

// Replace these defaults with the exact approved copy once provided.
export const PARENT_APPROVAL_TEMPLATES = {
  parentEmail: {
    subject: "Parent approval needed for TeenOp account",
    heading: "Parent approval needed",
    body: [
      "Your teen started creating a TeenOp account and listed you as their parent or guardian.",
      "Please review their information and approve the account to let them go live on TeenOp.",
      "If you do not approve this request, no further action is needed and the account will remain pending.",
    ],
    ctaLabel: "Review and approve account",
  } satisfies ParentApprovalTemplate,
  parentSms: {
    body: [
      "TeenOp: Your teen started creating an account and listed you as their parent or guardian.",
      "Review and approve their account here:",
    ],
  } satisfies ParentApprovalTemplate,
  teenApprovedEmail: {
    subject: "Your TeenOp account has been approved",
    heading: "Your TeenOp account is approved",
    body: [
      "Your parent or guardian approved your TeenOp account.",
      "You can now sign in, finish setting up your profile, and get ready to go live on TeenOp.",
    ],
    ctaLabel: "Sign in to TeenOp",
  } satisfies ParentApprovalTemplate,
  teenApprovedSms: {
    body: [
      "TeenOp: Your parent or guardian approved your account.",
      "You can now sign in and continue setting up your profile.",
    ],
  } satisfies ParentApprovalTemplate,
} as const;

