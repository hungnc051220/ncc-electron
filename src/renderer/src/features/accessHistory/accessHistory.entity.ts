export const getAuditEntityReferenceKey = (
  model: string | null | undefined,
  entityId: string | number | null | undefined
) => {
  const normalizedModel = model?.trim().toLocaleLowerCase();
  const normalizedId = String(entityId ?? "").trim();

  return normalizedModel && normalizedId ? `${normalizedModel}:${normalizedId}` : null;
};
