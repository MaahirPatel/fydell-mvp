/**
 * V3 resource model.
 *
 * The v1/v2 engine stores a resource as one markdown string and identifies a
 * row by its position in the rendered table (`cap_3`). Sorting or filtering
 * therefore invalidates every reference, and an "evidence citation" cannot
 * address anything smaller than the whole document.
 *
 * Here a resource is structured data with stable identity. Every row and every
 * document section carries an ID that is authored, not derived from position,
 * so a reference survives sorting, filtering, refresh and any later change to
 * how the resource is rendered. The candidate can still be shown a table; the
 * table is a view over these records rather than the record itself.
 */

/**
 * A coordinate into the evidence record. Enough of one of these fields must be
 * set to locate the thing being cited; `checksum` pins the version of the file
 * it was taken from, so a citation made against one bundle version can be
 * detected as stale rather than silently re-pointing at different data.
 */
export interface EvidenceSourceRef {
  resourceVersionId: string;
  resourceFileId: string;
  recordId?: string;
  rowId?: string;
  columnKey?: string;
  cellRange?: string;
  documentSectionId?: string;
  messageId?: string;
  artifactRevisionId?: string;
  eventId?: string;
  checksum: string;
  excerpt?: string;
}

export type ResourceCell = string | number | null;

export interface ResourceColumn {
  key: string;
  label: string;
  type: "string" | "number" | "timestamp";
  /** Shown to the candidate. Definitions belong with the data, not in prose. */
  description?: string;
}

export interface ResourceRow {
  /**
   * Authored and stable. Never an array index, and never regenerated when the
   * bundle is edited: changing a row's ID breaks every pin that referenced it.
   */
  rowId: string;
  cells: Record<string, ResourceCell>;
}

export interface TabularResourceFile {
  kind: "table";
  fileId: string;
  fileName: string;
  title: string;
  description?: string;
  columns: ResourceColumn[];
  rows: ResourceRow[];
}

export interface DocumentSection {
  sectionId: string;
  heading: string;
  body: string;
}

export interface DocumentResourceFile {
  kind: "document";
  fileId: string;
  fileName: string;
  title: string;
  description?: string;
  sections: DocumentSection[];
}

export type ResourceFile = TabularResourceFile | DocumentResourceFile;

export interface ResourceBundle {
  bundleId: string;
  /** Semantic version. A published bundle is frozen; edits publish a new one. */
  version: string;
  /** Identifies this exact bundle version in an `EvidenceSourceRef`. */
  resourceVersionId: string;
  files: ResourceFile[];
  /** fileId to content hash. Verified at attempt start and at analysis time. */
  checksums: Record<string, string>;
}

/* Reference constructors --------------------------------------------------- */

function fileChecksum(bundle: ResourceBundle, fileId: string): string {
  const sum = bundle.checksums[fileId];
  if (!sum) {
    throw new Error(
      `Resource bundle ${bundle.bundleId}@${bundle.version} has no checksum for file "${fileId}"`
    );
  }
  return sum;
}

/** Cite one cell: the narrowest and most useful reference. */
export function cellRef(
  bundle: ResourceBundle,
  fileId: string,
  rowId: string,
  columnKey: string,
  excerpt?: string
): EvidenceSourceRef {
  return {
    resourceVersionId: bundle.resourceVersionId,
    resourceFileId: fileId,
    rowId,
    columnKey,
    checksum: fileChecksum(bundle, fileId),
    excerpt,
  };
}

/** Cite a whole row, when the claim rests on the record and not one field. */
export function rowRef(
  bundle: ResourceBundle,
  fileId: string,
  rowId: string,
  excerpt?: string
): EvidenceSourceRef {
  return {
    resourceVersionId: bundle.resourceVersionId,
    resourceFileId: fileId,
    rowId,
    checksum: fileChecksum(bundle, fileId),
    excerpt,
  };
}

/** Cite a section of a document. */
export function sectionRef(
  bundle: ResourceBundle,
  fileId: string,
  documentSectionId: string,
  excerpt?: string
): EvidenceSourceRef {
  return {
    resourceVersionId: bundle.resourceVersionId,
    resourceFileId: fileId,
    documentSectionId,
    checksum: fileChecksum(bundle, fileId),
    excerpt,
  };
}

/* Lookup -------------------------------------------------------------------- */

export function findFile(bundle: ResourceBundle, fileId: string): ResourceFile | undefined {
  return bundle.files.find((f) => f.fileId === fileId);
}

export function findRow(file: ResourceFile, rowId: string): ResourceRow | undefined {
  return file.kind === "table" ? file.rows.find((r) => r.rowId === rowId) : undefined;
}

export function findSection(
  file: ResourceFile,
  sectionId: string
): DocumentSection | undefined {
  return file.kind === "document"
    ? file.sections.find((s) => s.sectionId === sectionId)
    : undefined;
}

