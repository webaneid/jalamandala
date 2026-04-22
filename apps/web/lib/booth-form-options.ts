import { createTenantDb } from "@repo/db";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

export type BoothGroupFormOption = {
  id: string;
  name: string;
  slug: string;
};

export type BoothCategoryFormOption = {
  id: string;
  name: string;
  slug: string;
};

export async function getBoothFormOptions() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const [groups, categories] = await Promise.all([
    tenantDb.query.boothGroups.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      where: (table, { eq }) => eq(table.isActive, true),
    }),
    tenantDb.query.boothCategories.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      where: (table, { eq }) => eq(table.isActive, true),
    }),
  ]);

  return {
    boothCategories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    boothGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
    })),
  };
}
