import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App.jsx";

describe("Job tracker dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_DEMO", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders demo data and an overview summary", async () => {
    render(<App />);

    expect(
      await screen.findByText("Job Application Tracker"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pipeline summary")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("switches the view and toggles language mode in the dashboard", async () => {
    render(<App />);

    const contactsButton = await screen.findByRole("button", {
      name: "Contacts",
    });
    fireEvent.click(contactsButton);

    expect(screen.getByText("Maya Hassan")).toBeInTheDocument();

    const languageButton = screen.getByRole("button", { name: "Language" });
    fireEvent.click(languageButton);

    expect(document.documentElement.dir).toBe("rtl");
    expect(screen.getByText("اللوحة")).toBeInTheDocument();
  });
});
