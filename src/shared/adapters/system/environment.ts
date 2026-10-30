export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Configuration manquante : ' + name);
  return value;
}
export function numberFromEnv(name: string, fallback: number, minimum = 0): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Configuration numérique invalide : ' + name);
  return value;
}
