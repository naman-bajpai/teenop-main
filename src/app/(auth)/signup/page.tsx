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
    password: "",
    confirmPassword: "",
    role: "teen" as "teen" | "parent",
    parentEmail: "",
    parentPhone: "",
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
    password?: string;
    confirmPassword?: string;
    parentEmail?: string;
    parentPhone?: string;
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
      return "Too many signup attempts. Please wait a moment and try again.";
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
      const error = validateEmail(sanitizedValue);
      setFieldErrors(prev => ({ ...prev, email: error || undefined }));
    } else if (name === "age") {
      const error = validateAge(value);
      setFieldErrors(prev => ({ ...prev, age: error || undefined }));
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
    }

    // Validate age for teen accounts
    if (formData.role === "teen") {
      const ageError = validateAge(formData.age);
      if (ageError) {
        errors.age = ageError;
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
      setError("You must agree to the Terms of Service and Privacy Policy");
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
    if (formData.parentPhone) {
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
          role: formData.role || 'teen',
          parentEmail: formData.parentEmail || undefined,
          parentPhone: formData.parentPhone || undefined,
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

      setSuccess("Account created successfully! Please check your email for verification.");
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        age: "",
        password: "",
        confirmPassword: "",
        role: "teen",
        parentEmail: "",
        parentPhone: "",
        terms: false,
      });
      
      // For teen accounts, redirect to onboarding after signup
      // For parent accounts, redirect to login
      if (formData.role === "teen") {
        setTimeout(() => {
          router.push("/onboarding");
        }, 2000);
      } else {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#ff725a]/10 to-[#434c9d]/10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#434c9d]/20 to-[#96cbc3]/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#ff725a]/20 to-[#434c9d]/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-white/20 hover:bg-white/90 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl">
            <Image
              src="/images/newlogo.png"
              alt="TeenOp Logo"
              width={200}
              height={200}
              className="h-20 w-20"
            />
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Join TeenOp!  
          </h1>
          <p className="text-lg text-gray-600">
            Join today as a teen or a community member!
          </p>
        </div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/20 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1 bg-red-100 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-red-700 font-medium">{error}</span>
                {countdown && countdown > 0 && (
                  <div className="mt-1 text-xs text-red-600">
                    Retry available in {countdown} second{countdown !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-1 bg-green-100 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-green-700 font-medium">{success}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
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
                  className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    fieldErrors.firstName ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="John"
                  disabled={isSubmitting}
                  maxLength={50}
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
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
                  className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    fieldErrors.lastName ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="Doe"
                  disabled={isSubmitting}
                  maxLength={50}
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
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
                className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  fieldErrors.email ? 'border-red-300 focus:ring-red-500' : ''
                }`}
                placeholder="john@example.com"
                disabled={isSubmitting}
                maxLength={254}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full h-11 px-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200"
                disabled={isSubmitting}
              >
                <option value="teen">Teen (Service Provider)</option>
                <option value="parent">Community Member</option>
              </select>
            </div>

            {formData.role === "teen" && (
              <div className="space-y-2">
                <label htmlFor="age" className="block text-sm font-semibold text-gray-700">
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
                  className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    fieldErrors.age ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="16"
                  disabled={isSubmitting}
                />
                {fieldErrors.age && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.age}
                  </p>
                )}
              </div>
            )}

            {formData.role === "teen" && (
              <div className="space-y-4 p-4 bg-[#96cbc3]/10 rounded-xl border border-[#96cbc3]/20">
                <h3 className="text-sm font-semibold text-[#434c9d]">Parent/Guardian Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="parentEmail" className="block text-sm font-semibold text-gray-700">
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
                      className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                        fieldErrors.parentEmail ? 'border-red-300 focus:ring-red-500' : ''
                      }`}
                      disabled={isSubmitting}
                      placeholder="parent@example.com"
                      maxLength={254}
                    />
                    {fieldErrors.parentEmail && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.parentEmail}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="parentPhone" className="block text-sm font-semibold text-gray-700">
                      Parent/Guardian Phone (Optional)
                    </label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      type="tel"
                      value={formData.parentPhone}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#434c9d] focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                        fieldErrors.parentPhone ? 'border-red-300 focus:ring-red-500' : ''
                      }`}
                      disabled={isSubmitting}
                      placeholder="+1 (555) 123-4567"
                      maxLength={20}
                    />
                    {fieldErrors.parentPhone && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.parentPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
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
                  className={`w-full h-11 px-4 pr-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    fieldErrors.password ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
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
                  className={`w-full h-11 px-4 pr-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                    fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-xl transition-colors duration-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                checked={formData.terms}
                onChange={handleInputChange}
                className="h-4 w-4 text-[#434c9d] focus:ring-[#434c9d] border-gray-300 rounded mt-0.5 transition-colors duration-200"
                disabled={isSubmitting}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#434c9d] hover:text-[#434c9d]/80 font-semibold transition-colors duration-200">
                  Privacy Policy
                </a>
              </label>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50"
                disabled={isSubmitting || (countdown !== null && countdown > 0)}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : countdown && countdown > 0 ? (
                  `Wait ${countdown}s`
                ) : (
                  "Create account"
                )}
              </Button>
            </div>
          </form>

        </div>
        
        {/* Login link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-semibold text-[#434c9d] hover:text-[#434c9d]/80 transition-colors duration-200"
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
