export type FieldErrors = Record<string, string[]>;

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
