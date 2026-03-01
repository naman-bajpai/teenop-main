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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 flex flex-col justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#434c9d]/20 via-[#ff725a]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#96cbc3]/20 via-[#434c9d]/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#ff725a]/10 via-[#434c9d]/10 to-[#96cbc3]/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="group flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-white/40 hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl">
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={200}
              height={200}
              className="h-16 w-16 transition-transform duration-300 group-hover:scale-110"
            />
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent mb-4">
            Join TeenOp!
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Start your journey as a teen service provider or community member
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-200/50 relative overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3]"></div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1.5 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-red-800 font-medium block">{error}</span>
                {countdown && countdown > 0 && (
                  <div className="mt-1.5 text-xs text-red-600">
                    Retry available in {countdown} second{countdown !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-green-800 font-medium">{success}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-800">
                  First name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.firstName ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="John"
                  disabled={isSubmitting}
                  maxLength={50}
                />
                {fieldErrors.firstName && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-800">
                  Last name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.lastName ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="Doe"
                  disabled={isSubmitting}
                  maxLength={50}
                />
                {fieldErrors.lastName && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                  fieldErrors.email ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder={formData.role === "teen" ? "you@sses.saintstephens.org" : "you@example.com"}
                disabled={isSubmitting}
                maxLength={254}
              />
              {fieldErrors.email && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-semibold text-gray-800">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full h-13 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 text-gray-900 font-medium hover:border-gray-300 cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="teen">Teen (Service Provider)</option>
                <option value="parent">Community Member</option>
              </select>
              {formData.role === "teen" && (
                <p className="mt-2 text-xs text-[#434c9d] font-medium">
                  Only @sses.saintstephens.org email addresses can sign up as Teen (Service Provider). Any email can sign up as Community Member.
                </p>
              )}
            </div>

            {formData.role === "teen" && (
              <div className="space-y-2">
                <label htmlFor="age" className="block text-sm font-semibold text-gray-800">
                  Age
                </label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min="13"
                  max="19"
                  required
                  value={formData.age}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.age ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="16"
                  disabled={isSubmitting}
                />
                {fieldErrors.age && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.age}
                  </p>
                )}
              </div>
            )}

            {formData.role === "teen" && (
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-800">
                  Phone <span className="text-gray-500 font-normal">(Optional for approval updates)</span>
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.phone ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  placeholder="+1 (555) 123-4567"
                  maxLength={20}
                />
                {fieldErrors.phone && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            )}

            {formData.role === "teen" && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-[#96cbc3]/10 to-[#434c9d]/10 rounded-xl border-2 border-[#96cbc3]/30">
                <h3 className="text-base font-bold text-[#434c9d] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#434c9d] rounded-full"></span>
                  Parent/Guardian Information
                </h3>
                <p className="text-sm text-gray-600">
                  We&apos;ll send a verification link to the email below. Your parent or guardian must confirm before you can log in.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="parentEmail" className="block text-sm font-semibold text-gray-800">
                      Parent/Guardian Email
                    </label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.parentEmail}
                      onChange={handleInputChange}
                      className={`w-full h-13 px-4 py-3 bg-white/80 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                        fieldErrors.parentEmail ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isSubmitting}
                      placeholder="parent@example.com"
                      maxLength={254}
                    />
                    {fieldErrors.parentEmail && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {fieldErrors.parentEmail}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="parentPhone" className="block text-sm font-semibold text-gray-800">
                      Parent/Guardian Phone
                    </label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      type="tel"
                      required
                      value={formData.parentPhone}
                      onChange={handleInputChange}
                      className={`w-full h-13 px-4 py-3 bg-white/80 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                        fieldErrors.parentPhone ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isSubmitting}
                      placeholder="+1 (555) 123-4567"
                      maxLength={20}
                    />
                    {fieldErrors.parentPhone && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {fieldErrors.parentPhone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[#434c9d]/15 bg-white/60 p-4">
                  <label htmlFor="parentPermission" className="flex cursor-pointer items-start gap-3">
                    <input
                      id="parentPermission"
                      name="parentPermission"
                      type="checkbox"
                      checked={formData.parentPermission}
                      onChange={handleInputChange}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 text-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm leading-relaxed text-gray-700">
                      I confirm that I have my parent or guardian&apos;s permission to create a TeenOp account and send them an approval request.
                    </span>
                  </label>
                  {fieldErrors.parentPermission && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {fieldErrors.parentPermission}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[#434c9d]">
                  Pending Approval: while you wait for parent approval, your account will stay offline. You&apos;ll be able to draft your storefront once that feature is turned on.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 pr-12 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.password ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full h-13 px-4 py-3 pr-12 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#434c9d]/20 focus:border-[#434c9d] transition-all duration-200 placeholder:text-gray-400 text-gray-900 font-medium ${
                    fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                checked={formData.terms}
                onChange={handleInputChange}
                className="h-4 w-4 text-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 border-gray-300 rounded mt-0.5 cursor-pointer transition-all duration-200 flex-shrink-0"
                disabled={isSubmitting}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                {formData.role === "teen" ? (
                  <>
                    I acknowledge that TeenOp acts solely as a platform connecting teens with community members. I understand that TeenOp does not supervise, direct, or guarantee services and is not liable for services arranged through the platform. By checking this box, I agree to the{" "}
                    <Link href="/terms" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200 hover:underline">
                      Privacy Agreement
                    </Link>.
                  </>
                ) : (
                  <>
                    I acknowledge that TeenOp acts solely as a platform connecting community members with teen service providers. I understand that TeenOp does not supervise, direct, or guarantee services and is not liable for services arranged through the platform. By checking this box, I agree to the{" "}
                    <Link href="/terms" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms#limitation-of-liability" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200 hover:underline">
                      Liability Waiver
                    </Link>.
                  </>
                )}
              </label>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-13 bg-gradient-to-r from-[#ff725a] via-[#434c9d] to-[#96cbc3] hover:from-[#ff725a]/95 hover:via-[#434c9d]/95 hover:to-[#96cbc3]/95 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating account...
                    </>
                  ) : countdown && countdown > 0 ? (
                    `Wait ${countdown}s`
                  ) : (
                    "Create account"
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            </div>
          </form>

        </div>
        
        {/* Login link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-base">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-bold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200 hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Teen Provider Disclaimer Dialog */}
      <TeenProviderDisclaimer
        isOpen={showDisclaimer}
        onClose={handleDisclaimerClose}
        onAccept={handleDisclaimerAccept}
      />
    </div>
  );
}
