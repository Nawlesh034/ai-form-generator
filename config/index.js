import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema'

// console.log('Database URL:', process.env.NEXT_DRIZZLE_DATABASE_URL);
const databaseUrl= process.env.NEXT_PUBLIC_DRIZZLE_DATABASE_URL;
if(!databaseUrl){
    throw new Error(
        "Database url not set"
    )
}
const sql = neon(databaseUrl);
export const db = drizzle(sql,{schema});


