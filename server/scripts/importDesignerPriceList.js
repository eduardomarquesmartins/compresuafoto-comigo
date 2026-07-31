const prisma = require('../lib/prisma');

const packages = [
  [1, 25], [2, 50], [3, 75], [4, 100], [5, 100], [6, 120], [7, 140], [8, 150], [9, 168.75], [10, 187.5],
  [11, 206.25], [12, 200], [13, 227.5], [14, 245], [15, 249.9], [16, 256], [17, 272], [18, 288], [19, 304]
].map(([quantity, value]) => ({ name: `Pacote de ${quantity} ${quantity === 1 ? 'arte' : 'artes'}`, description: 'Artes para redes sociais', value, role: 'DESIGNER' }));

const extras = [
  ['MIV+ Logotipo', 160], ['Tapete', 70], ['Folheto/Cardápio', 80], ['Arte Animada', 40], ['Vetorização Logo', 80], ['Design Foto Perfil', 30],
  ['PDF Apresentação', 100], ['Portfólio', 120], ['Proposta Comercial', 100], ['Crachá', 60], ['Cardápio', 120], ['Arte Impressão 1 Lado', 40],
  ['Arte Impressão 2 Lados', 60], ['Plotagem de Carro', 100], ['Arte Camiseta', 60], ['Fixado', 50], ['Perfurite', 50], ['Capa Destaques', 40],
  ['Capa Facebook', 35], ['Selo', 25], ['Vídeo curto', 60], ['Vídeo longo', 80], ['Arte Agenda', 40], ['Arte Bloco', 40], ['Arte Mousepad', 40],
  ['Arte Encaminhamento', 40], ['Atestado', 50], ['Carimbo', 30], ['PDF IA', 80], ['Logo', 80], ['Cartão de Visita', 60], ['Pasta', 40]
].map(([name, value]) => ({ name, description: 'Serviço extra', value, role: 'DESIGNER' }));

async function run() {
  const designer = await prisma.user.findFirst({ where: { role: 'COLLABORATOR', collaboratorProfile: 'DESIGNER' }, select: { id: true, name: true } });
  if (!designer) throw new Error('Nenhum colaborador com perfil DESIGNER foi encontrado.');
  const existing = await prisma.serviceDefinition.count({ where: { collaboratorId: designer.id } });
  if (existing) throw new Error(`O colaborador ${designer.name || designer.id} já possui ${existing} serviços; importação interrompida para não sobrescrever dados.`);
  await prisma.serviceDefinition.createMany({ data: [...packages, ...extras].map(service => ({ ...service, collaboratorId: designer.id })) });
  console.log(`Importados ${packages.length + extras.length} serviços para ${designer.name || designer.id}.`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
