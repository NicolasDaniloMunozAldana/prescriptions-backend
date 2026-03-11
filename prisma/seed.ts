import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as pg from "pg";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Crea o actualiza un usuario y garantiza que su perfil doctor/patient exista. */
async function upsertUser(data: {
    email: string;
    name: string;
    password: string;
    role: 'admin' | 'doctor' | 'patient';
    specialty?: string;
    birthDate?: Date;
}) {
    const hashed = bcrypt.hashSync(data.password, 10);

    const user = await prisma.user.upsert({
        where: { email: data.email },
        update: {},
        create: {
            email: data.email,
            name: data.name,
            password: hashed,
            role: data.role,
            ...(data.role === 'doctor'
                ? { doctor: { create: { specialty: data.specialty ?? null } } }
                : {}),
            ...(data.role === 'patient'
                ? { patient: { create: { birthDate: data.birthDate ?? null } } }
                : {}),
        },
    });

    // Garantizar perfil vinculado aunque el usuario ya existiera sin él
    if (data.role === 'doctor') {
        await prisma.doctor.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, specialty: data.specialty ?? null },
        });
    }
    if (data.role === 'patient') {
        await prisma.patient.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, birthDate: data.birthDate ?? null },
        });
    }

    return user;
}

/** Crea una prescripción si el código aún no existe. */
async function upsertPrescription(data: Parameters<typeof prisma.prescription.create>[0]['data']) {
    return prisma.prescription.upsert({
        where: { code: data.code as string },
        update: {},
        create: data,
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Seeding database...');

    // ── Cuentas de prueba requeridas por la especificación ───────────────────
    console.log('  → Creating required test accounts...');

    await upsertUser({
        email: 'admin@test.com',
        name: 'Admin',
        password: 'admin123',
        role: 'admin',
    });

    const drUser = await upsertUser({
        email: 'dr@test.com',
        name: 'Dr. Test',
        password: 'dr123',
        role: 'doctor',
        specialty: 'Medicina General',
    });

    const patientUser = await upsertUser({
        email: 'patient@test.com',
        name: 'Patient Test',
        password: 'patient123',
        role: 'patient',
        birthDate: new Date('1990-01-15'),
    });

    // Recuperar perfiles para asociar prescripciones
    const drProfile = await prisma.doctor.findUniqueOrThrow({ where: { userId: drUser.id } });
    const patientProfile = await prisma.patient.findUniqueOrThrow({ where: { userId: patientUser.id } });

    // ── Cuentas adicionales con datos ricos ──────────────────────────────────
    console.log('  → Creating additional accounts...');

    const neurologistUser = await upsertUser({
        email: 'hector.navas@clinicflow.io',
        name: 'Hector Navas',
        password: 'hectorNavas!26',
        role: 'doctor',
        specialty: 'Neurologia',
    });

    const endocrinologistUser = await upsertUser({
        email: 'sofia.vargas@clinicflow.io',
        name: 'Sofia Vargas',
        password: 'sofiaVargas!26',
        role: 'doctor',
        specialty: 'Endocrinologia',
    });

    const patientElenaUser = await upsertUser({
        email: 'elena.mora@patients.io',
        name: 'Elena Mora',
        password: 'elenaMora!26',
        role: 'patient',
        birthDate: new Date('1992-03-21'),
    });

    const patientMateoUser = await upsertUser({
        email: 'mateo.ruiz@patients.io',
        name: 'Mateo Ruiz',
        password: 'mateoRuiz!26',
        role: 'patient',
        birthDate: new Date('1978-11-02'),
    });

    const doctorNeuro = await prisma.doctor.findUniqueOrThrow({ where: { userId: neurologistUser.id } });
    const doctorEndo = await prisma.doctor.findUniqueOrThrow({ where: { userId: endocrinologistUser.id } });
    const patientElena = await prisma.patient.findUniqueOrThrow({ where: { userId: patientElenaUser.id } });
    const patientMateo = await prisma.patient.findUniqueOrThrow({ where: { userId: patientMateoUser.id } });

    // ── Prescripciones de cuentas de prueba requeridas (para que el revisor ──
    // ── pueda probar el flujo completo sin datos adicionales)              ────
    console.log('  → Creating prescriptions for test accounts...');

    await upsertPrescription({
        code: 'TST-2026-001',
        status: 'pending',
        notes: 'Prescripcion de prueba para verificar flujo completo',
        patientId: patientProfile.id,
        authorId: drProfile.id,
        items: {
            create: [
                {
                    name: 'Amoxicilina 500mg',
                    dosage: '1 cada 8h',
                    quantity: 21,
                    instructions: 'Tomar después de comer',
                },
                {
                    name: 'Ibuprofeno 400mg',
                    dosage: '1 cada 12h',
                    quantity: 10,
                    instructions: 'Solo si hay fiebre o dolor',
                },
            ],
        },
    });

    await upsertPrescription({
        code: 'TST-2026-002',
        status: 'consumed',
        notes: 'Prescripcion consumida de prueba',
        consumedAt: new Date('2026-02-20T09:00:00Z'),
        patientId: patientProfile.id,
        authorId: drProfile.id,
        items: {
            create: [
                {
                    name: 'Paracetamol 1g',
                    dosage: '1 cada 8h',
                    quantity: 15,
                    instructions: 'Máximo 3 días',
                },
            ],
        },
    });

    // ── Prescripciones con datos ricos ───────────────────────────────────────
    console.log('  → Creating rich prescription data...');

    await upsertPrescription({
        code: 'CLN-2026-NEU-118',
        status: 'pending',
        notes: 'Plan inicial para cefalea cronica',
        patientId: patientElena.id,
        authorId: doctorNeuro.id,
        items: {
            create: [
                { name: 'Topiramato', dosage: '25mg', quantity: 30, instructions: '1 tableta nocturna durante 2 semanas' },
                { name: 'Riboflavina', dosage: '400mg', quantity: 30, instructions: '1 capsula diaria por 30 dias' },
            ],
        },
    });

    await upsertPrescription({
        code: 'CLN-2026-NEU-121',
        status: 'consumed',
        notes: 'Ajuste terapeutico posterior a crisis aguda',
        consumedAt: new Date('2026-02-14T10:30:00Z'),
        patientId: patientElena.id,
        authorId: doctorNeuro.id,
        items: {
            create: [
                { name: 'Eletriptan', dosage: '40mg', quantity: 6, instructions: 'Al inicio del episodio, maximo 2 en 24 horas' },
            ],
        },
    });

    await upsertPrescription({
        code: 'CLN-2026-END-305',
        status: 'pending',
        notes: 'Control glucemico trimestral y metas de HbA1c',
        patientId: patientMateo.id,
        authorId: doctorEndo.id,
        items: {
            create: [
                { name: 'Empagliflozina', dosage: '10mg', quantity: 30, instructions: '1 tableta en la manana' },
                { name: 'Sitagliptina', dosage: '100mg', quantity: 30, instructions: '1 tableta junto con el desayuno' },
            ],
        },
    });

    await upsertPrescription({
        code: 'CLN-2026-END-311',
        status: 'consumed',
        notes: 'Esquema de 4 semanas para correccion lipidica',
        consumedAt: new Date('2026-01-28T08:00:00Z'),
        patientId: patientMateo.id,
        authorId: doctorEndo.id,
        items: {
            create: [
                { name: 'Rosuvastatina', dosage: '20mg', quantity: 30, instructions: '1 tableta por la noche' },
            ],
        },
    });

    await upsertPrescription({
        code: 'CLN-2026-GEN-442',
        status: 'pending',
        notes: 'Proteccion gastrica por antecedente de dolor epigastrico',
        patientId: patientMateo.id,
        authorId: doctorNeuro.id,
        items: {
            create: [
                { name: 'Pantoprazol', dosage: '40mg', quantity: 28, instructions: '1 tableta antes del desayuno' },
                { name: 'Sucralfato', dosage: '1g', quantity: 28, instructions: '1 sobre cada 12 horas por 14 dias' },
            ],
        },
    });

    await upsertPrescription({
        code: 'CLN-2026-END-333',
        status: 'pending',
        notes: 'Suplementacion y seguimiento tiroideo mensual',
        patientId: patientElena.id,
        authorId: doctorEndo.id,
        items: {
            create: [
                { name: 'Levotiroxina', dosage: '75mcg', quantity: 30, instructions: '1 tableta en ayunas, esperar 30 minutos' },
                { name: 'Vitamina D3', dosage: '2000UI', quantity: 60, instructions: '2 gotas al dia despues de la comida principal' },
            ],
        },
    });

    console.log('✅ Seed completed successfully.');
    console.log('');
    console.log('   Test accounts:');
    console.log('   admin@test.com    / admin123');
    console.log('   dr@test.com       / dr123');
    console.log('   patient@test.com  / patient123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });