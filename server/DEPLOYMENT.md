# Deploy de migrations

`npm start` executa `prisma migrate deploy`, que é não destrutivo, antes de iniciar a API.
Execute `npx prisma migrate status` com a `DATABASE_URL` remota no pipeline antes do deploy.

## Bloqueio conhecido da cadeia histórica

O migration inicial versionado não cria `Client`, `Proposal` e `Contract`, embora migrations posteriores dependam dessas tabelas. Não altere migrations históricos já aplicados: isso causaria checksum mismatch. Até que o banco remoto tenha sido auditado e uma estratégia de baseline seja aprovada, o deploy em banco novo permanece bloqueado. Bancos existentes devem confirmar as tabelas e o histórico com `prisma migrate status` antes de aplicar migrations novas. Na auditoria atual, o remoto também contém `20260730193000_add_collaborator_payments_foundation` e `20260731100000_harden_collaborator_payment_domain`, ausentes deste repositório; isso bloqueia `migrate deploy` até reconciliação explícita.

Uma comparação direta (`prisma migrate diff --from-url ... --to-schema-datamodel ...`) confirmou drift adicional: o remoto contém `AuditEvent`, `CompanyChecklist`, `CompanyChecklistItem`, `DesignerClosing`, `DesignerClosingExtra`, `DesignerClosingItem`, `Payable`, `PriceCatalogItem`, `PriceCatalogItemTier` e `PriceCatalogVersion`, além de enums e relações correspondentes. O schema local não os declara; aplicar o diff gerado apagaria essas estruturas. Não aplicar esse diff.

O banco remoto não armazena o SQL das migrations, apenas nome, checksum e status em `_prisma_migrations`. Portanto, os arquivos ausentes só podem ser restaurados a partir do repositório/backup original. Recriar SQL semanticamente equivalente não preserva o checksum e não reconcilia o histórico do Prisma.

Contratos legados sem `proposalId` continuam deliberadamente desvinculados e podem seguir o fluxo manual. Contratos vinculados a propostas não podem ser excluídos pela API para preservar auditoria.

## Estado após ajuste manual de tokens

Em 2026-09-02, o SQL aditivo equivalente à migration `20260901130000_link_proposals_contracts` foi executado manualmente no projeto Supabase de produção, sem exclusão de dados. Verificação: 68 propostas, 68 tokens presentes, 68 tokens distintos, comprimento mínimo de 64 caracteres; índices `Proposal_publicToken_key` e `Contract_proposalId_key` e a FK `Contract_proposalId_fkey` presentes.

Essa execução habilita os links públicos, mas não resolve automaticamente os dois registros históricos de migrations ausentes no checkout. Não execute novamente a migration `20260901130000_link_proposals_contracts`; antes de usar `prisma migrate deploy`, faça a reconciliação/baseline documentada em `prisma/BASELINE_RECONCILIATION.md`.
