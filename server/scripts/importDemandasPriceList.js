const prisma = require('../lib/prisma');

const services = [
  ['Gestão do Trello', 200], ['Edição e tratamento de fotos', 150], ['Revisão e conferência final das postagens', 100], ['Organização do feed dos clientes', 120],
  ['Ajuste de cards', 110], ['Criação de cards', 150], ['Edição simples de vídeos', 150], ['Criação de legendas e copys', 90], ['Revisão final de textos e legendas', 50],
  ['Atendimento via WhatsApp', 120], ['Encaminhamento de demandas e comunicação interna', 100], ['Solicitação de materiais aos clientes', 50],
  ['Preparação do mês seguinte e datas comemorativas', 110], ['Conferência da pesquisa mensal', 50], ['Conferência da programação da semana', 50],
  ['Suporte em tráfego pago', 100], ['Suporte em Google / Google Meu Negócio', 100]
].map(([name, value]) => ({ name, value, role: 'DEMANDAS', description: 'Valor de referência do checklist mensal' }));

async function run() {
  const collaborator = await prisma.user.findFirst({ where: { role: 'COLLABORATOR', collaboratorProfile: 'COMPANY_DEMANDS' }, select: { id: true, name: true } });
  if (!collaborator) throw new Error('Nenhum colaborador de Demandas encontrado.');
  const existing = await prisma.serviceDefinition.count({ where: { collaboratorId: collaborator.id } });
  if (existing) throw new Error(`O colaborador ${collaborator.name || collaborator.id} já possui ${existing} serviços; importação interrompida para não sobrescrever dados.`);
  await prisma.serviceDefinition.createMany({ data: services.map(service => ({ ...service, collaboratorId: collaborator.id })) });
  console.log(`Importados ${services.length} serviços para ${collaborator.name || collaborator.id}.`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