/**
 * Resolves a reference back to the thing it points at, so an "open evidence"
 * action has something real to open. Returns null when the reference does not
 * resolve, which the analysis engine records as an invalid source rather than
 * quietly dropping.
 */
export function resolveRef(
  bundle: ResourceBundle,
  ref: EvidenceSourceRef
): { file: ResourceFile; row?: ResourceRow; section?: DocumentSection; stale: boolean } | null {
  const file = findFile(bundle, ref.resourceFileId);
  if (!file) return null;

  const stale =
    ref.resourceVersionId !== bundle.resourceVersionId ||
    ref.checksum !== bundle.checksums[ref.resourceFileId];

  if (ref.rowId) {
    const row = findRow(file, ref.rowId);
    return row ? { file, row, stale } : null;
  }
  if (ref.documentSectionId) {
    const section = findSection(file, ref.documentSectionId);
    return section ? { file, section, stale } : null;
  }
  return { file, stale };
}

/* Validation ---------------------------------------------------------------- */

/**
 * Structural checks a bundle must pass before it can be published. A bad
 * bundle has to fail here, not when a candidate is halfway through an attempt.
 */
export function validateResourceBundle(bundle: ResourceBundle): string[] {
  const errors: string[] = [];
  const seenFileIds = new Set<string>();

  if (!bundle.resourceVersionId) errors.push("bundle is missing resourceVersionId");
  if (bundle.files.length === 0) errors.push("bundle has no files");

  for (const file of bundle.files) {
    if (seenFileIds.has(file.fileId)) errors.push(`duplicate fileId "${file.fileId}"`);
    seenFileIds.add(file.fileId);

    if (!bundle.checksums[file.fileId]) {
      errors.push(`file "${file.fileId}" has no checksum`);
    }

    if (file.kind === "table") {
      const columnKeys = new Set(file.columns.map((c) => c.key));
      if (columnKeys.size !== file.columns.length) {
        errors.push(`file "${file.fileId}" has duplicate column keys`);
      }
      if (file.rows.length === 0) errors.push(`file "${file.fileId}" has no rows`);

      const seenRowIds = new Set<string>();
      for (const row of file.rows) {
        if (!row.rowId) {
          errors.push(`file "${file.fileId}" has a row with no rowId`);
          continue;
        }
        if (/^\d+$/.test(row.rowId)) {
          errors.push(
            `file "${file.fileId}" row "${row.rowId}" uses a bare number as identity; row IDs must be authored, not positional`
          );
        }
        if (seenRowIds.has(row.rowId)) {
          errors.push(`file "${file.fileId}" has duplicate rowId "${row.rowId}"`);
        }
        seenRowIds.add(row.rowId);

        for (const key of Object.keys(row.cells)) {
          if (!columnKeys.has(key)) {
            errors.push(
              `file "${file.fileId}" row "${row.rowId}" has cell "${key}" with no matching column`
            );
          }
        }
        for (const col of file.columns) {
          if (!(col.key in row.cells)) {
            errors.push(
              `file "${file.fileId}" row "${row.rowId}" is missing column "${col.key}"`
            );
          }
        }
      }
    } else {
      if (file.sections.length === 0) errors.push(`file "${file.fileId}" has no sections`);
      const seenSectionIds = new Set<string>();
      for (const section of file.sections) {
        if (!section.sectionId) {
          errors.push(`file "${file.fileId}" has a section with no sectionId`);
          continue;
        }
        if (seenSectionIds.has(section.sectionId)) {
          errors.push(`file "${file.fileId}" has duplicate sectionId "${section.sectionId}"`);
        }
        seenSectionIds.add(section.sectionId);
      }
    }
  }

  for (const fileId of Object.keys(bundle.checksums)) {
    if (!seenFileIds.has(fileId)) {
      errors.push(`checksum present for unknown file "${fileId}"`);
    }
  }

  return errors;
}

/* Rendering ----------------------------------------------------------------- */

/** Numeric columns read better right-aligned; this keeps that in one place. */
export function isNumericColumn(column: ResourceColumn): boolean {
  return column.type === "number";
}

/**
 * Renders a tabular file as markdown for surfaces that still expect a string.
 * The records remain the source of truth; this is only a view.
 */
export function renderTableAsMarkdown(file: TabularResourceFile): string {
  const header = `| ${file.columns.map((c) => c.label).join(" | ")} |`;
  const divider = `| ${file.columns
    .map((c) => (isNumericColumn(c) ? "---:" : "---"))
    .join(" | ")} |`;
  const body = file.rows.map(
    (row) => `| ${file.columns.map((c) => String(row.cells[c.key] ?? "")).join(" | ")} |`
  );
  return [header, divider, ...body].join("\n");
}
