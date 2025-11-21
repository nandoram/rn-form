import { useCorporationNumberValidation } from "@/hooks/use-corporation-number-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@tamagui/lucide-icons";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Button, Input, Text, useMedia, View } from "tamagui";
import { z } from "zod";
const onboardingSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  phone: z
    .string()
    .regex(
      /^\+1\d{10}$/,
      "Enter a valid Canadian phone number starting with +1 followed by 10 digits"
    ),
  corporationNumber: z
    .string()
    .regex(/^\d{9}$/, "Corporation number must be exactly 9 digits"),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const PROFILE_ENDPOINT =
  "https://fe-hometask-api.qa.vault.tryvault.com/profile-details";

export function OnboardingForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, submitCount },
    trigger,
    getValues,
    setError,
    clearErrors,
    reset,
  } = useForm<OnboardingFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      corporationNumber: "",
    },
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  const {
    validate,
    isLoading: isCheckingCorporation,
    status: corporationStatus,
    errorMessage: corporationValidationMessage,
    reset: resetCorporationValidation,
  } = useCorporationNumberValidation();

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const media = useMedia();

  const corporationErrorMatchesValidationMessage = Boolean(
    corporationValidationMessage &&
      errors.corporationNumber?.message === corporationValidationMessage
  );

  const ensureCorporationValid = useCallback(async () => {
    const baseValid = await trigger("corporationNumber");
    if (!baseValid) {
      return false;
    }

    const value = getValues("corporationNumber");
    const result = await validate(value);
    if (!result.valid) {
      setError("corporationNumber", {
        type: "manual",
        message: result.message ?? "Invalid corporation number",
      });
      return false;
    }

    clearErrors("corporationNumber");
    return true;
  }, [clearErrors, getValues, setError, trigger, validate]);

  const handleCorporationBlur = useCallback(async () => {
    await ensureCorporationValid();
  }, [ensureCorporationValid]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const corporationOk = await ensureCorporationValid();
    if (!corporationOk) {
      return;
    }

    try {
      const response = await fetch(PROFILE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.message ??
          "Submission failed. Review your details and try again.";
        setServerError(message);
        return;
      }

      setServerSuccess("Details submitted successfully.");
      reset();
      resetCorporationValidation();
    } catch {
      setServerError("Unable to submit form right now. Please try again.");
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.flex}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card} testID="onboarding-form">
          <Text style={styles.title}>Step 1 of 5</Text>
          <View style={styles.cardInner}>
            <Text style={styles.subtitle}>Onboarding Form</Text>
            <View flexDirection={media.sm ? "row" : "column"} gap={16}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>First name</Text>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      style={[
                        styles.input,
                        errors.firstName && styles.inputError,
                      ]}
                      autoCapitalize="words"
                      maxLength={50}
                      textContentType="givenName"
                      accessibilityLabel="First name"
                      testID="first-name-input"
                    />
                    {errors.firstName && (
                      <Text style={styles.errorText} testID="first-name-error">
                        {errors.firstName.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Last name</Text>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      style={[
                        styles.input,
                        errors.lastName && styles.inputError,
                      ]}
                      autoCapitalize="words"
                      maxLength={50}
                      textContentType="familyName"
                      accessibilityLabel="Last name"
                      testID="last-name-input"
                    />
                    {errors.lastName && (
                      <Text style={styles.errorText} testID="last-name-error">
                        {errors.lastName.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onBlur, onChange, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Phone number</Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={[styles.input, errors.phone && styles.inputError]}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    inputMode="tel"
                    maxLength={12}
                    accessibilityLabel="Phone number"
                    testID="phone-input"
                  />

                  {errors.phone && (
                    <Text style={styles.errorText} testID="phone-error">
                      {errors.phone.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="corporationNumber"
              render={({ field: { onBlur, onChange, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Corporation number</Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={async () => {
                      onBlur();
                      await handleCorporationBlur();
                    }}
                    style={[
                      styles.input,
                      errors.corporationNumber && styles.inputError,
                    ]}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={9}
                    accessibilityLabel="Corporation number"
                    testID="corporation-input"
                  />
                  {isCheckingCorporation && (
                    <View style={styles.validationRow}>
                      <ActivityIndicator size="small" />
                      <Text style={styles.helperText}>
                        Validating corporation number…
                      </Text>
                    </View>
                  )}
                  {!isCheckingCorporation && corporationStatus === "valid" && (
                    <Text style={styles.successText} testID="corporation-valid">
                      Corporation number validated.
                    </Text>
                  )}
                  {!isCheckingCorporation &&
                    corporationStatus === "invalid" &&
                    corporationValidationMessage && (
                      <Text
                        style={styles.errorText}
                        testID="corporation-validation-error"
                      >
                        {corporationValidationMessage}
                      </Text>
                    )}
                  {errors.corporationNumber &&
                    !corporationErrorMatchesValidationMessage && (
                      <Text style={styles.errorText} testID="corporation-error">
                        {errors.corporationNumber.message}
                      </Text>
                    )}
                </View>
              )}
            />

            {serverError && (
              <Text style={styles.errorText} testID="server-error">
                {serverError}
              </Text>
            )}

            {serverSuccess && (
              <Text style={styles.successText} testID="server-success">
                {serverSuccess}
              </Text>
            )}

            <Button
              onPress={onSubmit}
              style={styles.submitButton}
              testID="submit-button"
              iconAfter={<ArrowRight size={16} color="#fff" />}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitLabel}>Submit</Text>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 64,
  },
  card: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  cardInner: {
    flex: 1,
    gap: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "100",
    textAlign: "center",
  },
  fieldGroup: {
    gap: 8,
    flex: 1,
  },
  label: {
    fontWeight: "600",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#d93025",
  },
  helperText: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  errorText: {
    color: "#d93025",
    fontSize: 13,
  },
  successText: {
    color: "#0f8a3b",
    fontSize: 13,
  },
  submitButton: {
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1a1a1aff",
  },

  submitLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
