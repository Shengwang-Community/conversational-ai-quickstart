export const factoryFormatLog =
  (options: { tag: string }) =>
  (...args: unknown[]) => {
    return `[${options.tag}] ${args.map((arg) => JSON.stringify(arg)).join(' ')}`
  }
