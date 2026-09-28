import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateTextEmbedding,
  generateItemEmbedding,
  clearEmbeddingCache,
  getEmbeddingCacheSize,
  EMBEDDING_CONFIG,
} from '../embeddings';

const mockEmbeddingArray = () => new Array(384).fill(0.1);

vi.mock('@huggingface/inference', () => ({
  HfInference: vi.fn().mockImplementation(() => ({
    featureExtraction: vi.fn().mockImplementation((_opts: { inputs: string }) =>
      Promise.resolve(mockEmbeddingArray())
    ),
  })),
}));

describe('Embeddings Service', () => {
  beforeEach(() => {
    clearEmbeddingCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      expect(EMBEDDING_CONFIG.dimensions).toBe(384);
      expect(EMBEDDING_CONFIG.model).toBe('sentence-transformers/all-MiniLM-L6-v2');
    });
  });

  describe('generateTextEmbedding', () => {
    it('should return null for empty text', async () => {
      const result = await generateTextEmbedding('');
      expect(result).toBeNull();
    });

    it('should return null for invalid input', async () => {
      // @ts-expect-error - Testing invalid input
      const result = await generateTextEmbedding(null);
      expect(result).toBeNull();
    });

    it('should return null when API key is missing', async () => {
      const originalKey = process.env.HUGGINGFACE_API_KEY;
      delete process.env.HUGGINGFACE_API_KEY;

      const result = await generateTextEmbedding('test text');
      expect(result).toBeNull();

      // Restore
      if (originalKey) {
        process.env.HUGGINGFACE_API_KEY = originalKey;
      }
    });

    it('should cache successful embeddings', async () => {
      const mockEmbedding = mockEmbeddingArray();
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const { HfInference } = await import('@huggingface/inference');
      const mockFeatureExtraction = vi.fn().mockResolvedValue(mockEmbedding);
      (HfInference as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        featureExtraction: mockFeatureExtraction,
      }));

      // First call should hit API
      const result1 = await generateTextEmbedding('test text');
      expect(result1).toEqual(mockEmbedding);
      expect(getEmbeddingCacheSize()).toBe(1);

      // Second call should use cache (featureExtraction should not be called again)
      const result2 = await generateTextEmbedding('test text');
      expect(result2).toEqual(mockEmbedding);
      expect(mockFeatureExtraction).toHaveBeenCalledTimes(1);
    });

    it('should return null on API error', async () => {
      const { HfInference } = await import('@huggingface/inference');
      (HfInference as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        featureExtraction: () => Promise.reject(new Error('500 Internal Server Error')),
      }));

      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const result = await generateTextEmbedding('test text');
      expect(result).toBeNull();
    });

    it('should return null on rate limit (429)', async () => {
      const { HfInference } = await import('@huggingface/inference');
      (HfInference as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        featureExtraction: () =>
          Promise.reject(new Error('429 Rate limit exceeded')),
      }));

      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const result = await generateTextEmbedding('test text');
      expect(result).toBeNull();
    });

    it('should return null for invalid dimensions', async () => {
      const wrongDimensions = new Array(256).fill(0.1);

      const { HfInference } = await import('@huggingface/inference');
      (HfInference as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        featureExtraction: () => Promise.resolve(wrongDimensions),
      }));

      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const result = await generateTextEmbedding('test text');
      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      const { HfInference } = await import('@huggingface/inference');
      (HfInference as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        featureExtraction: () => Promise.reject(new Error('Network error')),
      }));

      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const result = await generateTextEmbedding('test text');
      expect(result).toBeNull();
    });
  });

  describe('generateItemEmbedding', () => {
    it('should combine title and description', async () => {
      const mockEmbedding = mockEmbeddingArray();
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const { HfInference } = await import('@huggingface/inference');
      const mockFeatureExtraction = vi.fn().mockResolvedValue(mockEmbedding);
      (HfInference as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        featureExtraction: mockFeatureExtraction,
      }));

      const result = await generateItemEmbedding(
        'Lost blue backpack',
        'Found near library on Monday'
      );

      expect(result).toEqual(mockEmbedding);
      expect(mockFeatureExtraction).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Lost blue backpack'),
        })
      );
      expect(mockFeatureExtraction.mock.calls[0][0].inputs).toContain(
        'Found near library on Monday'
      );
    });
  });

  describe('Cache management', () => {
    it('should clear cache', async () => {
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const { HfInference } = await import('@huggingface/inference');
      (HfInference as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        featureExtraction: () => Promise.resolve(mockEmbeddingArray()),
      }));

      await generateTextEmbedding('text 1');
      await generateTextEmbedding('text 2');

      expect(getEmbeddingCacheSize()).toBe(2);

      clearEmbeddingCache();

      expect(getEmbeddingCacheSize()).toBe(0);
    });
  });
});

