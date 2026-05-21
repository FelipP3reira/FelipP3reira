# Sistema de Multas Veiculares

Aplicação Next.js para cadastro de veículos, multas e consulta de devedores.

## Requisitos

- Node.js 20+
- npm

## Configuração

1. Instale dependências:

```bash
npm install
```

2. Execute migrações e gere o client do Prisma:

```bash
npx prisma migrate dev
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

## Rotas web

- `/` → tela inicial (nome e prontuário)
- `/veiculos` → CRUD de veículos
- `/multas` → CRUD de multas e pagamento

## Endpoints de API

- `GET /multasporveiculo?placa=AAA0000`
  - Retorna multas não pagas daquele veículo, ordenadas por data de aplicação crescente
- `GET /veiculosdevedores`
  - Retorna veículos com multas pendentes, ordenados por valor total devido (desc) e placa (asc)
