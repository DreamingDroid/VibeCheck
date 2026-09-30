import { redirect } from "next/navigation";

export default function ShortOrganizerRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/organizer/${params.id}`);
}
