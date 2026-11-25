export interface TestGenerationProvider {
  generate(prompt: string): Promise<string>;
}
