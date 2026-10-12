import { describe, expect, test } from "vitest";
import { boundedIndexQueue, MAX_INDEX_QUEUE, projectSummary } from "./KnowledgeProjectWorkspace";
import type { KnowledgeCollection, KnowledgeDocument } from "./api";

const collection: KnowledgeCollection = {
  id: 10, name: "Shop Manuals", description: null, local_only: true,
  created_at: "2026-10-10T00:00:00Z",
};
function source(id: number, project: number, status: string): KnowledgeDocument {
  return {
    id, collection_id: project, filename: "manual-" + id + ".md",
    content_hash: "a".repeat(64), mime_type: "text/markdown", source_path: String(id),
    size_bytes: 50, status, extracted_characters: 50, page_count: null,
    created_at: "2026-10-10T00:00:00Z", indexed_at: null,
  };
}

describe("Build 055 project workbench", () => {
  const docs = [
    source(1, 10, "ingested"), source(2, 10, "indexed"),
    source(3, 10, "no_text"), source(4, 11, "ingested"),
    source(5, 10, "ingested"), source(6, 10, "ingested"),
  ];
  test("separates projects and never attributes external project files", () => {
    expect(projectSummary(collection, docs)).toEqual({ count: 5, indexed: 1, needIndex: 4 });
  });
  test("deduplicates and bounds local index selection to three, excluding indexed", () => {
    expect(boundedIndexQueue([1, 1, 2, 3, 5, 6, 4], docs.filter((d) => d.collection_id === 10)))
      .toEqual([1, 3, 5]);
    expect(MAX_INDEX_QUEUE).toBe(3);
  });
  test("returns empty queue and project summary safely", () => {
    expect(boundedIndexQueue([42], [])).toEqual([]);
    expect(projectSummary(collection, [])).toEqual({ count: 0, indexed: 0, needIndex: 0 });
  });
});
