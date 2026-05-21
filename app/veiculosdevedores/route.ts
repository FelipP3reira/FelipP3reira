import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const veiculos = await prisma.veiculo.findMany({
    where: {
      multas: {
        some: {
          dataPagamento: null,
          valorPago: null,
        },
      },
    },
    select: {
      placa: true,
      modelo: true,
      multas: {
        where: {
          dataPagamento: null,
          valorPago: null,
        },
        select: {
          valor: true,
        },
      },
    },
  });

  const devedores = veiculos
    .map((veiculo: { placa: string; modelo: string; multas: { valor: number }[] }) => {
      const totalMultasNaoPagas = veiculo.multas.length;
      const valorTotalMultas = veiculo.multas.reduce((acc: number, multa: { valor: number }) => acc + multa.valor, 0);

      return {
        placa: veiculo.placa,
        modelo: veiculo.modelo,
        totalMultasNaoPagas,
        valorTotalMultas,
      };
    })
    .sort((a: { valorTotalMultas: number; placa: string }, b: { valorTotalMultas: number; placa: string }) => {
      if (b.valorTotalMultas !== a.valorTotalMultas) {
        return b.valorTotalMultas - a.valorTotalMultas;
      }

      return a.placa.localeCompare(b.placa);
    });

  return NextResponse.json(devedores);
}
