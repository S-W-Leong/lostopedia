declare module '@huggingface/inference' {
  export class HfInference {
    constructor(apiKey?: string)
    featureExtraction(options: { model: string; inputs: string }): Promise<number[] | number[][]>
  }
}
