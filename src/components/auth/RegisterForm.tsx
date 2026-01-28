import { useState } from "react";
import { toast } from "sonner";
import { registerSchema } from "@/lib/schemas/auth.schema";
import type {
  RegisterCommand,
  RegisterResponseDTO,
  ErrorResponseDTO,
} from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ViewModel types
interface RegisterFormState {
  email: string;
  password: string;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  form?: string; // General form error (from API)
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormState>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate single field
  const validateField = (field: keyof RegisterFormState, value: string): string | undefined => {
    const fieldSchema = registerSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    return result.success ? undefined : result.error.errors[0]?.message;
  };

  // Handlers
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value });
    // Clear field error on change
    if (errors.email) {
      setErrors({ ...errors, email: undefined });
    }
  };

  const handleEmailBlur = () => {
    const error = validateField("email", formData.email);
    if (error) {
      setErrors({ ...errors, email: error });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, password: e.target.value });
    // Clear field error on change
    if (errors.password) {
      setErrors({ ...errors, password: undefined });
    }
  };

  const handlePasswordBlur = () => {
    const error = validateField("password", formData.password);
    if (error) {
      setErrors({ ...errors, password: error });
    }
  };

  const mapApiErrorToMessage = (code: string): string => {
    const errorMessages: Record<string, string> = {
      VALIDATION_ERROR: "Please check your input",
      USER_EXISTS: "An account with this email already exists",
      INTERNAL_ERROR: "Something went wrong. Please try again later.",
    };

    return errorMessages[code] ?? "An unexpected error occurred.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Client-side validation
    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      // Extract field errors from Zod
      const fieldErrors: RegisterFormErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof RegisterFormErrors;
        if (field === "email" || field === "password") {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // 2. API call
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData as RegisterCommand),
        credentials: "include", // Required for cookies
      });

      const data = await response.json();

      if (!response.ok) {
        // 3. Handle error response
        const errorData = data as ErrorResponseDTO;
        setErrors({ form: mapApiErrorToMessage(errorData.error.code) });
        return;
      }

      // 4. Success - show toast and redirect to login
      toast.success("Account created successfully. Please check your email to confirm.");

      // Small delay to allow toast to be visible before redirect
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (error) {
      // 5. Network error
      setErrors({
        form: "Unable to connect to server. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <h1 className="text-2xl font-bold">10x Cards</h1>
        </div>
        <CardTitle className="text-2xl text-center">Create an account</CardTitle>
        <CardDescription className="text-center">
          Enter your email below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              data-testid="register-email-input"
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              data-testid="register-password-input"
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          {/* Form-level error */}
          {errors.form && (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="register-submit-button"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          {/* Link to login */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="underline underline-offset-4 hover:text-primary">
              Log in
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
