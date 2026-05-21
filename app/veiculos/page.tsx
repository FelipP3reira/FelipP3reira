import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Params = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseIntValue(value: FormDataEntryValue | null, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return parsed;
}

async function criarVeiculo(formData: FormData) {
  "use server";

  const placa = String(formData.get("placa") || "").trim().toUpperCase();
  const modelo = String(formData.get("modelo") || "").trim();
  const cor = String(formData.get("cor") || "").trim();

  try {
    const anoFabricacao = parseIntValue(formData.get("anoFabricacao"), "anoFabricacao");
    const anoModelo = parseIntValue(formData.get("anoModelo"), "anoModelo");

    if (!placa || !modelo || !cor) {
      throw new Error("Preencha todos os campos do veículo.");
    }

    await prisma.veiculo.create({
      data: {
        placa,
        modelo,
        cor,
        anoFabricacao,
        anoModelo,
      },
    });

    revalidatePath("/veiculos");
    redirect("/veiculos?msg=Veículo cadastrado com sucesso");
  } catch {
    redirect("/veiculos?err=Não foi possível cadastrar o veículo");
  }
}

async function atualizarVeiculo(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));
  const placa = String(formData.get("placa") || "").trim().toUpperCase();
  const modelo = String(formData.get("modelo") || "").trim();
  const cor = String(formData.get("cor") || "").trim();

  try {
    const anoFabricacao = parseIntValue(formData.get("anoFabricacao"), "anoFabricacao");
    const anoModelo = parseIntValue(formData.get("anoModelo"), "anoModelo");

    const veiculo = await prisma.veiculo.findUnique({
      where: { id },
      include: { multas: { select: { id: true } } },
    });

    if (!veiculo || veiculo.multas.length > 0) {
      throw new Error("Veículo não pode ser editado.");
    }

    await prisma.veiculo.update({
      where: { id },
      data: {
        placa,
        modelo,
        cor,
        anoFabricacao,
        anoModelo,
      },
    });

    revalidatePath("/veiculos");
    redirect("/veiculos?msg=Veículo atualizado com sucesso");
  } catch {
    redirect("/veiculos?err=Não foi possível atualizar o veículo");
  }
}

async function removerVeiculo(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));

  try {
    const totalMultas = await prisma.multa.count({ where: { veiculoId: id } });

    if (totalMultas > 0) {
      throw new Error("Veículo com multa não pode ser removido.");
    }

    await prisma.veiculo.delete({ where: { id } });

    revalidatePath("/veiculos");
    redirect("/veiculos?msg=Veículo removido com sucesso");
  } catch {
    redirect("/veiculos?err=Não foi possível remover o veículo");
  }
}

export default async function VeiculosPage({ searchParams }: Params) {
  const params = (await searchParams) ?? {};
  const msg = typeof params.msg === "string" ? params.msg : "";
  const err = typeof params.err === "string" ? params.err : "";

  const veiculos = await prisma.veiculo.findMany({
    orderBy: { placa: "asc" },
    include: { multas: { select: { id: true } } },
  });

  return (
    <main className="page">
      <h1>Veículos</h1>
      {msg ? <p className="msg ok">{msg}</p> : null}
      {err ? <p className="msg err">{err}</p> : null}

      <section className="card">
        <h2>Novo veículo</h2>
        <form action={criarVeiculo} className="form-grid">
          <input name="placa" placeholder="Placa" maxLength={10} required />
          <input name="modelo" placeholder="Modelo" required />
          <input name="cor" placeholder="Cor" required />
          <input name="anoFabricacao" type="number" min={0} placeholder="Ano de fabricação" required />
          <input name="anoModelo" type="number" min={0} placeholder="Ano do modelo" required />
          <button type="submit">Cadastrar</button>
        </form>
      </section>

      <section className="card">
        <h2>Lista de veículos</h2>
        <div className="list">
          {veiculos.map((veiculo: {
            id: number;
            placa: string;
            modelo: string;
            cor: string;
            anoFabricacao: number;
            anoModelo: number;
            multas: { id: number }[];
          }) => {
            const bloqueado = veiculo.multas.length > 0;

            return (
              <article className="item" key={veiculo.id}>
                <form action={atualizarVeiculo} className="form-grid">
                  <input type="hidden" name="id" value={veiculo.id} />
                  <input name="placa" defaultValue={veiculo.placa} maxLength={10} required disabled={bloqueado} />
                  <input name="modelo" defaultValue={veiculo.modelo} required disabled={bloqueado} />
                  <input name="cor" defaultValue={veiculo.cor} required disabled={bloqueado} />
                  <input
                    name="anoFabricacao"
                    type="number"
                    min={0}
                    defaultValue={veiculo.anoFabricacao}
                    required
                    disabled={bloqueado}
                  />
                  <input
                    name="anoModelo"
                    type="number"
                    min={0}
                    defaultValue={veiculo.anoModelo}
                    required
                    disabled={bloqueado}
                  />
                  <button type="submit" disabled={bloqueado}>
                    Salvar edição
                  </button>
                </form>

                <form action={removerVeiculo}>
                  <input type="hidden" name="id" value={veiculo.id} />
                  <button type="submit" disabled={bloqueado}>
                    Remover
                  </button>
                </form>

                {bloqueado ? <p className="hint">Este veículo possui multas cadastradas.</p> : null}
              </article>
            );
          })}
          {veiculos.length === 0 ? <p>Nenhum veículo cadastrado.</p> : null}
        </div>
      </section>
    </main>
  );
}
