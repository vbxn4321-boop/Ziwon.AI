import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const program = await prisma.supportProgram.findUnique({
      where: { id },
      include: {
        sources: true,
        documents: {
          include: {
            chunks: true,
          },
        },
        analyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { success: false, error: "Support program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: program,
    });
  } catch (error) {
    console.error("API /api/support-programs/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch support program details" },
      { status: 500 }
    );
  }
}
