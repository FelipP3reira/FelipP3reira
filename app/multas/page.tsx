import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

type Params = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 5;

function parseNumber(value: FormDataEntryValue | null, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return parsed;
}

function parseDate(value: FormDataEntryValue | null): Date {
  const date = new Date(String(value || ""));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida");
  }

  return date;
}

async function criarMulta(formData: FormData) {
  "use server";

  try {
    const veiculoId = Number(formData.get("veiculoId"));
    const codigoInfracao = String(formData.get("codigoInfracao") || "").trim();
    const detalhamento = String(formData.get("detalhamento") || "").trim();
    const valor = parseNumber(formData.get("valor"), "valor");
    const dataAplicacao = parseDate(formData.get("dataAplicacao"));

    if (!veiculoId || !codigoInfracao || !detalhamento) {
      throw new Error("Campos obrigatórios ausentes");
    }

    await prisma.multa.create({
      data: {
        veiculoId,
        codigoInfracao,
        detalhamento,
        valor,
        dataAplicacao,
      },
    });

    revalidatePath("/multas");
    redirect("/multas?msg=Multa cadastrada com sucesso");
  } catch {
    redirect("/multas?err=Não foi possível cadastrar a multa");
  }
}

async function atualizarMulta(formData: FormData) {
  "use server";

  try {
    const id = Number(formData.get("id"));
    const codigoInfracao = String(formData.get("codigoInfracao") || "").trim();
    const detalhamento = String(formData.get("detalhamento") || "").trim();
    const valor = parseNumber(formData.get("valor"), "valor");
    const dataAplicacao = parseDate(formData.get("dataAplicacao"));

    const multa = await prisma.multa.findUnique({ where: { id } });

    if (!multa || multa.dataPagamento || multa.valorPago !== null) {
      throw new Error("Multa já paga não pode ser editada");
    }

    await prisma.multa.update({
      where: { id },
      data: {
        codigoInfracao,
        detalhamento,
        valor,
        dataAplicacao,
      },
    });

    revalidatePath("/multas");
    redirect("/multas?msg=Multa atualizada com sucesso");
  } catch {
    redirect("/multas?err=Não foi possível atualizar a multa");
  }
}

async function removerMulta(formData: FormData) {
  "use server";

  try {
    const id = Number(formData.get("id"));

    const multa = await prisma.multa.findUnique({ where: { id } });

    if (!multa || multa.dataPagamento || multa.valorPago !== null) {
      throw new Error("Multa já paga não pode ser removida");
    }

    await prisma.multa.delete({ where: { id } });

    revalidatePath("/multas");
    redirect("/multas?msg=Multa removida com sucesso");
  } catch {
    redirect("/multas?err=Não foi possível remover a multa");
  }
}

async function pagarMulta(formData: FormData) {
  "use server";

  try {
    const id = Number(formData.get("id"));
    const dataPagamento = parseDate(formData.get("dataPagamento"));
    const valorPago = parseNumber(formData.get("valorPago"), "valorPago");

    const multa = await prisma.multa.findUnique({ where: { id } });

    if (!multa || multa.dataPagamento || multa.valorPago !== null) {
      throw new Error("Multa já está paga");
    }

    if (valorPago < multa.valor) {
      throw new Error("Valor pago menor que o valor da multa");
    }

    await prisma.multa.update({
      where: { id },
      data: {
        dataPagamento,
        valorPago,
      },
    });

    revalidatePath("/multas");
    redirect("/multas?msg=Pagamento informado com sucesso");
  } catch {
    redirect("/multas?err=Não foi possível informar o pagamento");
  }
}

