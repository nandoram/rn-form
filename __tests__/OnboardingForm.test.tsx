import { defaultConfig } from "@tamagui/config/v4";
import { TamaguiProvider, createTamagui } from "@tamagui/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";

const corporationEndpoint =
  "https://fe-hometask-api.qa.vault.tryvault.com/corporation-number/";
const profileEndpoint =
  "https://fe-hometask-api.qa.vault.tryvault.com/profile-details";

type FetchResponseOptions = {
  ok?: boolean;
  json?: () => Promise<unknown>;
};

function createFetchResponse({
  ok = true,
  json = async () => ({}),
}: FetchResponseOptions) {
  return {
    ok,
    json,
  } as Response;
}

const tamaguiConfig = createTamagui(defaultConfig);

function renderWithProvider(children: React.ReactNode) {
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

describe("OnboardingForm", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("shows field validation errors when submitting empty form", async () => {
    renderWithProvider(<OnboardingForm />);

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("first-name-error")).toBeTruthy();
      expect(screen.getByTestId("last-name-error")).toBeTruthy();
      expect(screen.getByTestId("phone-error")).toBeTruthy();
      expect(screen.getByTestId("corporation-error")).toBeTruthy();
    });
  });

  it("validates corporation number asynchronously on blur", async () => {
    fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        json: async () => ({
          corporationNumber: "123456789",
          valid: false,
          message: "Invalid corporation number",
        }),
      })
    );

    renderWithProvider(<OnboardingForm />);

    const corpInput = screen.getByTestId("corporation-input");
    fireEvent.changeText(corpInput, "123456789");

    await act(async () => {
      fireEvent(corpInput, "blur");
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${corporationEndpoint}123456789`,
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("corporation-validation-error")
      ).toHaveTextContent("Invalid corporation number");
    });
  });

  it("shows API fallback validation error only once when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        ok: false,
      })
    );

    renderWithProvider(<OnboardingForm />);

    const corpInput = screen.getByTestId("corporation-input");
    fireEvent.changeText(corpInput, "123456789");

    await act(async () => {
      fireEvent(corpInput, "blur");
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("corporation-validation-error")
      ).toHaveTextContent("Unable to validate corporation number right now.");
    });

    await waitFor(() => {
      expect(
        screen.getAllByText("Unable to validate corporation number right now.")
      ).toHaveLength(1);
      expect(screen.queryByTestId("corporation-error")).toBeNull();
    });
  });

  it("submits the form when every field passes validation", async () => {
    fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        json: async () => ({ corporationNumber: "826417395", valid: true }),
      })
    );

    fetchMock.mockResolvedValueOnce(
      createFetchResponse({ json: async () => ({}) })
    );

    renderWithProvider(<OnboardingForm />);

    fireEvent.changeText(screen.getByTestId("first-name-input"), "Hello");
    fireEvent.changeText(screen.getByTestId("last-name-input"), "World");
    fireEvent.changeText(screen.getByTestId("phone-input"), "+13062776103");

    const corpInput = screen.getByTestId("corporation-input");
    fireEvent.changeText(corpInput, "826417395");

    await act(async () => {
      fireEvent(corpInput, "blur");
    });

    await waitFor(() => {
      expect(screen.getByTestId("corporation-valid")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        profileEndpoint,
        expect.objectContaining({ method: "POST" })
      );
      expect(screen.getByTestId("server-success")).toHaveTextContent(
        "Details submitted successfully."
      );
    });
  });
});
