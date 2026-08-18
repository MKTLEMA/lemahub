# Hub de Demandas de Marketing — LEMA

App interno para cadastrar e monitorar 4 tipos de demanda, com login individual, atualização em tempo real, log de edições e alertas de proximidade.

## Backend (Lovable Cloud)

Ativar Cloud e criar as tabelas conforme o modelo enviado:

- `colaboradores`, `compras_castanhas`, `compras_financeiro`, `eventos`, `evento_participantes`, `evento_materiais`, `historico_edicoes`
- Trigger de auditoria (AFTER INSERT/UPDATE/DELETE) nas 5 tabelas principais, gravando campo alterado, valor anterior/novo, usuário e timestamp em `historico_edicoes`
- RLS: acesso completo para usuários autenticados em todas as tabelas (sem hierarquia de papéis)
- Bucket privado `comprovantes` para as fotos do módulo Financeiro, com upload/visualização só para autenticados
- Realtime habilitado nas 4 tabelas principais

## Autenticação

Login por e-mail/senha, sem cadastro público. Rotas do app protegidas; usuários criados manualmente no painel.

## Módulos

1. **Colaboradores** — cadastro completo (ingresso, aniversário, setor, formato de trabalho, farda etc.)
2. **Compras Castanhas** — solicitante, finalidade, valor, fornecedor, prazo, flags de nota fiscal
3. **Compras Financeiro** — comprovante (foto), valor, comprador, solicitante, data, finalidade, flag de nota
4. **Eventos** — dados do evento + listas de participantes e materiais

Cada módulo: tabela com busca e filtros, drawer de criação/edição, ações por linha (editar, excluir, ver histórico) e exportação CSV.

## Alertas

- Janela de 3 dias (dia/mês, ignorando ano quando aplicável) para aniversários, prazo de entrega de castanhas e início de eventos
- Pendências permanentes das flags de nota fiscal / envio ao financeiro
- Toast-resumo ao abrir o app; item "Central de Alertas" na sidebar com badge numérico e lista agrupada por módulo, ordenada por urgência
- Digest diário por e-mail (~08h) com os itens em janela ou pendentes

## Histórico

Painel global e por registro: usuário, ação, campo, valor anterior/novo, data-hora.

## Design

- Paleta LEMA: navy #0A0828 / azul elétrico #3CB6FF, com temas claro e escuro persistidos; status verde/âmbar/vermelho
- Poppins nos títulos, Inter no corpo, números tabulares em valores e datas
- Elemento-assinatura: "Indicador de Proximidade" — dot com anel pulsante nas 4 tabelas e anel de progresso no ícone Alertas
- Sidebar colapsável com ícones lucide, topbar com busca global, toggle de tema e avatar; Home com KPI cards + widget de alertas
- Animações de entrada fade+slide (150–200ms), hover em botões, pulso no badge de alertas

## Notas técnicas

- Stack fixa do projeto: React + TypeScript + Tailwind + shadcn/ui sobre TanStack Start (router e SSR já configurados). Lógica de servidor via server functions, não Edge Functions.
- Realtime via `postgres_changes` no cliente, invalidando o cache de dados para refletir mudanças de outros usuários sem reload.
- O envio de e-mails usa a infraestrutura de e-mail integrada da Lovable (não é necessário Resend nem chave externa); requer configurar um domínio de e-mail. O disparo diário é agendado no banco chamando uma rota interna do app.
- Upload de comprovantes com URLs assinadas, já que o bucket é privado.
