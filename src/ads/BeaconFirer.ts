const fire = (url: string): void => {
  if (!url) return
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url)
    return
  }
  new Image().src = url
}

export const fireBeacon: (url: string) => void = fire
export const fireBeacons = (urls: string[]): void => urls.forEach(fire)
export const fireError = (urls: string[], code: number): void =>
  urls.forEach(url => fire(url.replace('[ERRORCODE]', String(code))))
