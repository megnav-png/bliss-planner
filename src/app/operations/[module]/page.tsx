import ModuleDetailPage from "@/components/operations/ModuleDetailPage";

export default async function OperationsModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModuleDetailPage module={module} />;
}
