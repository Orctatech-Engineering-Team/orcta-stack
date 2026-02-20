// Domain errors — typed, expected outcomes that aren't bugs.
// Each one carries exactly the data a caller needs to handle it.
// Add new variants here as business logic grows — never use a generic "UserError".
export type UserNotFound = { type: "USER_NOT_FOUND"; lookup: string };
export type EmailTaken = { type: "EMAIL_TAKEN"; email: string };
// Produced by the use-case layer, not the repository.
export type EmailUnchanged = { type: "EMAIL_UNCHANGED"; email: string };

// The union of all domain errors this repository can return.
// Handlers import this to handle each case exhaustively.
export type UserRepoError = UserNotFound | EmailTaken;
