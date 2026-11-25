export function parseSauceDemoPrice(text: string): number {
  const amount = /^(?:[^:$]+:\s*)?\$\s*(\d+(?:,\d{3})*\.\d{2})$/.exec(text.trim())?.[1];
  if (amount === undefined) {
    throw new Error(`Invalid SauceDemo price: ${JSON.stringify(text)}`);
  }
  return Number(amount.replaceAll(',', ''));
}
