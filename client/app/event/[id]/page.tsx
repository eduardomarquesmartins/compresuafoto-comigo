import { redirect } from "next/navigation";

export default function LegacyEventPage({
    params,
}: {
    params: { id: string };
}) {
    const { id } = params;
    redirect(`/events/${id}`);
}
