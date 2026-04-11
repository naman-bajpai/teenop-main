"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TeenProviderDisclaimer from "@/components/auth/TeenProviderDisclaimer";
export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "teen" as "teen" | "parent",
    parentEmail: "",
    parentPhone: "",
    parentPermission: false,
    terms: false,
    accessCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    age?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    parentEmail?: string;
    parentPhone?: string;
    parentPermission?: string;
    accessCode?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");

  // Validation functions
  const sanitizeInput = (value: string): string => {
    // Remove leading/trailing whitespace and prevent XSS
    return value.trim().replace(/[<>]/g, '');
  };

  const validateName = (name: string, fieldName: string): string | null => {
    if (!name.trim()) {
      return `${fieldName} is required`;
    }
    if (name.length < 2) {
      return `${fieldName} must be at least 2 characters`;
    }
    if (name.length > 50) {
      return `${fieldName} must be less than 50 characters`;
    }
    // Allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }
    return null;
  };

  const validateEmail = (email: string, fieldName: string = "Email"): string | null => {
    if (!email.trim()) {
      return `${fieldName} is required`;
    }
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return `Please enter a valid ${fieldName.toLowerCase()} address`;
    }
    if (email.length > 254) {
      return `${fieldName} address is too long`;
    }
    return null;
  };

  const TEEN_ALLOWED_DOMAIN = "sses.saintstephens.org";
  const isAllowedTeenEmail = (email: string): boolean => {
    const domain = email.trim().split("@")[1] || "";
    return domain.toLowerCase() === TEEN_ALLOWED_DOMAIN;
  };

  const validateAge = (age: string): string | null => {
    if (!age) {
      return "Age is required for teen accounts";
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
      return "Age must be a valid number";
    }
    if (ageNum < 13 || ageNum > 19) {
      return "Age must be between 13 and 19";
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (password.length > 128) {
      return "Password is too long (maximum 128 characters)";
    }
    // Check for potentially dangerous characters
    if (/[<>]/.test(password)) {
      return "Password contains invalid characters";
    }
    // Optional: Check for password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strengthScore = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
    if (strengthScore < 2) {
      return "Password should contain at least 2 of: uppercase, lowercase, numbers, or special characters";
    }
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) {
      return null; // Phone is optional
    }
    // Remove common phone formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's a valid phone number (10-15 digits)
    if (!/^\d{10,15}$/.test(cleaned)) {
      return "Please enter a valid phone number (10-15 digits)";
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    // Sanitize text inputs
    const sanitizedValue = type === "checkbox" ? checked : 
      (type === "email" || type === "tel" || name.includes("Email") || name.includes("Phone") 
        ? sanitizeInput(value) 
        : (name === "firstName" || name === "lastName" 
          ? sanitizeInput(value) 
          : value));
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : sanitizedValue,
    }));
    
    // Real-time validation (only for string inputs)
    if (name === "firstName" && typeof sanitizedValue === "string") {
      const error = validateName(sanitizedValue, "First name");
      setFieldErrors(prev => ({ ...prev, firstName: error || undefined }));
    } else if (name === "lastName" && typeof sanitizedValue === "string") {
      const error = validateName(sanitizedValue, "Last name");
      setFieldErrors(prev => ({ ...prev, lastName: error || undefined }));
    } else if (name === "email" && typeof sanitizedValue === "string") {
      let error = validateEmail(sanitizedValue);
      if (!error && formData.role === "teen" && sanitizedValue && !isAllowedTeenEmail(sanitizedValue)) {
        error = `Teen accounts require an @${TEEN_ALLOWED_DOMAIN} email address.`;
      }
      setFieldErrors(prev => ({ ...prev, email: error || undefined }));
    } else if (name === "age") {
      const error = validateAge(value);
      setFieldErrors(prev => ({ ...prev, age: error || undefined }));
    } else if (name === "phone" && typeof sanitizedValue === "string") {
      const error = validatePhone(sanitizedValue);
      setFieldErrors(prev => ({ ...prev, phone: error || undefined }));
    } else if (name === "password") {
      const error = validatePassword(value);
      setFieldErrors(prev => ({ ...prev, password: error || undefined }));
      // Also validate confirm password if it has a value
      if (formData.confirmPassword) {
        const confirmError = value !== formData.confirmPassword ? "Passwords do not match" : null;
        setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }));
      }
    } else if (name === "confirmPassword") {
      const error = value !== formData.password ? "Passwords do not match" : null;
      setFieldErrors(prev => ({ ...prev, confirmPassword: error || undefined }));
    } else if (name === "parentEmail" && typeof sanitizedValue === "string") {
      const error = validateEmail(sanitizedValue, "Parent email");
      setFieldErrors(prev => ({ ...prev, parentEmail: error || undefined }));
    } else if (name === "parentPhone" && typeof sanitizedValue === "string") {
      const error = validatePhone(sanitizedValue);
      setFieldErrors(prev => ({ ...prev, parentPhone: error || undefined }));
    } else if (name === "accessCode") {
      const error = value !== "teenopfalcons" ? "Invalid access code" : null;
      setFieldErrors(prev => ({ ...prev, accessCode: error || undefined }));
    } else if (name === "role") {
      // When switching to teen, re-validate email for allowed domain
      if (value === "teen" && formData.email) {
        const emailErr = validateEmail(formData.email);
        const domainErr = !emailErr && !isAllowedTeenEmail(formData.email) ? `Teen accounts require an @${TEEN_ALLOWED_DOMAIN} email address.` : null;
        setFieldErrors(prev => ({ ...prev, email: emailErr || domainErr || undefined }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: undefined }));
      }
    }

    // Clear errors when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    const errors: typeof fieldErrors = {};
    let hasErrors = false;

    // Validate first name
    const firstNameError = validateName(formData.firstName, "First name");
    if (firstNameError) {
      errors.firstName = firstNameError;
      hasErrors = true;
    }

    // Validate last name
    const lastNameError = validateName(formData.lastName, "Last name");
    if (lastNameError) {
      errors.lastName = lastNameError;
      hasErrors = true;
    }

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) {
      errors.email = emailError;
      hasErrors = true;
    } else if (formData.role === "teen" && formData.email && !isAllowedTeenEmail(formData.email)) {
      errors.email = `Teen accounts require an @${TEEN_ALLOWED_DOMAIN} email address.`;
      hasErrors = true;
    }

    // Validate age for teen accounts
    if (formData.role === "teen") {
      const ageError = validateAge(formData.age);
      if (ageError) {
        errors.age = ageError;
        hasErrors = true;
      }

      if (!formData.parentPermission) {
        errors.parentPermission = "You must confirm that you have parent or guardian permission.";
        hasErrors = true;
      }
    }

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      errors.password = passwordError;
      hasErrors = true;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      hasErrors = true;
    }

    // Validate access code
    if (formData.accessCode !== "teenopfalcons") {
      errors.accessCode = "Invalid access code";
      hasErrors = true;
    }

    // Validate terms
    if (!formData.terms) {
      setError(
        formData.role === "teen"
          ? "You must agree to the Terms of Service and Privacy Agreement"
          : "You must agree to the Terms of Service and Liability Waiver"
      );
      hasErrors = true;
    }

    // Validate parent email for teen accounts
    if (formData.role === "teen") {
      const parentEmailError = validateEmail(formData.parentEmail, "Parent email");
      if (parentEmailError) {
        errors.parentEmail = parentEmailError;
        hasErrors = true;
      }
    }

    // Validate parent phone if provided
    if (formData.role === "teen") {
      const parentPhoneError = validatePhone(formData.parentPhone);
      if (parentPhoneError) {
        errors.parentPhone = parentPhoneError;
        hasErrors = true;
      }
    }

    setFieldErrors(errors);
    
    if (hasErrors) {
      setError("Please fix the errors above");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    // Show disclaimer dialog for teen users
    if (formData.role === "teen") {
      setShowDisclaimer(true);
      return;
    }

    // For parent users, proceed directly
    await submitForm();
  };

  const submitForm = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: formData.role === "teen" ? parseInt(formData.age) : undefined,
          phone: formData.phone || undefined,
          role: formData.role || 'teen',
          parentEmail: formData.parentEmail || undefined,
          parentPhone: formData.parentPhone || undefined,
          parentPermission: formData.parentPermission,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 429) {
        setRateLimitMessage(
          typeof result.error === "string"
            ? result.error
            : "Too many signup attempts. Please wait and try again."
        );
        setRateLimitOpen(true);
        return;
      }

      if (!response.ok) {
        console.error("Signup error:", result);
        setError(
          typeof result.error === "string" ? result.error : "Failed to create account"
        );
        return;
      }

      setSuccess(
        result.requiresParentVerification
          ? "Account created. A verification email was sent to your parent/guardian. They must confirm before you can log in."
          : "Account created successfully! Please check your email for verification."
      );
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        age: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "teen",
        parentEmail: "",
        parentPhone: "",
        parentPermission: false,
        terms: false,
        accessCode: "",
      });
      
      // Teens: parent must verify first, so send to login (they'll see "account not active" until parent confirms)
      // Parents: go to login
      const redirectPath = result.requiresParentVerification ? "/pending-approval" : "/login";
      setTimeout(() => {
        router.push(redirectPath);
      }, 3000);
    } catch (error) {
      console.error('Signup error:', error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    submitForm();
  };

  const handleDisclaimerClose = () => {
    setShowDisclaimer(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <Image
        src="/images/signup.png"
        alt=""
        fill
        priority
        aria-hidden
        className="object-cover"
        sizes="100vw"
      />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/newlogo copy.png" alt="TeenOp" width={220} height={48} className="h-8 w-auto brightness-0 invert sm:h-9" priority />
          </Link>
          <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15">
            Login
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/20 bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-8">
            <div className="mb-7">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign up</h2>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 p-3.5">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <label htmlFor="role" className="mb-2 block text-sm font-semibold text-slate-700">Account type</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 transition-all focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                  disabled={isSubmitting}
                >
                  <option value="teen">Teen (Service Provider)</option>
                  <option value="parent">Community Member</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {formData.role === "teen"
                    ? "Teen accounts currently require an @sses.saintstephens.org email address."
                    : "Choose this if you want to book or support teen services in your area."}
                </p>
              </div>

              <div>
                <label htmlFor="accessCode" className="mb-1.5 block text-sm font-semibold text-slate-700">Access code</label>
                <Input id="accessCode" name="accessCode" type="text" required value={formData.accessCode} onChange={handleInputChange}
                  className={`h-12 w-full rounded-2xl border bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.accessCode ? "border-red-400" : "border-slate-200"}`}
                  placeholder="Enter your access code" disabled={isSubmitting} />
                {fieldErrors.accessCode && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.accessCode}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold text-slate-700">First name</label>
                  <Input id="firstName" name="firstName" type="text" autoComplete="given-name" required value={formData.firstName} onChange={handleInputChange}
                    className={`h-12 rounded-2xl border bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.firstName ? "border-red-400" : "border-slate-200"}`}
                    placeholder="John" disabled={isSubmitting} maxLength={50} />
                  {fieldErrors.firstName && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold text-slate-700">Last name</label>
                  <Input id="lastName" name="lastName" type="text" autoComplete="family-name" required value={formData.lastName} onChange={handleInputChange}
                    className={`h-12 rounded-2xl border bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.lastName ? "border-red-400" : "border-slate-200"}`}
                    placeholder="Doe" disabled={isSubmitting} maxLength={50} />
                  {fieldErrors.lastName && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <Input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange}
                  className={`h-12 w-full rounded-2xl border bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.email ? "border-red-400" : "border-slate-200"}`}
                  placeholder={formData.role === "teen" ? "you@sses.saintstephens.org" : "you@example.com"} disabled={isSubmitting} maxLength={254} />
                {fieldErrors.email && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.email}</p>}
              </div>

              {formData.role === "teen" && (
                <div className="space-y-5 rounded-2xl border border-[#434c9d]/15 bg-[#434c9d]/5 p-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#434c9d] shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Teen verification
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      We’ll collect a few extra details so your parent or guardian can approve your account.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="age" className="mb-1.5 block text-sm font-semibold text-slate-700">Age</label>
                      <Input id="age" name="age" type="number" min="13" max="19" required value={formData.age} onChange={handleInputChange}
                        className={`h-12 rounded-2xl border bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.age ? "border-red-400" : "border-slate-200"}`}
                        placeholder="16" disabled={isSubmitting} />
                      {fieldErrors.age && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.age}</p>}
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-slate-700">Phone <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange}
                        className={`h-12 rounded-2xl border bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.phone ? "border-red-400" : "border-slate-200"}`}
                        placeholder="+1 555 0100" disabled={isSubmitting} maxLength={20} />
                      {fieldErrors.phone && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="parentEmail" className="mb-1.5 block text-sm font-semibold text-slate-700">Parent email</label>
                      <Input id="parentEmail" name="parentEmail" type="email" autoComplete="email" required value={formData.parentEmail} onChange={handleInputChange}
                        className={`h-12 rounded-2xl border bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.parentEmail ? "border-red-400" : "border-slate-200"}`}
                        placeholder="parent@example.com" disabled={isSubmitting} maxLength={254} />
                      {fieldErrors.parentEmail && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.parentEmail}</p>}
                    </div>
                    <div>
                      <label htmlFor="parentPhone" className="mb-1.5 block text-sm font-semibold text-slate-700">Parent phone</label>
                      <Input id="parentPhone" name="parentPhone" type="tel" required value={formData.parentPhone} onChange={handleInputChange}
                        className={`h-12 rounded-2xl border bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.parentPhone ? "border-red-400" : "border-slate-200"}`}
                        placeholder="+1 555 0100" disabled={isSubmitting} maxLength={20} />
                      {fieldErrors.parentPhone && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.parentPhone}</p>}
                    </div>
                  </div>

                  <label htmlFor="parentPermission" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <input id="parentPermission" name="parentPermission" type="checkbox" checked={formData.parentPermission} onChange={handleInputChange}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#434c9d] focus:ring-[#434c9d]/20" disabled={isSubmitting} />
                    <span className="text-sm leading-relaxed text-slate-600">I confirm I have my parent or guardian&apos;s permission to create a TeenOp account.</span>
                  </label>
                  {fieldErrors.parentPermission && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.parentPermission}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={formData.password} onChange={handleInputChange}
                      className={`h-12 rounded-2xl border bg-slate-50 px-4 pr-11 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.password ? "border-red-400" : "border-slate-200"}`}
                      placeholder="Create a strong password" disabled={isSubmitting} maxLength={128} />
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3.5" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
                  <div className="relative">
                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange}
                      className={`h-12 rounded-2xl border bg-slate-50 px-4 pr-11 text-slate-900 placeholder:text-slate-400 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 ${fieldErrors.confirmPassword ? "border-red-400" : "border-slate-200"}`}
                      placeholder="Confirm your password" disabled={isSubmitting} maxLength={128} />
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3.5" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isSubmitting}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{fieldErrors.confirmPassword}</p>}
                </div>
              </div>

              <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input id="terms" name="terms" type="checkbox" required checked={formData.terms} onChange={handleInputChange}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#434c9d] focus:ring-[#434c9d]/20" disabled={isSubmitting} />
                <span className="text-sm leading-relaxed text-slate-600">
                  {formData.role === "teen" ? (
                    <>I agree to the <Link href="/terms" className="font-semibold text-[#434c9d] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-[#434c9d] hover:underline">Privacy Agreement</Link>. TeenOp is a platform only and is not liable for arranged services.</>
                  ) : (
                    <>I agree to the <Link href="/terms" className="font-semibold text-[#434c9d] hover:underline">Terms of Service</Link> and <Link href="/terms#limitation-of-liability" className="font-semibold text-[#434c9d] hover:underline">Liability Waiver</Link>. TeenOp is a platform only and is not liable for arranged services.</>
                  )}
                </span>
              </label>

              <Button type="submit"
                className="h-12 w-full rounded-2xl bg-[#E8634A] font-bold text-white shadow-lg shadow-[#E8634A]/20 transition-all duration-200 hover:bg-[#d45539] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[#434c9d] hover:underline">Login</Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <TeenProviderDisclaimer isOpen={showDisclaimer} onClose={handleDisclaimerClose} onAccept={handleDisclaimerAccept} />

      <Dialog open={rateLimitOpen} onOpenChange={setRateLimitOpen}>
        <DialogContent className="rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Too many signup attempts</DialogTitle>
            <DialogDescription className="text-left text-base text-slate-600">
              {rateLimitMessage ||
                "You have exceeded the allowed number of tries. Please wait before trying again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-xl bg-[#434c9d] font-semibold"
              onClick={() => setRateLimitOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
