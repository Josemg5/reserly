"use client";

import dynamic from "next/dynamic";
import { use } from "react";

const BookingForm = dynamic(() => import("@/components/BookingForm"), { ssr: false });

type PageProps = {
    params: Promise<{ slug: string }>;
};

export default function ReservarPage({ params }: PageProps) {
    const { slug } = use(params);
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-center items-center p-4 selection:bg-amber-500/30 w-full">
            <BookingForm slug={slug} />
        </div>
    );
}
