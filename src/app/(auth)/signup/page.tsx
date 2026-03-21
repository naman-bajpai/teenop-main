"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
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
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setError("");
    }
  }, [countdown]);

  // Helper function to check if we should wait before retrying
  const shouldWaitForRetry = () => {
    if (!lastAttemptTime) return false;
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    return timeSinceLastAttempt < waitTime;
  };

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

  // Helper function to get user-friendly error message
  const getErrorMessage = (error: any) => {
    if (error?.message?.includes("rate limit")) {
      return "Too many signup attempts. Please wait a moment before trying again to create an account.";
    }
    if (error?.message?.includes("User already registered")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (error?.message?.includes("Password should be at least")) {
      return "Password must be at least 8 characters long.";
    }
    if (error?.message?.includes("Invalid email")) {
      return "Please enter a valid email address.";
    }
    return error?.message || "Signup failed. Please try again.";
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
    
    // Check if we should wait before retrying
    if (shouldWaitForRetry()) {
      const timeSinceLastAttempt = Date.now() - (lastAttemptTime || 0);
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
      const remainingTime = Math.ceil((waitTime - timeSinceLastAttempt) / 1000);
      setCountdown(remainingTime);
      setError(`Please wait ${remainingTime} seconds before trying again.`);
      return;
    }

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
    setLastAttemptTime(Date.now());

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

      const result = await response.json();

      if (!response.ok) {
        console.error("Signup error:", result);
        
        // Handle rate limiting specifically
        if (result.error?.includes("rate limit")) {
          setRetryCount(prev => prev + 1);
          const waitTime = Math.min(1000 * Math.pow(2, retryCount + 1), 30000);
          const remainingTime = Math.ceil(waitTime / 1000);
          setCountdown(remainingTime);
          setError(result.error);
          return;
        }
        
        // Reset retry count for non-rate-limit errors
        setRetryCount(0);
        setError(result.error || "Failed to create account");
        return;
      }

      // Reset retry count on successful signup
      setRetryCount(0);

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
      });
      
      // Teens: parent must verify first, so send to login (they'll see "account not active" until parent confirms)
      // Parents: go to login
      const redirectPath = result.requiresParentVerification ? "/pending-approval" : "/login";
      setTimeout(() => {
        router.push(redirectPath);
      }, 3000);
    } catch (error) {
      console.error('Signup error:', error);
      setRetryCount(prev => prev + 1);
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
    <div className="min-h-screen flex">
      {/* Left panel — image + branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col">
        <Image src="/images/hands together9.jpg" alt="" fill className="object-cover object-center" priority aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-[#434c9d]/70 via-[#434c9d]/50 to-[#ff725a]/40" />
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Link href="/">
            <Image src="/images/newlogo.png" alt="TeenOp" width={72} height={72} className="drop-shadow-2xl" />
          </Link>
          <div className="flex-1 flex flex-col justify-end pb-14">
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
              Join<br />TeenOp.
            </h1>
            <p className="text-base text-white/75 leading-relaxed max-w-xs">
              Talented teens offering services to their community. Start earning today.
            </p>
            <div className="mt-8 flex flex-col gap-2.5">
              {["Dog walking & lawn care", "Graphic & web design", "Photography & more"].map((s) => (
                <div key={s} className="flex items-center gap-2.5 text-white/70 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff725a] flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/30">© {new Date().getFullYear()} TeenOp</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-white flex flex-col overflow-y-auto">
        {/* Mobile background */}
        <div className="lg:hidden fixed inset-0 -z-10">
          <Image src="/images/hands together9.jpg" alt="" fill className="object-cover" aria-hidden />
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-10 max-w-xl mx-auto w-full">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Image src="/images/newlogo.png" alt="TeenOp" width={64} height={64} className="drop-shadow-xl" />
            </Link>
          </div>

          <div className="mb-7">
            <h2 className="text-3xl font-extrabold text-slate-900">Create your account</h2>
            <p className="mt-1 text-slate-500 text-sm">Start your TeenOp journey today</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-red-700">{error}</span>
                {countdown && countdown > 0 && <div className="mt-1 text-xs text-red-500">Retry in {countdown}s</div>}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 mb-1.5">First name</label>
                <Input id="firstName" name="firstName" type="text" autoComplete="given-name" required value={formData.firstName} onChange={handleInputChange}
                  className={`w-full h-11 px-4 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.firstName ? 'border-red-400' : 'border-slate-200'}`}
                  placeholder="John" disabled={isSubmitting} maxLength={50} />
                {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700 mb-1.5">Last name</label>
                <Input id="lastName" name="lastName" type="text" autoComplete="family-name" required value={formData.lastName} onChange={handleInputChange}
                  className={`w-full h-11 px-4 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.lastName ? 'border-red-400' : 'border-slate-200'}`}
                  placeholder="Doe" disabled={isSubmitting} maxLength={50} />
                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.lastName}</p>}
              </div>
            </div>

            {/* Account type */}
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-1.5">Account Type</label>
              <select id="role" name="role" value={formData.role} onChange={handleInputChange}
                className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all cursor-pointer"
                disabled={isSubmitting}>
                <option value="teen">Teen (Service Provider)</option>
                <option value="parent">Community Member</option>
              </select>
              {formData.role === "teen" && <p className="mt-1.5 text-xs text-[#434c9d]">Only @sses.saintstephens.org emails can sign up as Teen.</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <Input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange}
                className={`w-full h-11 px-4 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.email ? 'border-red-400' : 'border-slate-200'}`}
                placeholder={formData.role === "teen" ? "you@sses.saintstephens.org" : "you@example.com"} disabled={isSubmitting} maxLength={254} />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.email}</p>}
            </div>

            {/* Teen-only fields */}
            {formData.role === "teen" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-sm font-semibold text-slate-700 mb-1.5">Age</label>
                    <Input id="age" name="age" type="number" min="13" max="19" required value={formData.age} onChange={handleInputChange}
                      className={`w-full h-11 px-4 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.age ? 'border-red-400' : 'border-slate-200'}`}
                      placeholder="16" disabled={isSubmitting} />
                    {fieldErrors.age && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.age}</p>}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">Phone <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange}
                      className={`w-full h-11 px-4 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.phone ? 'border-red-400' : 'border-slate-200'}`}
                      placeholder="+1 555 0100" disabled={isSubmitting} maxLength={20} />
                    {fieldErrors.phone && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.phone}</p>}
                  </div>
                </div>

                {/* Parent info */}
                <div className="p-4 rounded-2xl bg-[#434c9d]/5 border border-[#434c9d]/15 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#434c9d]" />
                    <h3 className="text-sm font-bold text-[#434c9d]">Parent / Guardian</h3>
                  </div>
                  <p className="text-xs text-slate-500">A verification link will be sent below. Your parent must confirm before you can log in.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="parentEmail" className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Email</label>
                      <Input id="parentEmail" name="parentEmail" type="email" autoComplete="email" required value={formData.parentEmail} onChange={handleInputChange}
                        className={`w-full h-11 px-4 border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.parentEmail ? 'border-red-400' : 'border-slate-200'}`}
                        placeholder="parent@example.com" disabled={isSubmitting} maxLength={254} />
                      {fieldErrors.parentEmail && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.parentEmail}</p>}
                    </div>
                    <div>
                      <label htmlFor="parentPhone" className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Phone</label>
                      <Input id="parentPhone" name="parentPhone" type="tel" required value={formData.parentPhone} onChange={handleInputChange}
                        className={`w-full h-11 px-4 border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.parentPhone ? 'border-red-400' : 'border-slate-200'}`}
                        placeholder="+1 555 0100" disabled={isSubmitting} maxLength={20} />
                      {fieldErrors.parentPhone && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.parentPhone}</p>}
                    </div>
                  </div>
                  <label htmlFor="parentPermission" className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white border border-slate-200">
                    <input id="parentPermission" name="parentPermission" type="checkbox" checked={formData.parentPermission} onChange={handleInputChange}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#434c9d] focus:ring-[#434c9d]/20 cursor-pointer" disabled={isSubmitting} />
                    <span className="text-xs text-slate-600 leading-relaxed">I confirm I have my parent or guardian&apos;s permission to create a TeenOp account.</span>
                  </label>
                  {fieldErrors.parentPermission && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.parentPermission}</p>}
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={formData.password} onChange={handleInputChange}
                  className={`w-full h-11 px-4 pr-11 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.password ? 'border-red-400' : 'border-slate-200'}`}
                  placeholder="Create a strong password" disabled={isSubmitting} maxLength={128} />
                <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange}
                  className={`w-full h-11 px-4 pr-11 border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#434c9d]/30 focus:border-[#434c9d] transition-all ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
                  placeholder="Confirm your password" disabled={isSubmitting} maxLength={128} />
                <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isSubmitting}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <label htmlFor="terms" className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input id="terms" name="terms" type="checkbox" required checked={formData.terms} onChange={handleInputChange}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#434c9d] focus:ring-[#434c9d]/20 cursor-pointer" disabled={isSubmitting} />
              <span className="text-xs text-slate-600 leading-relaxed">
                {formData.role === "teen" ? (
                  <>I agree to the <Link href="/terms" className="text-[#434c9d] font-semibold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#434c9d] font-semibold hover:underline">Privacy Agreement</Link>. TeenOp is a platform only and is not liable for arranged services.</>
                ) : (
                  <>I agree to the <Link href="/terms" className="text-[#434c9d] font-semibold hover:underline">Terms of Service</Link> and <Link href="/terms#limitation-of-liability" className="text-[#434c9d] font-semibold hover:underline">Liability Waiver</Link>. TeenOp is a platform only and is not liable for arranged services.</>
                )}
              </span>
            </label>

            {/* Submit */}
            <Button type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting || (countdown !== null && countdown > 0)}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : countdown && countdown > 0 ? `Wait ${countdown}s` : "Create account"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#434c9d] hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>

      <TeenProviderDisclaimer isOpen={showDisclaimer} onClose={handleDisclaimerClose} onAccept={handleDisclaimerAccept} />
    </div>
  );
}
