export type VastErrorCode = 301 | 303 | 401 | 402 | 403 | 900

export class VastError extends Error {
  readonly code: VastErrorCode

  constructor(code: VastErrorCode, message: string) {
    super(message)
    this.name = 'VastError'
    this.code = code
  }
}
