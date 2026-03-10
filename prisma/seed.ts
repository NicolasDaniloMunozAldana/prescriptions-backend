import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as pg from "pg";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {

    if (process.env.RUN_SEED !== 'true') {
        console.log('Seed skipped');
        return;
    }

    await prisma.user.create({
        data: {
            email: 'ops.root@clinicflow.io',
            name: 'Marina Salas',
            password: bcrypt.hashSync('rootSecure2026!', 10),
            role: 'admin',
        },
    });

    const neurologistUser = await prisma.user.create({
        data: {
            email: 'hector.navas@clinicflow.io',
            name: 'Hector Navas',
            password: bcrypt.hashSync('hectorNavas!26', 10),
            role: 'doctor',
            doctor: {
                create: { specialty: 'Neurologia' }
            },
        },
        include: { doctor: true },
    });

    const endocrinologistUser = await prisma.user.create({
        data: {
            email: 'sofia.vargas@clinicflow.io',
            name: 'Sofia Vargas',
            password: bcrypt.hashSync('sofiaVargas!26', 10),
            role: 'doctor',
            doctor: {
                create: { specialty: 'Endocrinologia' }
            },
        },
        include: { doctor: true },
    });

    const patientElena = await prisma.user.create({
        data: {
            email: 'elena.mora@patients.io',
            name: 'Elena Mora',
            password: bcrypt.hashSync('elenaMora!26', 10),
            role: 'patient',
            patient: {
                create: { birthDate: new Date('1992-03-21') }
            },
        },
        include: {
            patient: true,
        },
    });

    const patientMateo = await prisma.user.create({
        data: {
            email: 'mateo.ruiz@patients.io',
            name: 'Mateo Ruiz',
            password: bcrypt.hashSync('mateoRuiz!26', 10),
            role: 'patient',
            patient: {
                create: { birthDate: new Date('1978-11-02') }
            },
        },
        include: {
            patient: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-NEU-118',
            status: 'pending',
            notes: 'Plan inicial para cefalea cronica',
            patientId: patientElena.patient!.id,
            authorId: neurologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Topiramato',
                        dosage: '25mg',
                        quantity: 30,
                        instructions: '1 tableta nocturna durante 2 semanas',
                    },
                    {
                        name: 'Riboflavina',
                        dosage: '400mg',
                        quantity: 30,
                        instructions: '1 capsula diaria por 30 dias',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-NEU-121',
            status: 'consumed',
            notes: 'Ajuste terapeutico posterior a crisis aguda',
            consumedAt: new Date('2026-02-14T10:30:00Z'),
            patientId: patientElena.patient!.id,
            authorId: neurologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Eletriptan',
                        dosage: '40mg',
                        quantity: 6,
                        instructions: 'Al inicio del episodio, maximo 2 en 24 horas',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-END-305',
            status: 'pending',
            notes: 'Control glucemico trimestral y metas de HbA1c',
            patientId: patientMateo.patient!.id,
            authorId: endocrinologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Empagliflozina',
                        dosage: '10mg',
                        quantity: 30,
                        instructions: '1 tableta en la manana',
                    },
                    {
                        name: 'Sitagliptina',
                        dosage: '100mg',
                        quantity: 30,
                        instructions: '1 tableta junto con el desayuno',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-END-311',
            status: 'consumed',
            notes: 'Esquema de 4 semanas para correccion lipidica',
            consumedAt: new Date('2026-01-28T08:00:00Z'),
            patientId: patientMateo.patient!.id,
            authorId: endocrinologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Rosuvastatina',
                        dosage: '20mg',
                        quantity: 30,
                        instructions: '1 tableta por la noche',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-GEN-442',
            status: 'pending',
            notes: 'Proteccion gastrica por antecedente de dolor epigastrico',
            patientId: patientMateo.patient!.id,
            authorId: neurologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Pantoprazol',
                        dosage: '40mg',
                        quantity: 28,
                        instructions: '1 tableta antes del desayuno',
                    },
                    {
                        name: 'Sucralfato',
                        dosage: '1g',
                        quantity: 28,
                        instructions: '1 sobre cada 12 horas por 14 dias',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.prescription.create({
        data: {
            code: 'CLN-2026-END-333',
            status: 'pending',
            notes: 'Suplementacion y seguimiento tiroideo mensual',
            patientId: patientElena.patient!.id,
            authorId: endocrinologistUser.doctor!.id,
            items: {
                create: [
                    {
                        name: 'Levotiroxina',
                        dosage: '75mcg',
                        quantity: 30,
                        instructions: '1 tableta en ayunas, esperar 30 minutos',
                    },
                    {
                        name: 'Vitamina D3',
                        dosage: '2000UI',
                        quantity: 60,
                        instructions: '2 gotas al dia despues de la comida principal',
                    },
                ],
            },
        },
        include: {
            items: true,
        },
    });
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });