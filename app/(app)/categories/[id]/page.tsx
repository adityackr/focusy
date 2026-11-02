import type { Metadata } from "next";
import { CategoryView } from "@/features/categories";

export const metadata: Metadata = {
  title: "Category",
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CategoryView categoryId={id} />;
}
