declare module 'next' {
  export type Metadata = {
    title?: string
    description?: string
    [key: string]: unknown
  }
}

declare module 'next/font/google' {
  type FontOptions = {
    subsets?: string[]
    variable?: string
    [key: string]: unknown
  }

  type FontResult = {
    className: string
    variable: string
    style: Record<string, string>
  }

  export function Geist(options?: FontOptions): FontResult
  export function Geist_Mono(options?: FontOptions): FontResult
}

declare module '@vercel/analytics/next' {
  export function Analytics(): import('react').ReactElement | null
}
