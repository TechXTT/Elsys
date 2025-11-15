import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


async function run() {
    console.log('[drop-json] starting');
    const deleteResult = await prisma.page.deleteMany({
        
    });
    console.log(`[drop-json] deleted ${deleteResult.count} pages`);
    console.log('[drop-json] done');
}

await run();