import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placa = searchParams.get("placa")?.trim().toUpperCase();

  if (!placa) {
    return NextResponse.json({ erro: "Informe a placa pela query string (?placa=ABC1234)." }, { status: 400 });
  }

  const multas = await prisma.multa.findMany({
    where: {
      veiculo: { placa },
      dataPagamento: null,
      valorPago: null,
    },
    select: {
      veiculo: { select: { placa: true, modelo: true } },
      dataAplicacao: true,
      valor: true,
    },
    orderBy: [{ dataAplicacao: "asc" }],
  });

  return NextResponse.json(
    multas.map((multa: { veiculo: { placa: string; modelo: string }; dataAplicacao: Date; valor: number }) => ({
      placa: multa.veiculo.placa,
      modelo: multa.veiculo.modelo,
      dataAplicacao: multa.dataAplicacao,
      valor: multa.valor,
    })),
  );
}
