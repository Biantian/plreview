import { NextResponse } from "next/server";

import { getReviewListItems } from "@/lib/review-jobs";

export async function GET() {
  const reviews = await getReviewListItems();

  return NextResponse.json({
    reviews,
  });
}