export default async function MultasPage({ searchParams }: Params) {
  const params = (await searchParams) ?? {};
  const msg = typeof params.msg === "string" ? params.msg : "";
  const err = typeof params.err === "string" ? params.err : "";
  const parsedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const totalMultas = await prisma.multa.count();
  const totalPages = Math.max(1, Math.ceil(totalMultas / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const [veiculos, multas] = await Promise.all([
    prisma.veiculo.findMany({
      orderBy: { placa: "asc" },
      select: { id: true, placa: true, modelo: true },
    }),
    prisma.multa.findMany({
      include: { veiculo: { select: { placa: true, modelo: true } } },
      orderBy: [{ dataAplicacao: "desc" }, { valor: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <main className="page">
      <h1>Multas</h1>
      {msg ? <p className="msg ok">{msg}</p> : null}
      {err ? <p className="msg err">{err}</p> : null}

      <section className="card">
        <h2>Nova multa</h2>
        <form action={criarMulta} className="form-grid">
          <select name="veiculoId" defaultValue="" required>
            <option value="" disabled>
              Selecione o veículo
            </option>
            {veiculos.map((veiculo: { id: number; placa: string; modelo: string }) => (
              <option key={veiculo.id} value={veiculo.id}>
                {veiculo.placa} - {veiculo.modelo}
              </option>
            ))}
          </select>
          <input name="codigoInfracao" placeholder="Código da infração" required />
          <input name="detalhamento" placeholder="Detalhamento" required />
          <input name="valor" type="number" step="0.01" min={0} placeholder="Valor" required />
          <input name="dataAplicacao" type="date" required />
          <button type="submit" disabled={veiculos.length === 0}>
            Cadastrar
          </button>
        </form>
        {veiculos.length === 0 ? <p className="hint">Cadastre um veículo antes de cadastrar multas.</p> : null}
      </section>

      <section className="card">
        <h2>Lista de multas</h2>
        <div className="list">
          {multas.map((multa: {
            id: number;
            codigoInfracao: string;
            detalhamento: string;
            valor: number;
            dataAplicacao: Date;
            dataPagamento: Date | null;
            valorPago: number | null;
            veiculo: { placa: string; modelo: string };
          }) => {
            const paga = Boolean(multa.dataPagamento || multa.valorPago !== null);

            return (
              <article key={multa.id} className="item">
                <p>
                  <strong>Veículo:</strong> {multa.veiculo.placa} - {multa.veiculo.modelo}
                </p>

                <form action={atualizarMulta} className="form-grid">
                  <input type="hidden" name="id" value={multa.id} />
                  <input name="codigoInfracao" defaultValue={multa.codigoInfracao} required disabled={paga} />
                  <input name="detalhamento" defaultValue={multa.detalhamento} required disabled={paga} />
                  <input
                    name="valor"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={multa.valor}
                    required
                    disabled={paga}
                  />
                  <input
                    name="dataAplicacao"
                    type="date"
                    defaultValue={multa.dataAplicacao.toISOString().slice(0, 10)}
                    required
                    disabled={paga}
                  />
                  <button type="submit" disabled={paga}>
                    Salvar edição
                  </button>
                </form>

                <form action={removerMulta}>
                  <input type="hidden" name="id" value={multa.id} />
                  <button type="submit" disabled={paga}>
                    Remover
                  </button>
                </form>

                {!paga ? (
                  <form action={pagarMulta} className="form-grid payment-form">
                    <input type="hidden" name="id" value={multa.id} />
                    <input name="dataPagamento" type="date" required />
                    <input name="valorPago" type="number" min={multa.valor} step="0.01" placeholder="Valor pago" required />
                    <button type="submit">Informar pagamento</button>
                  </form>
                ) : (
                  <p className="hint">
                    Pago em {multa.dataPagamento?.toISOString().slice(0, 10)} por R$ {multa.valorPago?.toFixed(2)}.
                  </p>
                )}
              </article>
            );
          })}
          {multas.length === 0 ? <p>Nenhuma multa cadastrada.</p> : null}
        </div>
        {totalPages > 1 ? (
          <div className="pagination">
            {currentPage > 1 ? (
              <Link href={`/multas?page=${currentPage - 1}`}>Anterior</Link>
            ) : (
              <span className="disabled">Anterior</span>
            )}
            <span>
              Página {currentPage} de {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link href={`/multas?page=${currentPage + 1}`}>Próxima</Link>
            ) : (
              <span className="disabled">Próxima</span>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
