export const dynamic = 'force-dynamic';
export const revalidate = 0;

import BookingForm from "@/components/BookingForm";

type PageProps = {
    params: Promise<{ slug: string }>;
};

export default async function ReservarPage({ params }: PageProps) {
    const { slug } = await params;
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-center items-center p-4 selection:bg-amber-500/30 w-full">
            <BookingForm slug={slug} />
        </div>
    );
}
