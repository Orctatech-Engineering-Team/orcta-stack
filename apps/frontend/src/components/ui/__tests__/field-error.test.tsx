import "../../../test-setup.ts";

import { expect } from "@std/expect";
import { afterEach, describe, it } from "@std/testing/bdd";
import { cleanup, render, screen } from "@testing-library/react";
import { FieldError } from "../field-error.tsx";

afterEach(cleanup);

describe("FieldError", () => {
	it("renders nothing when there are no errors", () => {
		const { container } = render(<FieldError errors={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders a single error message", () => {
		render(<FieldError errors={["Name is required"]} />);
		expect(screen.getByRole("alert").textContent).toBe("Name is required");
	});

	it("joins multiple error messages with a comma", () => {
		render(<FieldError errors={["Too short", "Must be unique"]} />);
		expect(screen.getByRole("alert").textContent).toBe(
			"Too short, Must be unique",
		);
	});
});
